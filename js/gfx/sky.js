// Sky, sun, moon, clouds, stars, rain, fog and image-based ambient light.
// The sun follows the real solar path for Panvel (19.0°N) on today's date.

import * as THREE from 'three';
import { Sky } from '../../vendor/addons/objects/Sky.js';
import { clamp, lerp, smooth, panvelNow } from '../util.js';

const LAT = (18.99 * Math.PI) / 180;
const DEG = Math.PI / 180;

/** Sun elevation and azimuth (radians; azimuth clockwise from north) at local solar time. */
function solar(hour, dayOfYear) {
  const decl = -23.44 * DEG * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
  // IST runs ~38 min ahead of local solar time at Panvel's longitude.
  const H = (hour - 0.63 - 12) * 15 * DEG;
  const sinEl = Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(H);
  const el = Math.asin(clamp(sinEl, -1, 1));
  let az = Math.atan2(-Math.sin(H), Math.tan(decl) * Math.cos(LAT) - Math.sin(LAT) * Math.cos(H));
  if (az < 0) az += Math.PI * 2;
  return { el, az };
}

const CLOUD_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }`;
const CLOUD_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform float uTime, uCover, uDark, uNight;
  uniform vec3 uSun, uSunCol, uSkyCol;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
    return v;
  }
  void main() {
    vec3 d = normalize(vDir);
    if (d.y < 0.01) discard;
    vec2 uv = d.xz / (d.y + 0.12) * 1.1;
    uv += vec2(uTime * 0.006, uTime * 0.0025);
    float n = fbm(uv * 1.3) * 0.65 + fbm(uv * 3.1 + 5.0) * 0.35;
    float dens = smoothstep(1.0 - uCover, 1.0 - uCover + 0.32, n);
    // thicker cloud is darker underneath; edges catch the sun
    float thick = smoothstep(1.0 - uCover + 0.1, 1.0 - uCover + 0.6, n);
    float sunAmt = pow(max(dot(d, normalize(uSun)), 0.0), 6.0);
    vec3 lit = mix(vec3(1.0), uSunCol, 0.45) * (1.05 + sunAmt * 0.9);
    vec3 shade = mix(uSkyCol * 0.9 + 0.12, vec3(0.34, 0.36, 0.4), uDark);
    vec3 col = mix(lit, shade, thick * (0.55 + uDark * 0.4));
    col *= mix(1.0, 0.07, uNight);
    float horizon = smoothstep(0.01, 0.16, d.y);
    gl_FragColor = vec4(col, dens * horizon * 0.96);
  }`;

export class Atmosphere {
  constructor(scene, renderer, lib, tier) {
    this.scene = scene;
    this.renderer = renderer;
    this.lib = lib;
    this.tier = tier;
    const now = panvelNow();
    this.hour = now.hour;
    this.locked = null; // null = follow the real clock
    this.day = Math.floor((now.date - new Date(now.date.getFullYear(), 0, 0)) / 864e5);
    // June to September is the monsoon.
    this.monsoon = now.month >= 5 && now.month <= 8;
    this.rainTarget = this.monsoon ? 1 : 0;
    this.rain = this.rainTarget;
    this.night = 0;
    this.time = 0;

    this.sky = new Sky();
    const DOME = tier.far * 0.86;
    this.sky.scale.setScalar(DOME * 1.1);
    this.sky.material.depthTest = false;
    this.sky.renderOrder = -20;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // Night dome: deep blue gradient that fades in after sunset.
    this.nightDome = new THREE.Mesh(
      new THREE.SphereGeometry(DOME, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthTest: false, depthWrite: false, transparent: false, fog: false,
        blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        uniforms: { uA: { value: 0 } },
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `varying vec3 vP; uniform float uA;
          void main(){ float h = clamp(normalize(vP).y, 0.0, 1.0);
            vec3 c = mix(vec3(0.10,0.13,0.22), vec3(0.012,0.018,0.05), pow(h, 0.55));
            c += vec3(0.16,0.10,0.05) * pow(1.0 - h, 6.0); // town glow on the horizon
            gl_FragColor = vec4(c, uA); }`,
      }),
    );
    this.nightDome.renderOrder = -19;
    this.nightDome.frustumCulled = false;
    scene.add(this.nightDome);

