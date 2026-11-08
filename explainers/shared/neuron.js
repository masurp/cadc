/* ===========================================================================
   The biological neuron of the week 3 explainers, and the 1943 unit laid over
   it. Used by the cold open (explainers/learning) and by the network taken
   apart (explainers/network), so both start from the same drawing.

     var N = CADCNeuron.create({ ctx, net })   // net: a CADCNet3D (for its spheres)
     N.draw(now, alpha, reduced)               // in the 1000 × 440 frame
     N.overlay(svgGroup)                       // x1…x4, w1…w4, Σ, f, y, on the same frame

   Callers that want the neuron smaller or elsewhere set a transform on the
   canvas context and on the SVG group; the geometry is fixed and seeded.
   =========================================================================== */
(function (root) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function el(t, a) { var e = document.createElementNS(NS, t); for (var k in a) if (a[k] != null) e.setAttribute(k, a[k]); return e; }
  function txt(p, s, a) { var t = el("text", a || {}); t.textContent = s; p.appendChild(t); return t; }

  function create(o) {
    var ctx = o.ctx, net = o.net, N3 = root.CADCNet3D, COL = N3.COL, rgba = N3.rgba, mix = N3.mix;
    var SOMA = [440, 216], SR = 34, rnd = root.CADCMLP.rng(11);
    function qbez(p0, p1, p2, t) { var u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; }
    var branches = [];
    function grow(p0, ang, len, w0, w1, depth) {
      var bend = (rnd() - .5) * .9, p2 = [p0[0] + Math.cos(ang) * len, p0[1] + Math.sin(ang) * len];
      var mid = [(p0[0] + p2[0]) / 2 + Math.cos(ang + 1.57) * len * bend * .5, (p0[1] + p2[1]) / 2 + Math.sin(ang + 1.57) * len * bend * .5];
      branches.push({ p0: p0, p1: mid, p2: p2, w0: w0, w1: w1, depth: depth });
      if (depth < 2) for (var k = 0; k < 2; k++) grow(p2, ang + (k ? .5 : -.5) + (rnd() - .5) * .5, len * .58, w1, w1 * .4, depth + 1);
    }
    [2.35, 2.75, 3.05, 3.35, 3.65, 3.95].forEach(function (a) { grow([SOMA[0] + Math.cos(a) * (SR - 4), SOMA[1] + Math.sin(a) * (SR - 4)], a, 100 + rnd() * 40, 8, 3, 0); });
    var trunks = branches.filter(function (b) { return b.depth === 0; });
    var AX0 = [SOMA[0] + SR - 3, SOMA[1]], AX1 = [690, SOMA[1]];
    var TERM = [-60, -30, 0, 30, 60].map(function (dy) { return { c: [728, SOMA[1] + dy * .55], e: [764, SOMA[1] + dy] }; });
    var signals = []; for (var s = 0; s < 14; s++) signals.push({ b: Math.floor(rnd() * branches.length), t: rnd(), v: .0025 + rnd() * .003 });

    function drawTaper(b) {
      var n = 10, prev = qbez(b.p0, b.p1, b.p2, 0);
      for (var i = 1; i <= n; i++) {
        var t = i / n, p = qbez(b.p0, b.p1, b.p2, t);
        ctx.strokeStyle = rgba(mix(COL.ink, COL.slate, .25 + .5 * t), .95 * (1 - .35 * t)); ctx.lineWidth = b.w0 + (b.w1 - b.w0) * t; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); prev = p;
      }
    }
    function draw(now, alpha, reduced) {
      if (alpha <= 0) return;
      ctx.save(); ctx.globalAlpha = alpha;
      var breathe = .5 + .5 * Math.sin(now / 900), gl = ctx.createRadialGradient(SOMA[0], SOMA[1], 10, SOMA[0], SOMA[1], 150);
      gl.addColorStop(0, rgba(COL.acc, .22 + .1 * breathe)); gl.addColorStop(1, rgba(COL.acc, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(SOMA[0], SOMA[1], 150, 0, 6.2832); ctx.fill();
      branches.forEach(drawTaper);
      var grd = ctx.createLinearGradient(AX0[0], 0, AX1[0], 0); grd.addColorStop(0, rgba(mix(COL.ink, COL.slate, .2), 1)); grd.addColorStop(1, rgba(mix(COL.ink, COL.slate, .55), 1));
      ctx.strokeStyle = grd; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(AX0[0], AX0[1]); ctx.lineTo(AX1[0], AX1[1]); ctx.stroke();
      for (var m = 0; m < 6; m++) { var x0 = AX0[0] + 20 + m * 33; ctx.fillStyle = rgba(mix(COL.ink, COL.slate, .1), 1); ctx.beginPath(); ctx.roundRect(x0, AX0[1] - 6.5, 23, 13, 6); ctx.fill(); ctx.strokeStyle = rgba(COL.deep, .8); ctx.lineWidth = 1; ctx.stroke(); }
      TERM.forEach(function (t) { ctx.strokeStyle = rgba(mix(COL.ink, COL.slate, .5), 1); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(AX1[0], AX1[1]); ctx.quadraticCurveTo(t.c[0], t.c[1], t.e[0], t.e[1]); ctx.stroke(); net.sphere(t.e[0], t.e[1], 5.5, COL.slate, false); });
      net.sphere(SOMA[0], SOMA[1], SR, COL.slate, false); net.sphere(SOMA[0] - 5, SOMA[1] - 4, 11, COL.deep, false);
      if (!reduced) signals.forEach(function (sg) { sg.t += sg.v; if (sg.t > 1) { sg.t = 0; sg.b = Math.floor(rnd() * branches.length); } var b = branches[sg.b], p = qbez(b.p0, b.p1, b.p2, 1 - sg.t); net.sphere(p[0], p[1], 2.6, COL.acc, true); });
      var ph = (now % 1700) / 1700;
      if (!reduced && ph < .7) { var px = AX0[0] + (AX1[0] - AX0[0]) * (ph / .7), pg = ctx.createRadialGradient(px, AX0[1], 0, px, AX0[1], 22); pg.addColorStop(0, rgba(COL.acc, .9)); pg.addColorStop(1, rgba(COL.acc, 0)); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, AX0[1], 22, 0, 6.2832); ctx.fill(); }
      else if (!reduced && ph < .95) { var k = (ph - .7) / .25; TERM.forEach(function (t) { net.sphere(t.e[0], t.e[1], 5.5 + 4 * Math.sin(k * 3.1416), COL.acc, true); }); }
      ctx.restore();
    }
    /* the unit laid over the neuron: inputs on the dendrites, weights along them,
       the sum in the cell body, f on the axon, y at the terminals */
    function overlay(U) {
      trunks.slice(1, 5).forEach(function (b, i) {
        var e = b.p2;
        U.appendChild(el("circle", { "class": "over", cx: e[0] - 14, cy: e[1], r: 12 }));
        txt(U, "x" + (i + 1), { x: e[0] - 14, y: e[1] + 3.5, "class": "olab", "text-anchor": "middle" });
        var wpos = qbez(b.p0, b.p1, b.p2, .5);
        txt(U, "w" + (i + 1), { x: wpos[0], y: wpos[1] - 9, "class": "olab", "text-anchor": "middle" });
      });
      U.appendChild(el("rect", { "class": "over", x: SOMA[0] - 44, y: SOMA[1] - 20, width: 88, height: 40, rx: 9 }));
      txt(U, "Σ wᵢxᵢ + b", { x: SOMA[0], y: SOMA[1] + 4, "class": "olab", "text-anchor": "middle" });
      U.appendChild(el("rect", { "class": "over", x: 556, y: SOMA[1] - 18, width: 42, height: 36, rx: 9 }));
      txt(U, "f", { x: 577, y: SOMA[1] + 4, "class": "olab", "text-anchor": "middle" });
      U.appendChild(el("circle", { "class": "over", cx: 800, cy: SOMA[1], r: 14 }));
      txt(U, "y", { x: 800, y: SOMA[1] + 4, "class": "olab", "text-anchor": "middle" });
    }
    return { draw: draw, overlay: overlay, SOMA: SOMA, trunks: trunks };
  }

  root.CADCNeuron = { create: create };
})(window);
