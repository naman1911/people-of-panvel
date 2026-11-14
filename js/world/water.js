// Lakes, the river and nalas. On the high tier the water mirrors the town
// (planar reflection); otherwise it is a glossy surface lit by the sky.

import * as THREE from 'three';
import { Water } from '../../vendor/addons/objects/Water.js';
import { waterNormals } from '../gfx/surfaces.js';
import { tex } from '../gfx/texkit.js';

const Y = 0.09;

function flatGeometry(polys) {
  const pos = [];
  for (const p of polys) {
    const contour = p.map((q) => new THREE.Vector2(q[0], q[1]));
    for (const f of THREE.ShapeUtils.triangulateShape(contour, [])) {
      let a = p[f[0]], b = p[f[1]], c = p[f[2]];
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (cross < 0) [b, c] = [c, b];
      pos.push(a[0], Y, a[1], c[0], Y, c[1], b[0], Y, b[1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const n = new Float32Array(pos.length);
  for (let i = 1; i < n.length; i += 3) n[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  const uv = new Float32Array((pos.length / 3) * 2);
  for (let i = 0; i < pos.length / 3; i++) {
    uv[i * 2] = pos[i * 3] / 23;
    uv[i * 2 + 1] = pos[i * 3 + 2] / 23;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}

/** Same polygons laid out in a local XY plane, for the reflective surface (which expects a rotated plane). */
function mirrorGeometry(polys) {
  const pos = [];
  for (const p of polys) {
    const contour = p.map((q) => new THREE.Vector2(q[0], -q[1]));
    for (const f of THREE.ShapeUtils.triangulateShape(contour, [])) {
      let a = contour[f[0]], b = contour[f[1]], c = contour[f[2]];
      const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      if (cross < 0) [b, c] = [c, b];
      pos.push(a.x, a.y, 0, b.x, b.y, 0, c.x, c.y, 0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const n = new Float32Array(pos.length);
  for (let i = 2; i < n.length; i += 3) n[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  g.computeBoundingSphere();
  return g;
}

export function createWater(polys, tier, scene) {
  const normals = tex(waterNormals(), { srgb: false });
  const group = new THREE.Group();
  const geo = flatGeometry(polys);

  // Always-on glossy water.
  const simple = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0x24424a, roughness: 0.07, metalness: 0.0, normalMap: normals, normalScale: new THREE.Vector2(0.22, 0.22),
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, envMapIntensity: 2.4,
    }),
  );
  simple.receiveShadow = true;
  group.add(simple);

  let mirror = null;
  if (tier.reflect) {
    mirror = new Water(mirrorGeometry(polys), {
      textureWidth: 768, textureHeight: 768, waterNormals: normals, sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: 0xfff2d8, waterColor: 0x22423a, distortionScale: 1.6, fog: true, alpha: 1,
    });
    mirror.material.polygonOffset = true;
    mirror.material.polygonOffsetFactor = -5;
    mirror.material.polygonOffsetUnits = -5;
    mirror.material.uniforms.size.value = 0.22;
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = Y;
    group.add(mirror);
  }
  scene.add(group);

  // Bounding boxes, to know when any water is close enough to be worth reflecting.
  const boxes = polys.map((p) => {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const q of p) {
      x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]);
    }
    return [x0, z0, x1, z1];
  });

  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4();
  const box3 = boxes.map((b) => new THREE.Box3(new THREE.Vector3(b[0], -0.5, b[1]), new THREE.Vector3(b[2], 0.5, b[3])));

  return {
    group,
    /** Turn the planar reflection off (used when the frame rate drops). */
    disableMirror() {
      if (!mirror) return;
      group.remove(mirror);
      mirror = null;
      simple.visible = true;
    },
    update(dt, cam, atmosphere, camera) {
      normals.offset.x += dt * 0.006;
      normals.offset.y += dt * 0.004;
      if (!mirror) return;
      // Reflections cost a whole extra render of the town, so only when water is close and on screen.
      let near = false;
      if (camera) frustum.setFromProjectionMatrix(pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        const dx = Math.max(b[0] - cam.x, 0, cam.x - b[2]), dz = Math.max(b[1] - cam.z, 0, cam.z - b[3]);
        if (dx * dx + dz * dz < 380 * 380 && (!camera || frustum.intersectsBox(box3[i]))) {
          near = true;
          break;
        }
      }
      mirror.visible = near;
      simple.visible = !near;
      if (!near) return;
      const u = mirror.material.uniforms;
      u.time.value += dt * 0.35;
      u.sunDirection.value.copy(atmosphere.lightDir);
      const day = 1 - atmosphere.night;
      u.sunColor.value.copy(atmosphere.sun.color).multiplyScalar(0.25 + day * 0.75);
      u.waterColor.value.setRGB(0.05 + day * 0.07, 0.1 + day * 0.14, 0.1 + day * 0.12);
      u.distortionScale.value = 1.4 + atmosphere.rain * 2.2;
    },
  };
}
