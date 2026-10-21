/* ===========================================================================
   The text classification pipeline — the shared drawing engine.

   Loaded by all five variants (see pipeline.css for the list). It owns
   everything that MUST NOT MOVE between weeks:

       sources → [01 Obtain] → texts → [02 Represent] → matrix
               → [03 Classify] → labelled texts → [04 Validate]

   plus the validation feedback loop over the row, and the hand coded subset
   under step 04. A variant supplies its notes and labels, then draws its own
   scene in the BAND UNDER THE ROW (y ≥ G.SLOT) — the space deliberately left
   empty in week 1 so that weeks 2, 3 and 4 can fill it without shifting a box.

   Reserved space, so scenes do not collide with the fixed furniture:
     y < G.SLOT            the row, the rail, the artefacts — engine only
     x > 880 and y < 310   the hand coded subset under step 04
   Everything else between y = G.SLOT and y = 424 belongs to the variant.

   TEXT NEVER OVERFLOWS A BOX. Nothing here writes a raw <text> into a
   container: wrap() measures with getComputedTextLength() and breaks to the
   container's inner width, and re-measures once the web font has loaded
   (fonts change every width, so measuring before load is measuring the
   fallback). If a label is too long it wraps; it does not spill.

   Click / Enter / space advances. #N in the URL opens at scene N, which is
   also how these are screenshotted for the fallback images.
   =========================================================================== */
