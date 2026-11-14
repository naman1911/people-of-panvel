// Renderer and post-processing: soft shadows, ambient occlusion, bloom and
// filmic tone mapping. Three quality tiers keep it playable on phones.

import * as THREE from 'three';
import { EffectComposer } from '../../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/addons/postprocessing/OutputPass.js';
import { GTAOPass } from '../../vendor/addons/postprocessing/GTAOPass.js';
import { setMaxAniso } from './texkit.js';

export const TIERS = {
  low: { pixelRatio: 1, shadow: 1024, shadowRange: 70, ao: false, bloom: false, reflect: false, msaa: 0, far: 750, detail: 0.5, detailRange: 220 },
  medium: { pixelRatio: 1.25, shadow: 2048, shadowRange: 100, ao: false, bloom: true, reflect: false, msaa: 4, far: 1100, detail: 0.8, detailRange: 300 },
  high: { pixelRatio: 1.5, shadow: 4096, shadowRange: 130, ao: true, bloom: true, reflect: true, msaa: 4, far: 1500, detail: 1, detailRange: 380 },
};

export function pickTier() {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (coarse) return cores >= 8 && mem >= 6 ? 'medium' : 'low';
  if (cores <= 4 || mem < 4) return 'medium';
  // Integrated and software GPUs get the lighter tier; the full effects need a real graphics card.
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(name)) return 'low';
    if (/Intel|UHD|Iris|Mali|Adreno|PowerVR|Radeon\(TM\) Graphics|Vega/i.test(name) && !/Arc/i.test(name)) return 'medium';
  } catch {
    /* fall through */
  }
  return 'high';
}

export function createRenderer(canvas, tierName) {
  const tier = { ...TIERS[tierName], name: tierName };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !tier.bloom && !tier.ao, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.pixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.62;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false;
  setMaxAniso(renderer.capabilities.getMaxAnisotropy());

  let composer = null, bloom = null, ao = null;

  function setup(scene, camera) {
    if (!tier.bloom && !tier.ao) return;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: tier.msaa });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    if (tier.ao) {
      ao = new GTAOPass(scene, camera, size.x, size.y);
      ao.output = GTAOPass.OUTPUT.Default;
      ao.blendIntensity = 0.9;
      ao.updateGtaoMaterial({ radius: 1.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.15, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1.5, rings: 2, samples: 12 });
      composer.addPass(ao);
    }
    if (tier.bloom) {
      bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.22, 0.6, 0.92);
      composer.addPass(bloom);
    }
    composer.addPass(new OutputPass());
  }

  function resize(camera) {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.pixelRatio));
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(scene, camera) {
    renderer.info.reset();
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  return {
    renderer, tier, setup, resize, render,
    /** Bloom is subtle by day and stronger once the lights come on. */
    setNight(n) {
      if (bloom) {
        bloom.strength = 0.16 + n * 0.5;
        bloom.threshold = 0.95 - n * 0.35;
      }
    },
    /** Step the quality down while running. Returns false when nothing is left to drop. */
    degrade(step) {
      if (step === 1 && ao) {
        ao.enabled = false;
        return true;
      }
      if (step === 2) {
        tier.pixelRatio = Math.min(tier.pixelRatio, 1);
        renderer.setPixelRatio(1);
        const s = renderer.getSize(new THREE.Vector2());
        if (composer) composer.setSize(s.x, s.y);
        return true;
      }
      if (step === 3 && bloom) {
        bloom.enabled = false;
        return true;
      }
      return false;
    },
    get composer() {
      return composer;
    },
  };
}
