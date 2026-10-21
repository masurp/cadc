/* ===========================================================================
   A small network drawn in three dimensions on a canvas — the engine behind
   the week 3 cold open (explainers/learning) and its cousin (explainers/network).
   Perspective projection, a slow yaw the caller supplies, spheres shaded with
   a radial gradient, edges coloured by the sign of the weight and weighted by
   its size, an optional pulse (one review travelling through), an optional
   gradient overlay (backpropagation, dashed and running backwards) and an
   optional highlighted hidden unit. Both explainers pass the SAME model
   (explainers/shared/mlp.js) so the picture is the picture.
   =========================================================================== */
(function (root) {
  "use strict";
  var COL = { pos: [74, 168, 220], neg: [224, 122, 82], acc: [79, 192, 141], amber: [240, 178, 80],
              ink: [232, 234, 236], slate: [70, 96, 122], deep: [28, 52, 78] };
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function create(o) {
    var ctx = o.ctx, V = o.vocab.length, HN = o.hidden || 4, CAM = o.cam, origin = o.origin || [CAM.cx, CAM.cy];
    var R = o.nodeR || { in: 6.5, hid: 10.5, out: 14 };
    var nodes = [];
    for (var i = 0; i < V; i++) { var f = i / (V - 1); nodes.push({ layer: 0, i: i, p: [-2.45, 1.85 - 3.7 * f, .7 * Math.cos((f - .5) * 3.1416) - .35], r: R.in }); }
    for (var h = 0; h < HN; h++) nodes.push({ layer: 1, i: h, p: [0, 1.25 - 2.5 * h / (HN - 1), (h % 2 ? .45 : -.45)], r: R.hid });
    nodes.push({ layer: 2, i: 0, p: [2.4, 0, 0], r: R.out });

    function sphere(x, y, r, base, glow) {
      if (glow) { var gl = ctx.createRadialGradient(x, y, r * .6, x, y, r * 2.6); gl.addColorStop(0, rgba(base, .35)); gl.addColorStop(1, rgba(base, 0));
                  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, 6.2832); ctx.fill(); }
      var gr = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
      gr.addColorStop(0, rgba(mix(base, COL.ink, .75), 1)); gr.addColorStop(.35, rgba(mix(base, COL.ink, .25), 1)); gr.addColorStop(1, rgba(mix(base, COL.deep, .55), 1));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }
    function project(p, yaw, unfold) {
      var x = p[0] * unfold, y = p[1] * unfold, z = p[2] * unfold;
      var cy = Math.cos(yaw), sy = Math.sin(yaw), x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      var cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch), y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      var k = CAM.f / (CAM.f + z2);
      var ox = (origin[0] - CAM.cx) * (1 - unfold), oy = (origin[1] - CAM.cy) * (1 - unfold);
      return { x: CAM.cx + ox + x1 * CAM.S * k, y: CAM.cy + oy + y2 * CAM.S * k, k: k, z: z2 };
    }

    /* o2: { alpha, yaw, unfold, params, pulse:{x,hid,out,t}, highlight, focus:[i], grad:{g1,g2,now}, labels:{words,out,hid,counts}, outGlow:[rgb] } */
    function draw(now, d) {
      if (d.alpha <= 0) return null;
      var yaw = d.yaw || 0, unfold = d.unfold == null ? 1 : d.unfold, p = d.params;
      ctx.save(); ctx.globalAlpha = d.alpha;
      var P = nodes.map(function (n) { return project(n.p, yaw, unfold); });
      var mx = .01;
      p.W1.forEach(function (r) { r.forEach(function (w) { mx = Math.max(mx, Math.abs(w)); }); }); p.W2.forEach(function (w) { mx = Math.max(mx, Math.abs(w)); });
      var edges = [];
      for (var h = 0; h < HN; h++) {
        for (var i = 0; i < V; i++) edges.push({ a: i, b: V + h, w: p.W1[h][i], h: h, from: 0, i: i });
        edges.push({ a: V + h, b: V + HN, w: p.W2[h], h: h, from: 1 });
      }
      edges.sort(function (e, f) { return (P[f.a].z + P[f.b].z) - (P[e.a].z + P[e.b].z); });
      var hi = d.highlight, focus = d.focus, lit = d.litEdges;   /* litEdges: {h, inputs:[i]} */
      edges.forEach(function (e) {
        var a = P[e.a], b = P[e.b], m = Math.abs(e.w) / mx;
        var dim = (hi != null && e.h !== hi) || (focus && e.from === 0 && focus.indexOf(e.i) < 0);
        var bright = lit && e.h === lit.h && ((e.from === 0 && lit.inputs.indexOf(e.i) >= 0) || (e.from === 1 && lit.out));
        ctx.strokeStyle = rgba(e.w >= 0 ? COL.pos : COL.neg, dim ? .05 : (bright ? .95 : .1 + .6 * m));
        ctx.lineWidth = (bright ? 3.2 : .4 + 2.4 * m) * (a.k + b.k) / 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      /* backpropagation: dashed amber, running from the output backwards */
      if (d.grad) {
        var G = d.grad, gm = .01;
        G.g2.forEach(function (v) { gm = Math.max(gm, Math.abs(v)); });
        G.g1.forEach(function (r, hh) { (G.inputs || []).forEach(function (ii) { gm = Math.max(gm, Math.abs(r[ii])); }); });
        ctx.setLineDash([6, 5]); ctx.lineDashOffset = ((now || 0) / 40) % 11;
        for (var h2 = 0; h2 < HN; h2++) {
          var o1 = P[V + HN], h1 = P[V + h2];
          ctx.strokeStyle = rgba(COL.amber, .95); ctx.lineWidth = .8 + 2.6 * Math.abs(G.g2[h2]) / gm;
          ctx.beginPath(); ctx.moveTo(o1.x, o1.y); ctx.lineTo(h1.x, h1.y); ctx.stroke();
          (G.inputs || []).forEach(function (ii) {
            var q = P[ii]; ctx.lineWidth = .8 + 2.6 * Math.abs(G.g1[h2][ii]) / gm;
            ctx.beginPath(); ctx.moveTo(h1.x, h1.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          });
        }
        ctx.setLineDash([]);
      }
      /* the pulse */
      var pulse = d.pulse;
      if (pulse && pulse.x && pulse.t != null && pulse.t < 1) {
        var ph = pulse.t, active = []; pulse.x.forEach(function (v, i) { if (v) active.push(i); });
        if (ph < .5) { var t1 = ease(ph / .5); active.forEach(function (i) { for (var h3 = 0; h3 < HN; h3++) { var a1 = P[i], b1 = P[V + h3]; sphere(a1.x + (b1.x - a1.x) * t1, a1.y + (b1.y - a1.y) * t1, 2.8, COL.acc, true); } }); }
        else { var t2 = ease((ph - .5) / .5); for (var h4 = 0; h4 < HN; h4++) { var a2 = P[V + h4], b2 = P[V + HN]; sphere(a2.x + (b2.x - a2.x) * t2, a2.y + (b2.y - a2.y) * t2, 3, COL.acc, true); } }
      }
      /* nodes, back to front */
      var order = nodes.map(function (n, k) { return k; }).sort(function (a, b) { return P[b].z - P[a].z; });
      order.forEach(function (k) {
        var n = nodes[k], q = P[k], base = COL.slate, glow = false, r = n.r * q.k;
        if (n.layer === 0 && pulse && pulse.x && pulse.x[n.i]) { base = COL.acc; glow = true; }
        if (n.layer === 1 && pulse && pulse.hid && pulse.t >= .5) { var a = pulse.hid[n.i]; base = mix(COL.slate, a > 0 ? COL.pos : COL.neg, Math.min(1, Math.abs(a))); }
        if (n.layer === 2 && pulse && pulse.out != null && pulse.t >= .98) { base = mix(COL.slate, pulse.out > .5 ? COL.pos : COL.neg, Math.abs(pulse.out - .5) * 2); glow = true; }
        if (n.layer === 2 && d.outGlow) { base = d.outGlow; glow = true; }
        if (hi != null && n.layer === 1) { if (n.i === hi) { base = COL.acc; glow = true; r *= 1.15; } else base = COL.deep; }
        sphere(q.x, q.y, r, base, glow);
        if (d.labels && d.labels.hid && n.layer === 1 && pulse && pulse.hid && pulse.t >= .5) {
          ctx.font = "700 9px 'Space Grotesk', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = rgba(COL.ink, 1);
          ctx.fillText(pulse.hid[n.i].toFixed(1), q.x, q.y);
        }
      });
      /* labels */
      var L = d.labels || {};
      if (L.words) {
        ctx.font = "700 " + (L.size || 10.5) + "px 'Space Grotesk', system-ui, sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        for (var i2 = 0; i2 < V; i2++) { var q2 = P[i2]; var on = pulse && pulse.x && pulse.x[i2];
          ctx.fillStyle = on ? rgba(COL.acc, 1) : rgba(COL.ink, .96); ctx.fillText(o.vocab[i2], q2.x - nodes[i2].r * q2.k - 7, q2.y);
          if (L.counts && on) { ctx.textAlign = "left"; ctx.fillStyle = rgba(COL.acc, 1); ctx.fillText(String(pulse.x[i2]), q2.x + nodes[i2].r * q2.k + 6, q2.y); ctx.textAlign = "right"; } }
      }
      var qo = P[V + HN];
      if (L.out) { ctx.textAlign = "center"; ctx.font = "700 9.5px 'Space Grotesk', system-ui, sans-serif"; ctx.fillStyle = rgba([125, 155, 181], 1); ctx.fillText("p(positive)", qo.x, qo.y + (nodes[V + HN].r + 13) * unfold); }
      if (pulse && pulse.out != null && pulse.t >= .98) { ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 11px 'Space Grotesk', system-ui, sans-serif"; ctx.fillStyle = rgba(COL.ink, .98); ctx.fillText(pulse.out.toFixed(2), qo.x, qo.y); }
      ctx.restore();
      return P;
    }
    return { draw: draw, project: function (k, yaw, unfold) { return project(nodes[k].p, yaw, unfold == null ? 1 : unfold); }, sphere: sphere, nodes: nodes, COL: COL, rgba: rgba, mix: mix, ease: ease };
  }
  root.CADCNet3D = { create: create, COL: COL, rgba: rgba, mix: mix, ease: ease };
})(window);