(function (root) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";

  /* -- tiny DOM helpers ---------------------------------------------------- */
  function el(tag, a) { var e = document.createElementNS(NS, tag); for (var k in a) if (a[k] != null) e.setAttribute(k, a[k]); return e; }
  function g(p, a) { var e = el("g", a || {}); p.appendChild(e); return e; }
  function txt(p, s, a) { var t = el("text", a || {}); t.textContent = s; p.appendChild(t); return t; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  /* -- measured word wrap --------------------------------------------------
     wrap(parent, "some long label", {x, y, width, lh, class, anchor})
     Breaks on measured width, so a note can never run past its box. Every
     call registers itself for a re-flow when the web font finishes loading. */
  var reflow = [];
  function layout(t, s, o) {
    clear(t);
    var probe = el("tspan", {}); t.appendChild(probe);
    var words = String(s).split(/\s+/), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + " " + words[i] : words[i];
      probe.textContent = test;
      if (cur && probe.getComputedTextLength() > o.width) { lines.push(cur); cur = words[i]; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    clear(t);
    for (var j = 0; j < lines.length; j++) {
      var ts = el("tspan", { x: o.x, dy: j === 0 ? 0 : (o.lh || 13) });
      ts.textContent = lines[j]; t.appendChild(ts);
    }
    t.setAttribute("data-lines", lines.length);
  }
  function wrap(p, s, o) {
    var t = el("text", { x: o.x, y: o.y, class: o["class"] || "", "text-anchor": o.anchor || "start" });
    p.appendChild(t);
    layout(t, s, o);
    reflow.push({ node: t, run: function () { layout(t, s, o); } });
    return t;
  }
  /* Captions are re drawn on every click, so the list accumulates detached
     nodes; drop them rather than measuring something that is no longer in the
     document (getComputedTextLength on a detached node is not reliable). */
  function runReflow() {
    reflow = reflow.filter(function (r) { return r.node.isConnected; });
    reflow.forEach(function (r) { r.run(); });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(runReflow);

  /* -- connectors ----------------------------------------------------------- */
  function head(p, x, y, angle, cls) {
    var s = 6, q = [[x, y],
                    [x - s * Math.cos(angle - .5), y - s * Math.sin(angle - .5)],
                    [x - s * Math.cos(angle + .5), y - s * Math.sin(angle + .5)]];
    p.appendChild(el("polygon", { points: q.map(function (a) { return a[0] + "," + a[1]; }).join(" "),
                                  "class": "arrowhead " + (cls || "") }));
  }
  function headClass(cls) {
    cls = cls || "";
    return (cls.indexOf("back") >= 0 ? "back " : "") + (cls.indexOf("feed") >= 0 ? "feed " : "");
  }
  function arrow(p, x1, y1, x2, y2, cls) {
    p.appendChild(el("line", { x1: x1, y1: y1, x2: x2, y2: y2, "class": "arrow " + (cls || "") }));
    head(p, x2, y2, Math.atan2(y2 - y1, x2 - x1), headClass(cls));
    return p;
  }
  /* elbow([[x,y],[x,y],…]) — an orthogonal run with a head on the last leg */
  function elbow(p, pts, cls) {
    var d = pts.map(function (q, i) { return (i ? "L " : "M ") + q[0] + " " + q[1]; }).join(" ");
    p.appendChild(el("path", { d: d, "class": "arrow " + (cls || "") }));
    var a = pts[pts.length - 2], b = pts[pts.length - 1];
    head(p, b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), headClass(cls));
  }

  /* -- reusable glyphs ------------------------------------------------------ */
  /* a stack of three documents, top one lined, optionally tagged */
  function pages(p, cx, cy, tag) {
    var k = g(p, {});
    for (var i = 2; i >= 0; i--) {
      var x = cx - 24 + i * 6, y = cy - 30 - i * 5;
      k.appendChild(el("rect", { "class": "page", x: x, y: y, width: 46, height: 56, rx: 3 }));
      if (i === 0) {
        [11, 19, 27].forEach(function (dy) {
          k.appendChild(el("line", { "class": "pageline", x1: x + 8, x2: x + 38, y1: y + dy, y2: y + dy }));
        });
        if (tag) {
          k.appendChild(el("rect", { "class": "tagbox" + (tag === "neg" ? " neg" : ""), x: x + 8, y: y + 37, width: 30, height: 12, rx: 3 }));
          txt(k, tag === "neg" ? "NEG" : "POS", { x: x + 23, y: y + 46, "class": "tag" });
        }
      }
    }
    return k;
  }
  /* a block of tiny pages — "a huge pile of text nobody labelled" */
  function corpus(p, x, y, cols, rows, cw, ch) {
    var k = g(p, {});
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      k.appendChild(el("rect", { "class": "page small", x: x + c * cw, y: y + r * ch, width: cw - 4, height: ch - 4, rx: 1.5 }));
    }
    return k;
  }
  /* a values matrix; kind "counts" (integers) or "embed" (decimals) */
  function matrix(p, cx, cy, kind, label) {
    var k = g(p, {}), rows = 4;
    var counts = [[1, 0, 2, 0, 1], [0, 1, 0, 0, 1], [1, 1, 0, 1, 0], [0, 0, 1, 0, 2]];
    var embed  = [[".21", "-.4", ".08"], ["-.1", ".33", ".51"], [".44", ".02", "-.2"], ["-.3", ".18", ".26"]];
    var vals = kind === "embed" ? embed : counts;
    var cols = vals[0].length, cw = kind === "embed" ? 26 : 16, ch = 14;
    var x0 = cx - cols * cw / 2, y0 = cy - rows * ch / 2 - 6;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var v = vals[r][c], hot = kind === "embed" ? false : !!v;
      k.appendChild(el("rect", { "class": "cell" + (hot ? " hot" : ""), x: x0 + c * cw, y: y0 + r * ch, width: cw, height: ch }));
      txt(k, v, { x: x0 + c * cw + cw / 2, y: y0 + r * ch + 10, "class": "celltext" });
    }
    if (label) txt(k, label, { x: cx, y: y0 + rows * ch + 16, "class": "lbl" });
    return k;
  }
  /* a titled card; text is wrapped to the card's inner width */
  function card(p, o) {
    var k = g(p, { "class": "cardg" }), pad = o.pad == null ? 14 : o.pad;
    k.appendChild(el("rect", { "class": "card " + (o.cls || ""), x: o.x, y: o.y, width: o.w, height: o.h, rx: 7 }));
    var y = o.y + pad + 4, isz = o.iconSize || 17;
    if (o.icon) icon(k, o.icon, o.x + o.w - pad - isz, o.y + pad - 3, isz, o.iconCls || (/tint/.test(o.cls || "") ? "accent" : ""));
    if (o.chip) {
      k.appendChild(el("rect", { "class": "chip " + (o.chipCls || ""), x: o.x + pad, y: o.y + pad - 2, width: o.chipW || 56, height: 15, rx: 3 }));
      txt(k, o.chip, { x: o.x + pad + 6, y: o.y + pad + 9.5, "class": "chiptext" });
      y = o.y + pad + 30;
    }
    if (o.title) {
      var h1 = wrap(k, o.title, { x: o.x + pad, y: y,
                                  width: o.w - 2 * pad - (o.icon ? isz + 8 : 0), lh: 12.5, "class": "cardtitle" });
      y += 12.5 * (+h1.getAttribute("data-lines") || 1) - 1;   /* a two line title pushes the sub down */
    }
    if (o.sub)   { wrap(k, o.sub,   { x: o.x + pad, y: y + 5, width: o.w - 2 * pad, lh: 11.5, "class": "cardsub" }); }
    return k;
  }
  /* the model: an ellipse, because in the old decks a model was always an oval */
  function oval(p, cx, cy, rx, ry, title, sub, ico) {
    var k = g(p, {}), lift = ico ? 8 : 0;
    k.appendChild(el("ellipse", { cx: cx, cy: cy, rx: rx, ry: ry, "class": "card tint" }));
    if (ico) icon(k, ico, cx - 9, cy - ry + 12, 18, "accent");
    wrap(k, title, { x: cx, y: (sub ? cy - 2 : cy + 4) + lift, width: rx * 1.7, lh: 12.5, "class": "cardtitle", anchor: "middle" });
    if (sub) wrap(k, sub, { x: cx, y: cy + 15 + lift, width: rx * 1.8, lh: 11.5, "class": "cardsub", anchor: "middle" });
    return k;
  }

  /* -- geometry: the numbers every variant shares --------------------------- */
  var G = {
    W: 1000, H: 500,
    BW: 120, BH: 104, BY: 100, MID: 152,
    SX: [125, 370, 615, 860],
    CX: [185, 430, 675, 920],
    ART: [307, 552, 797],
    FBY: 58, SLOT: 244, FLOOR: 424
  };

  var ICON = {   /* the same four paths as _extensions/cadc/components.lua */
    obtain:    '<path d="M12 3v11"/><path d="M8 10.5l4 3.5 4-3.5"/><path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16"/>',
    represent: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M3.5 9.5h17M3.5 15.5h17M9.5 3.5v17M15.5 3.5v17"/>',
    classify:  '<path d="M3 12h5"/><path d="M8 12l4-5h6"/><path d="M8 12l4 5h6"/><path d="M16 5l2 2-2 2"/><path d="M16 15l2 2-2 2"/>',
    validate:  '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none"/>'
  };
  /* -- the band icons -------------------------------------------------------
     The four step icons above come from the site's component library. These
     are drawn to match them: 24 unit box, stroke only, currentColor, round
     caps, the same weight. Anything that sits under the row gets one, so a
     dictionary, an algorithm and a prompt are recognisable at a glance and in
     the same visual language as the steps they feed. */
  var GLYPH = {
    /* a word list you wrote: a book */
    book:     '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
    /* counting hits: a hash */
    count:    '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
    /* fitted weights, not a written list: sliders */
    weights:  '<path d="M21 5h-7M10 5H3M21 12h-9M8 12H3M21 19h-5M12 19H3M14 3v4M8 10v4M16 17v4"/>',
    /* a model trained on data: a small network */
    net:      '<circle cx="5" cy="6" r="1.6"/><circle cx="5" cy="18" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="6" r="1.6"/><circle cx="19" cy="18" r="1.6"/><path d="M6.4 6.9 10.6 11.1M6.4 17.1 10.6 12.9M13.4 11.1 17.6 6.9M13.4 12.9 17.6 17.1"/>',
    /* words as positions: points in a space */
    space:    '<path d="M3 3v18h18"/><circle cx="8" cy="16" r="1.6"/><circle cx="12" cy="10" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="19" cy="6" r="1.6"/>',
    /* two meanings that sit together */
    near:     '<circle cx="9.5" cy="12" r="5.5"/><circle cx="14.5" cy="12" r="5.5"/>',
    /* a generative model */
    spark:    '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    /* the instruction you wrote: a prompt */
    prompt:   '<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="M6.5 9.5l3 2.5-3 2.5M12 15h5"/>',
    /* humans coded these */
    handcode: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14l2 2 4-4"/>',
    /* the half the model learns from */
    train:    '<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12.2V17c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4v-4.8"/>',
    /* the half nobody may look at */
    sealed:   '<rect x="4" y="10.5" width="16" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    /* where it goes wrong */
    warn:     '<path d="M10.3 3.9 1.9 18.1A2 2 0 0 0 3.6 21h16.8a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17.2h.01"/>'
  };
  /* icon(parent, "book", x, y, size, cls) — x/y is the top left corner */
  function icon(p, name, x, y, size, cls) {
    if (!GLYPH[name]) return null;
    var e = el("svg", { x: x, y: y, width: size, height: size, viewBox: "0 0 24 24",
                        "class": "ic " + (cls || ""), fill: "none", stroke: "currentColor",
                        "stroke-width": "1.75", "stroke-linecap": "round", "stroke-linejoin": "round" });
    e.innerHTML = GLYPH[name];
    p.appendChild(e);
    return e;
  }

  var NAMES = ["Obtain", "Represent", "Classify", "Validate"];
  var KEYS  = ["obtain", "represent", "classify", "validate"];

  /* -- build ----------------------------------------------------------------
     cfg: { week, title, notes[4], matrix:{kind,label}|null, docLabel, labLabel,
            labTag, gold:{title,sub}|null, scenes:[{cap:[k,body], …}] , render }
     Returns the handle the variant draws into.                              */
  function build(cfg) {
    var svg = document.getElementById("chart");
    var layer = {};
    ["fb", "src", "arr", "steps", "art", "slot", "mover"].forEach(function (k) {
      layer[k] = g(svg, { id: "L-" + k });
    });
    layer.mover.setAttribute("class", "mover");

    /* No title, no week chip, no caption, no click counter: the lecturer says
       all of that out loud, and on a projected slide every word of it competes
       with the figure. The file header comment carries what each click shows. */

    /* sources */
    [["APIs", G.MID - 38], ["Archives", G.MID], ["Websites", G.MID + 38]].forEach(function (s) {
      var k = g(layer.src, { "class": "src" });
      k.appendChild(el("rect", { x: 22, y: s[1] - 13, width: 82, height: 26, rx: 6 }));
      txt(k, s[0], { x: 63, y: s[1] + 4 });
    });
    arrow(layer.arr, 107, G.MID, G.SX[0] - 4, G.MID);

    /* the four boxes and the arrows between them */
    var steps = NAMES.map(function (name, i) {
      var x = G.SX[i], cx = x + G.BW / 2, k = g(layer.steps, { "class": "step fade dim" });
      k.appendChild(el("rect", { "class": "halo", x: x, y: G.BY, width: G.BW, height: G.BH, rx: 6 }));
      k.appendChild(el("rect", { "class": "box",  x: x, y: G.BY, width: G.BW, height: G.BH, rx: 6 }));
      txt(k, "0" + (i + 1), { x: cx, y: G.BY + 26, "class": "n", "text-anchor": "middle" });
      var ic = el("svg", { x: cx - 11, y: G.BY + 36, width: 22, height: 22, viewBox: "0 0 24 24",
                           fill: "none", stroke: "currentColor", "stroke-width": "1.75",
                           "stroke-linecap": "round", "stroke-linejoin": "round" });
      ic.innerHTML = ICON[KEYS[i]]; k.appendChild(ic);
      txt(k, name, { x: cx, y: G.BY + 82, "class": "name", "text-anchor": "middle" });
      if (i < 3) {
        arrow(layer.arr, x + G.BW + 2, G.MID, G.ART[i] - 46, G.MID);
        arrow(layer.arr, G.ART[i] + 46, G.MID, G.SX[i + 1] - 3, G.MID);
      }
      return k;
    });

    /* the three artefacts between the boxes */
    var art = {};
    art.docs = pages(layer.art, G.ART[0], G.MID);
    txt(art.docs, cfg.docLabel || "texts", { x: G.ART[0], y: G.MID + 46, "class": "lbl" });
    art.mat = g(layer.art, {});
    if (cfg.matrix !== null) {
      matrix(art.mat, G.ART[1], G.MID, (cfg.matrix && cfg.matrix.kind) || "counts",
             (cfg.matrix && cfg.matrix.label) || "texts × words");
    }
    art.lab = pages(layer.art, G.ART[2], G.MID, cfg.labTag || "pos");
    txt(art.lab, cfg.labLabel || "labelled texts", { x: G.ART[2], y: G.MID + 46, "class": "lbl" });

    /* the hand coded subset under step 04 — the thing 04 compares against */
    art.gold = g(layer.art, {});
    (function () {
      var gd = cfg.gold || {}, x = G.CX[3] - 23, y = G.BY + G.BH + 24;
      arrow(art.gold, G.CX[3], G.BY + G.BH + 2, G.CX[3], y - 4);
      art.gold.appendChild(el("rect", { "class": "page", x: x, y: y, width: 46, height: 46, rx: 3 }));
      txt(art.gold, "✓ ✓ ✗", { x: x + 23, y: y + 29, "class": "check",
                                "font-size": "13", "font-weight": "700", "text-anchor": "middle", fill: "var(--ink-2)" });
      wrap(art.gold, gd.title || "hand coded subset", { x: x + 23, y: y + 62, width: 104, lh: 12, "class": "lbl", anchor: "middle" });
    })();

    /* the feedback loop, routed OVER the row so the band below stays free */
    var fb = g(layer.fb, {});
    (function () {
      var t = G.FBY;
      fb.appendChild(el("path", { "class": "arrow back", d: "M " + G.CX[3] + " " + (G.BY - 2) + " L " + G.CX[3] + " " + t + " L " + G.CX[2] + " " + t }));
      arrow(fb, G.CX[2], t, G.CX[2], G.BY - 4, "back");
      fb.appendChild(el("path", { "class": "arrow back dashed", d: "M " + G.CX[2] + " " + t + " L " + G.CX[0] + " " + t }));
      arrow(fb, G.CX[1], t, G.CX[1], G.BY - 4, "back dashed");
      arrow(fb, G.CX[0], t, G.CX[0], G.BY - 4, "back dashed");
      txt(fb, cfg.loopLabel || "if the labels are not good enough: change the model, or go further back",
          { x: (G.CX[0] + G.CX[3]) / 2, y: t - 10, "class": "lbl" });
    })();

    [art.docs, art.mat, art.lab, art.gold, fb].forEach(function (n) { n.setAttribute("class", "fade hid"); });

    /* -- the handle the variant script drives ------------------------------ */
    var P = {
      svg: svg, layer: layer, G: G, step: steps, art: art, fb: fb,
      el: el, g: g, txt: txt, wrap: wrap, clear: clear,
      arrow: arrow, elbow: elbow, pages: pages, corpus: corpus, matrix: matrix,
      card: card, oval: oval, icon: icon,

      /* visibility: show(node, boolean); rise(node) makes it slide up on entry */
      show: function (n, on, rise) {
        n.setAttribute("class", "fade" + (rise ? " rise" : "") + (on ? "" : " hid"));
      },
      /* spec is a 4 array of "", "on", "accent", "dim", "off" */
      setSteps: function (spec) {
        steps.forEach(function (n, i) { n.setAttribute("class", "step fade " + (spec[i] || "")); });
      },
      /* a document flying from one point to another: the batch running */
      travel: function (x1, y1, x2, y2, draw) {
        clear(layer.mover);
        layer.mover.style.transition = "none";
        layer.mover.style.transform = "translate(0px,0px)";
        var k = g(layer.mover, {});
        (draw || function (n) {
          n.appendChild(el("rect", { "class": "page", x: x1 - 14, y: y1 - 18, width: 28, height: 36, rx: 2 }));
        })(k);
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          layer.mover.style.transition = "";
          layer.mover.style.transform = "translate(" + (x2 - x1) + "px," + (y2 - y1) + "px)";
          setTimeout(function () { clear(layer.mover); }, 900);
        }); });
      }
    };
    return P;
  }

  /* -- the click machine ----------------------------------------------------
     run(P, n, render): render(state) on click, on Enter/space, and on #N.   */
  function run(P, n, render) {
    var tick = txt(P.svg, "", { x: 968, y: 420, "class": "tick", "text-anchor": "end" });
    var state = clampHash(n);
    function clampHash(max) {
      var v = parseInt((location.hash || "").slice(1), 10);
      return Math.max(0, Math.min(max - 1, isNaN(v) ? 0 : v));
    }
    function draw() { render(state); tick.textContent = (state + 1) + " / " + n; }
    function advance() { if (state >= n - 1) return; state += 1; draw(); }
    draw();
    window.addEventListener("hashchange", function () { state = clampHash(n); draw(); });
    document.body.addEventListener("click", advance);
    document.body.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advance(); }
      if (e.key === "ArrowRight") advance();
      if (e.key === "ArrowLeft" && state > 0) { state -= 1; draw(); }
    });
  }

  root.CADCPipeline = { build: build, run: run, G: G };
})(window);