    // Stars
    const sp = new Float32Array(1400 * 3);
    for (let i = 0; i < 1400; i++) {
      const u = Math.random() * 2 - 1, t = Math.random() * 6.283, r = Math.sqrt(1 - u * u);
      sp[i * 3] = r * Math.cos(t) * DOME * 0.95;
      sp[i * 3 + 1] = Math.abs(u) * DOME * 0.95;
      sp[i * 3 + 2] = r * Math.sin(t) * DOME * 0.95;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: false, blending: THREE.AdditiveBlending, opacity: 0, depthTest: false, depthWrite: false, fog: false }));
    this.stars.renderOrder = -18;
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // Moon
    this.dome = DOME;
    this.moon = new THREE.Mesh(new THREE.CircleGeometry(DOME * 0.024, 24), new THREE.MeshBasicMaterial({ color: 0xfff6dc, transparent: false, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, opacity: 0, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
    this.moon.renderOrder = -17;
    this.moon.frustumCulled = false;
    scene.add(this.moon);

    // Clouds
    this.cloudMat = new THREE.ShaderMaterial({
      vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false, depthTest: true, side: THREE.BackSide, fog: false,
      uniforms: {
        uTime: { value: 0 }, uCover: { value: 0.4 }, uDark: { value: 0 }, uNight: { value: 0 },
        uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 1, 1) }, uSkyCol: { value: new THREE.Color(0.5, 0.6, 0.8) },
      },
    });
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(DOME * 0.9, 32, 16), this.cloudMat);
    this.clouds.renderOrder = -16;
    this.clouds.frustumCulled = false;
    scene.add(this.clouds);

    // Lights
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    const sc = this.sun.shadow;
    sc.mapSize.setScalar(tier.shadow);
    const R = tier.shadowRange;
    Object.assign(sc.camera, { left: -R, right: R, top: R, bottom: -R, near: 10, far: 700 });
    sc.bias = -0.00025;
    sc.normalBias = 0.35;
    sc.radius = 2.2;
    scene.add(this.sun, this.sun.target);
    this.fill = new THREE.HemisphereLight(0xbfd4ff, 0x6b5a48, 0.3);
    scene.add(this.fill);

    scene.fog = new THREE.Fog(0xc8d4e0, 120, tier.far * 0.72);
    this.fogColor = new THREE.Color();
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.lightDir = new THREE.Vector3(0, 1, 0);

    // Image-based ambient from the sky itself.
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envSky = new Sky();
    this.envSky.scale.setScalar(1000);
    this.envScene.add(this.envSky);
    this.envTarget = null;
    this._envKey = '';

    // Rain
    const N = tier.name === 'low' ? 900 : 2600;
    this.rainN = N;
    this.rainPos = new Float32Array(N * 6);
    this.rainSeed = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.rainSeed[i * 3] = Math.random() * 60 - 30;
      this.rainSeed[i * 3 + 1] = Math.random() * 30;
      this.rainSeed[i * 3 + 2] = Math.random() * 60 - 30;
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rainMesh = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xcfdcea, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.rainMesh.frustumCulled = false;
    this.rainMesh.renderOrder = 10;
    scene.add(this.rainMesh);

    this._c1 = new THREE.Color();
    this._c2 = new THREE.Color();
    this.update(0, new THREE.Vector3(), new THREE.Vector3());
  }

  setTime(h) {
    this.locked = h;
  }
  setRain(on) {
    this.rainTarget = on ? 1 : 0;
  }
  get raining() {
    return this.rainTarget > 0.5;
  }

  update(dt, camPos, focus) {
    this.time += dt;
    this.hour = this.locked ?? panvelNow().hour;
    this.rain = lerp(this.rain, this.rainTarget, 1 - Math.exp(-dt * 0.8));
    const wet = this.rain;

    const { el, az } = solar(this.hour, this.day);
    const elDeg = el / DEG;
    this.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    const day = smooth(-4, 8, elDeg); // 0 at night, 1 in full daylight
    const night = 1 - smooth(-9, 2, elDeg);
    const golden = smooth(22, 2, elDeg) * smooth(-6, 2, elDeg);
    this.night = night;

    // Sky shader
    const u = this.sky.material.uniforms;
    u.turbidity.value = lerp(5.5, 14, wet);
    u.rayleigh.value = lerp(lerp(1.5, 3.2, golden), 0.6, wet);
    u.mieCoefficient.value = lerp(0.006, 0.02, wet);
    u.mieDirectionalG.value = 0.82;
    u.sunPosition.value.copy(this.sunDir);

    // Sun / moon light
    const sunCol = this._c1.setRGB(1, lerp(0.98, 0.62, golden), lerp(0.93, 0.36, golden));
    if (day > 0.02) {
      this.lightDir.copy(this.sunDir);
      if (this.lightDir.y < 0.08) this.lightDir.y = 0.08;
      this.lightDir.normalize();
      this.sun.color.copy(sunCol);
      this.sun.intensity = lerp(0.2, 4.4, day) * lerp(1, 0.22, wet);
    } else {
      // moonlight from the opposite side of the sky
      this.lightDir.set(-this.sunDir.x * 0.6, 0.75, -this.sunDir.z * 0.6 + 0.3).normalize();
      this.sun.color.setRGB(0.55, 0.68, 1);
      this.sun.intensity = 0.32 * lerp(1, 0.4, wet);
    }
    const R = this.tier.shadowRange;
    // snap the shadow frustum to texels so shadows do not shimmer as you walk
    const texel = (R * 2) / this.tier.shadow;
    const fx = Math.round(focus.x / texel) * texel, fz = Math.round(focus.z / texel) * texel;
    this.sun.target.position.set(fx, 0, fz);
    this.sun.position.set(fx, 0, fz).addScaledVector(this.lightDir, 320);

    this.fill.intensity = lerp(0.42, 0.5, day) + wet * 0.25 * day;
    this.fill.color.setRGB(lerp(0.32, 0.75, day), lerp(0.42, 0.83, day), lerp(0.75, 1, day));
    this.fill.groundColor.setRGB(lerp(0.1, 0.42, day), lerp(0.1, 0.35, day), lerp(0.14, 0.28, day));

    // Fog and horizon colour
    const fc = this.fogColor;
    fc.setRGB(0.66, 0.75, 0.86); // day haze
    fc.lerp(this._c2.setRGB(0.93, 0.6, 0.4), golden * 0.75);
    fc.lerp(this._c2.setRGB(0.6, 0.63, 0.66), wet * 0.9 * day);
    fc.lerp(this._c2.setRGB(0.045, 0.06, 0.11), night);
    this.scene.fog.color.copy(fc);
    this.scene.fog.near = lerp(160, 30, wet);
    this.scene.fog.far = lerp(this.tier.far * 0.9, 440, wet);

    // Domes follow the camera
    for (const o of [this.sky, this.nightDome, this.stars, this.clouds]) o.position.copy(camPos);
    this.nightDome.material.uniforms.uA.value = night * 0.97;
    this.stars.material.opacity = night * (1 - wet) * 0.9;
    this.moon.position.copy(camPos).addScaledVector(this.lightDir, this.dome * 0.9);
    this.moon.lookAt(camPos);
    this.moon.material.opacity = night * (1 - wet * 0.8);

    const cu = this.cloudMat.uniforms;
    cu.uTime.value = this.time;
    cu.uCover.value = lerp(0.5, 0.98, wet);
    cu.uDark.value = wet;
    cu.uNight.value = night;
    cu.uSun.value.copy(this.sunDir);
    cu.uSunCol.value.copy(sunCol);
    cu.uSkyCol.value.setRGB(0.52, 0.64, 0.82).lerp(this._c2.setRGB(0.9, 0.6, 0.45), golden * 0.6);

    this.renderer.toneMappingExposure = lerp(0.6, 0.86, night) * lerp(1, 1.12, wet);
    this.lib.setConditions(night, wet);
    this._updateEnv(elDeg, wet, night);
    this._updateRain(dt, camPos, wet);
  }

  _updateEnv(elDeg, wet, night) {
    const key = `${Math.round(elDeg / 1.5)}|${Math.round(wet * 8)}`;
    if (key !== this._envKey) {
      this._envKey = key;
      const eu = this.envSky.material.uniforms, u = this.sky.material.uniforms;
      for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) eu[k].value = u[k].value;
      eu.sunPosition.value.copy(this.sunDir);
      const old = this.envTarget;
      this.envTarget = this.pmrem.fromScene(this.envScene, 0, 1, 2000);
      this.scene.environment = this.envTarget.texture;
      if (old) old.dispose();
    }
    this.scene.environmentIntensity = lerp(0.95, 0.55, wet) * (1 - night) + night * 0.05;
  }

  _updateRain(dt, cam, wet) {
    const mat = this.rainMesh.material;
    mat.opacity = wet * 0.34;
    this.rainMesh.visible = wet > 0.03;
    if (!this.rainMesh.visible) return;
    const P = this.rainPos, S = this.rainSeed, N = this.rainN;
    const fall = 26 * dt;
    for (let i = 0; i < N; i++) {
      S[i * 3 + 1] -= fall * (0.8 + (i % 7) * 0.06);
      if (S[i * 3 + 1] < -2) S[i * 3 + 1] += 30;
      // keep the volume wrapped around the camera
      const x = cam.x + ((((S[i * 3] - cam.x) % 60) + 90) % 60) - 30;
      const z = cam.z + ((((S[i * 3 + 2] - cam.z) % 60) + 90) % 60) - 30;
      const y = cam.y - 8 + S[i * 3 + 1];
      P[i * 6] = x;
      P[i * 6 + 1] = y;
      P[i * 6 + 2] = z;
      P[i * 6 + 3] = x + 0.12;
      P[i * 6 + 4] = y - 0.9;
      P[i * 6 + 5] = z + 0.05;
    }
    this.rainMesh.geometry.attributes.position.needsUpdate = true;
  }
}
