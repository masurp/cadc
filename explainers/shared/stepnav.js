/* ===========================================================================
   Step navigation for the click-through lecture explainers: forward AND back.

     CADCStepNav.attach({ max, go: function (n, from) {}, hud: <svg g>, x, y })

   Forward: a click anywhere, →, ↓, Page Down, space, Enter.
   Back:    ←, ↑, Page Up, Backspace, or the ‹ beside the step counter (the ›
            steps forward). #N in the address opens step N.
   At the first or last step the keys hand over to the deck the explainer sits
   in (Reveal, same origin), so a presenter's clicker runs through the explainer
   and on to the next slide. A click never does that: the slide PDFs are made
   by clicking (_scripts/build_slide_pdfs.py), and the last click must change
   nothing.
   =========================================================================== */
(function (root) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function el(t, a) { var e = document.createElementNS(NS, t); for (var k in a) if (a[k] != null) e.setAttribute(k, a[k]); return e; }

  function attach(o) {
    var max = o.max, state = 0;
    function fromHash() { return Math.max(0, Math.min(max, parseInt((location.hash || "").slice(1), 10) || 0)); }

    /* the counter: ‹  3 / 8  › */
    var label = null, back = null, fwd = null;
    if (o.hud) {
      var x = o.x, y = o.y, cls = o.cls || "step";
      fwd = el("text", { x: x, y: y, "class": cls + " stepnav", "text-anchor": "end" }); fwd.textContent = "›";
      label = el("text", { x: x - 14, y: y, "class": cls, "text-anchor": "end" });
      back = el("text", { "class": cls + " stepnav", "text-anchor": "end" }); back.textContent = "‹";
      [back, label, fwd].forEach(function (t) { o.hud.appendChild(t); });
      /* generous, invisible targets: the arrows themselves are small */
      var hb = el("rect", { y: y - 16, width: 26, height: 22, fill: "transparent", "class": "stepnav-hit" });
      var hf = el("rect", { x: x - 18, y: y - 16, width: 26, height: 22, fill: "transparent", "class": "stepnav-hit" });
      o.hud.appendChild(hb); o.hud.appendChild(hf);
      hb.addEventListener("click", function (e) { e.stopPropagation(); go(state - 1); });
      back.addEventListener("click", function (e) { e.stopPropagation(); go(state - 1); });
      hf.addEventListener("click", function (e) { e.stopPropagation(); go(state + 1); });
      fwd.addEventListener("click", function (e) { e.stopPropagation(); go(state + 1); });
      var place = function () {
        var w = typeof label.getComputedTextLength === "function" ? label.getComputedTextLength() : 30;
        back.setAttribute("x", x - 14 - w - 10); back.setAttribute("y", y);
        hb.setAttribute("x", x - 14 - w - 26);
      };
      o._place = place;
    }

    function go(n, quiet) {
      n = Math.max(0, Math.min(max, n));
      if (n === state && !quiet) return;
      var from = state; state = n;
      o.go(state, from);
      if (label) {
        label.textContent = (state + 1) + " / " + (max + 1);
        back.style.opacity = state > 0 ? "" : ".25"; fwd.style.opacity = state < max ? "" : ".25";
        o._place();
      }
    }
    /* hand the key over to the deck around the explainer, if there is one */
    function deck(dir) {
      try {
        var R = root.parent && root.parent !== root && root.parent.Reveal;
        if (R) { root.parent.focus(); if (dir > 0) R.next(); else R.prev(); }
      } catch (err) { /* another origin, or no deck: nothing to hand over to */ }
    }
    function next(fromKey) { if (state < max) go(state + 1); else if (fromKey) deck(1); }
    function prev(fromKey) { if (state > 0) go(state - 1); else if (fromKey) deck(-1); }

    document.body.addEventListener("click", function () { next(false); });
    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key;
      if (k === "ArrowRight" || k === "ArrowDown" || k === "PageDown" || k === " " || k === "Enter") { e.preventDefault(); next(true); }
      else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp" || k === "Backspace") { e.preventDefault(); prev(true); }
    });
    root.addEventListener("hashchange", function () { go(fromHash()); });

    state = fromHash();
    go(state, true);
    return { go: go, get: function () { return state; } };
  }

  root.CADCStepNav = { attach: attach };
})(window);
