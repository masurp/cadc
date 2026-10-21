/* ===========================================================================
   Drawing helpers for the two week 3 network explainers (learning, network).
   Lays out a bag-of-words network — one input node per vocabulary word, one
   hidden layer, one output — and restyles its edges from a parameter set, so
   both explainers draw the identical picture and the weights on screen are
   the weights in the model (explainers/shared/mlp.js).
   Edge: width and opacity follow |w|, colour follows the sign (blue +, red −).
   =========================================================================== */
(function (root) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function el(t, a) { var e = document.createElementNS(NS, t); for (var k in a) if (a[k] != null) e.setAttribute(k, a[k]); return e; }
  function txt(p, s, a) { var t = el("text", a || {}); t.textContent = s; p.appendChild(t); return t; }
  function g(p, a) { var e = el("g", a || {}); p.appendChild(e); return e; }

  /* opts: parent, vocab, hidden (n), x: {input, hidden, output}, y: {top, bottom}, r */
  function build(opts) {
    var P = g(opts.parent, { "class": "net" });
    var V = opts.vocab, H = opts.hidden, r = opts.r || 9;
    var yIn = [], gap = (opts.y.bottom - opts.y.top) / (V.length - 1);
    for (var i = 0; i < V.length; i++) yIn.push(opts.y.top + i * gap);
    var yH = [], hgap = (opts.y.bottom - opts.y.top) / (H + 1);
    for (var h = 0; h < H; h++) yH.push(opts.y.top + (h + 1) * hgap);
    var yOut = (opts.y.top + opts.y.bottom) / 2;

    var gE = g(P, { "class": "edges" }), gN = g(P, { "class": "nodes" });
    var e1 = [], e2 = [];
    for (h = 0; h < H; h++) {
      e1.push(V.map(function (_, i) {
        return gE.appendChild(el("line", { x1: opts.x.input + r, y1: yIn[i], x2: opts.x.hidden - r, y2: yH[h], "class": "edge" }));
      }));
      e2.push(gE.appendChild(el("line", { x1: opts.x.hidden + r, y1: yH[h], x2: opts.x.output - r, y2: yOut, "class": "edge" })));
    }
    var nIn = V.map(function (w, i) {
      var k = g(gN, { "class": "node in" });
      k.appendChild(el("circle", { cx: opts.x.input, cy: yIn[i], r: r }));
      txt(k, w, { x: opts.x.input - r - 7, y: yIn[i] + 4, "class": "wlab", "text-anchor": "end" });
      txt(k, "", { x: opts.x.input, y: yIn[i] + 3.5, "class": "cnt", "text-anchor": "middle" });
      return k;
    });
    var nH = [];
    for (h = 0; h < H; h++) {
      var k = g(gN, { "class": "node hid" });
      k.appendChild(el("circle", { cx: opts.x.hidden, cy: yH[h], r: r + 3 }));
      txt(k, "", { x: opts.x.hidden, y: yH[h] + 4, "class": "act", "text-anchor": "middle" });
      nH.push(k);
    }
    var nO = g(gN, { "class": "node out" });
    nO.appendChild(el("circle", { cx: opts.x.output, cy: yOut, r: r + 5 }));
    txt(nO, "", { x: opts.x.output, y: yOut + 4.5, "class": "act", "text-anchor": "middle" });

    function setWeights(p) {
      var mx = 0.01;
      p.W1.forEach(function (row) { row.forEach(function (w) { mx = Math.max(mx, Math.abs(w)); }); });
      p.W2.forEach(function (w) { mx = Math.max(mx, Math.abs(w)); });
      function style(line, w) {
        var a = Math.abs(w) / mx;
        line.setAttribute("stroke-width", (0.5 + 2.6 * a).toFixed(2));
        line.setAttribute("stroke-opacity", (0.18 + 0.72 * a).toFixed(2));
        line.setAttribute("class", "edge " + (w >= 0 ? "pos" : "neg"));
      }
      for (var h = 0; h < H; h++) { for (var i = 0; i < V.length; i++) style(e1[h][i], p.W1[h][i]); style(e2[h], p.W2[h]); }
    }
    function setInput(x) {
      nIn.forEach(function (k, i) {
        k.setAttribute("class", "node in" + (x && x[i] ? " on" : (x ? " off" : "")));
        k.querySelector(".cnt").textContent = x && x[i] ? x[i] : "";
      });
    }
    function setHidden(a1) {
      nH.forEach(function (k, h) { k.querySelector(".act").textContent = a1 ? a1[h].toFixed(1) : ""; });
    }
    function setOutput(s) { nO.querySelector(".act").textContent = s == null ? "" : s; }
    function highlightUnit(h) {
      nH.forEach(function (k, j) { k.classList.toggle("lit", j === h); });
      for (var j = 0; j < H; j++) { e1[j].forEach(function (l) { l.classList.toggle("dim", h != null && j !== h); }); e2[j].classList.toggle("dim", h != null && j !== h); }
    }
    /* dim every edge that does not leave an active input (for the forward pass) */
    function focusInputs(x) {
      for (var h = 0; h < H; h++) e1[h].forEach(function (l, i) { l.classList.toggle("dim", x != null && !x[i]); });
    }
    return { group: P, yIn: yIn, yH: yH, yOut: yOut, e1: e1, e2: e2, nIn: nIn, nH: nH, nO: nO,
             setWeights: setWeights, setInput: setInput, setHidden: setHidden, setOutput: setOutput,
             highlightUnit: highlightUnit, focusInputs: focusInputs };
  }

  /* measured word wrap: parts = [[text, cls], ...]; one <text> per line, tspans keep
     their class; width is measured with getComputedTextLength (approximated when the
     DOM cannot measure, e.g. in tests) */
  function wrap(parent, parts, o) {
    var words = [];
    parts.forEach(function (p) { p[0].split(/(\s+)/).forEach(function (w) { if (w.trim()) words.push([w, p[1]]); }); });
    var probe = txt(parent, "", { x: -9999, y: -9999, "class": o.cls || "sm" });
    function width(str) {
      probe.textContent = str;
      return typeof probe.getComputedTextLength === "function" ? probe.getComputedTextLength() : str.length * 6.4;
    }
    var lines = [[]], cur = "";
    words.forEach(function (w) {
      var trial = cur ? cur + " " + w[0] : w[0];
      if (cur && width(trial) > o.width) { lines.push([]); cur = w[0]; } else cur = trial;
      lines[lines.length - 1].push(w);
    });
    parent.removeChild(probe);
    lines.forEach(function (ln, i) {
      var t = txt(parent, "", { x: o.x, y: o.y + i * (o.lh || 17), "class": o.cls || "sm" });
      ln.forEach(function (w, k) { var sp = el("tspan", w[1] ? { "class": w[1] } : {}); sp.textContent = (k ? " " : "") + w[0]; t.appendChild(sp); });
    });
    return o.y + lines.length * (o.lh || 17);
  }

  root.CADCNetDraw = { build: build, el: el, txt: txt, g: g, wrap: wrap };
})(window);
