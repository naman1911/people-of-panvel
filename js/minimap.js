// A real map of Panvel, drawn from the same OpenStreetMap data as the 3D town:
// a small round minimap in the corner and a full map you can open.

import { STAMPS, HUBS, ZONES } from './data/places.js';
import { STREET_MR } from './data/streets.js';
import { along } from './world/geom.js';
import { store } from './store.js';
import { getLang } from './i18n.js';

const ROAD_W = { M: 16, T: 15, t: 8, P: 13, p: 8, S: 11, s: 7, E: 9, e: 6, R: 6.5, L: 5, V: 4, D: 5, F: 2.4, H: 2, X: 2.4 };

export function createMap(data) {
  const { play } = data.meta;
  const pad = 90;
  const x0 = play.minX - pad, z0 = play.minZ - pad;
  const W = Math.round(play.maxX - play.minX + pad * 2), H = Math.round(play.maxZ - play.minZ + pad * 2);
  const base = document.createElement('canvas');
  base.width = W;
  base.height = H;
  const g = base.getContext('2d');
  const path = (p, close) => {
    g.beginPath();
    for (let i = 0; i < p.length; i++) (i ? g.lineTo : g.moveTo).call(g, p[i][0] - x0, p[i][1] - z0);
    if (close) g.closePath();
  };
  g.fillStyle = '#efe7d6';
  g.fillRect(0, 0, W, H);
  for (const l of data.land) {
    if (!l.pts) continue;
    path(l.pts, true);
    g.fillStyle = l.k === 'c' ? '#e2d5bb' : '#e4ded0';
    g.fill();
  }
  for (const gr of data.green) {
    path(gr.pts, true);
    g.fillStyle = '#b9d79a';
    g.fill();
  }
  g.fillStyle = '#d9cdb8';
  for (const b of data.buildings) {
    if (!b.pts) continue;
    path(b.pts, true);
    g.fillStyle = b.k === 'w' ? '#e3a48f' : b.k === 's' ? '#c9b1d6' : '#d6c9b3';
    g.fill();
  }
  g.lineJoin = g.lineCap = 'round';
  // street casings, then fills, so junctions merge cleanly
  for (const pass of [0, 1]) {
    for (const r of data.roads) {
      if (r.tu) continue;
      const w = ROAD_W[r.c] || 4;
      const major = 'MTPS'.includes(r.c);
      path(r.pts);
      if (pass === 0) {
        g.strokeStyle = major ? '#c79a3a' : '#c5bba6';
        g.lineWidth = w + 2;
      } else {
        g.strokeStyle = 'FHX'.includes(r.c) ? '#e9d9c9' : major ? '#ffe9a8' : '#ffffff';
        g.lineWidth = w;
      }
      g.stroke();
    }
  }
  // water sits above the streets so the river and lakes read clearly
  // (drawn from the same polygons the town uses)
  g.fillStyle = '#8fc3de';
  for (const w of data.water) {
    if (!w.pts) continue;
    path(w.pts, true);
    g.fill();
  }
  for (const r of data.rails) {
    if (!r.pts) continue;
    path(r.pts);
    g.strokeStyle = '#5a5a5a';
    g.lineWidth = 2.2;
    g.setLineDash([]);
    g.stroke();
    g.strokeStyle = '#efe7d6';
    g.lineWidth = 1;
    g.setLineDash([5, 5]);
    g.stroke();
    g.setLineDash([]);
  }

  /** Street name labels for the full map (drawn on demand at the map's scale). */
  function labels(ctx, scale, lang) {
    const done = new Map();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const r of data.roads) {
      if (!r.n || r.len < 70 || !'PSE'.includes(r.c)) continue;
      const mid = along(r.pts, r.len / 2);
      const list = done.get(r.n) || [];
      if (list.some((q) => Math.hypot(q[0] - mid.x, q[1] - mid.z) < 380)) continue;
      list.push([mid.x, mid.z]);
      done.set(r.n, list);
      let ang = Math.atan2(mid.dz, mid.dx);
      if (ang > Math.PI / 2) ang -= Math.PI;
      if (ang < -Math.PI / 2) ang += Math.PI;
      ctx.save();
      ctx.translate((mid.x - x0) * scale, (mid.z - z0) * scale);
      ctx.rotate(ang);
      ctx.font = '600 10px "Mukta", sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      const text = (lang === 'mr' && STREET_MR[r.n]) || r.n;
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = '#4a4336';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }

  const dot = (ctx, x, y, r, fill, stroke) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.3);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  /** Markers shared by both views. `tx` maps world metres to canvas pixels. */
  function markers(ctx, tx, game, big) {
    const got = store.get('stamps');
    for (const s of STAMPS) {
      const [x, y] = tx(s.x, s.z);
      if (big) {
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = got.includes(s.id) ? 1 : 0.55;
        ctx.fillText(s.icon, x, y);
        ctx.globalAlpha = 1;
      } else dot(ctx, x, y, 3.5, got.includes(s.id) ? '#ffb627' : null, '#b8860b');
    }
    for (const hb of HUBS) {
      const [x, y] = tx(hb.x, hb.z);
      dot(ctx, x, y, big ? 5 : 3.5, '#1b1b1b', '#f2c21a');
    }
    const met = store.get('met');
    for (const n of game.residents.list) {
      const [x, y] = tx(n.x, n.z);
      dot(ctx, x, y, big ? 3.5 : 2.6, met.includes(n.def.id) ? '#ff5a3c' : '#ffffff', '#ff5a3c');
    }
  }

  return {
    base, x0, z0, W, H,
    /** Round corner map centred on the player. North is up; the arrow shows where you face. */
    drawMini(ctx, size, px, pz, heading, guide, game) {
      const R = 120; // metres from centre to edge
      const s = size / (R * 2);
      ctx.save();
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, 6.3);
      ctx.clip();
      ctx.fillStyle = '#efe7d6';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(base, px - R - x0, pz - R - z0, R * 2, R * 2, 0, 0, size, size);
      const tx = (x, z) => [(x - px + R) * s, (z - pz + R) * s];
      markers(ctx, tx, game, false);
      if (guide) {
        let [gx, gy] = tx(guide.x, guide.z);
        // pin far-away targets to the rim
        const dx = gx - size / 2, dy = gy - size / 2, d = Math.hypot(dx, dy), max = size / 2 - 7;
        if (d > max) (gx = size / 2 + (dx / d) * max), (gy = size / 2 + (dy / d) * max);
        dot(ctx, gx, gy, 6, 'rgba(255,182,39,.5)', '#ffb627');
      }
      // you
      ctx.translate(size / 2, size / 2);
      ctx.rotate(heading);
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(6.5, 7);
      ctx.lineTo(0, 3.5);
      ctx.lineTo(-6.5, 7);
      ctx.closePath();
      ctx.fillStyle = '#ff5a3c';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    },
    /** Whole-town map. Returns the scale used, so clicks can be mapped back. */
    drawFull(ctx, w, px, pz, heading, guide, game) {
      const scale = w / W;
      const h = Math.round(H * scale);
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(base, 0, 0, w, h);
      const lang = getLang();
      labels(ctx, scale, lang);
      const tx = (x, z) => [(x - x0) * scale, (z - z0) * scale];
      // neighbourhood names
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 13px "Baloo 2", sans-serif';
      for (const zn of ZONES) {
        if (zn.test) continue;
        const [x, y] = tx(zn.x, zn.z);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        const text = (zn[lang] || zn.en).toUpperCase();
        ctx.strokeText(text, x, y - 16);
        ctx.fillStyle = '#10252b';
        ctx.fillText(text, x, y - 16);
      }
      markers(ctx, tx, game, true);
      if (guide) {
        const [gx, gy] = tx(guide.x, guide.z);
        dot(ctx, gx, gy, 9, 'rgba(255,182,39,.45)', '#ffb627');
      }
      const [mx, my] = tx(px, pz);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(heading);
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(8, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fillStyle = '#ff5a3c';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      return { scale, h };
    },
  };
}
