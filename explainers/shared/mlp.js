/* ===========================================================================
   A very small multilayer perceptron, shared by the two week 3 lecture
   explainers (explainers/learning — the cold open — and explainers/network —
   the same network taken apart). Bag-of-words inputs, one hidden layer of
   tanh units, one logistic output; full-batch gradient descent on the
   cross-entropy. Everything is computed here, in the browser, on load: the
   whole training trajectory is recorded so a slide can scrub to any epoch.

   The corpus is twenty short reviews written for this purpose (below), with
   a vocabulary of fifteen content words. It is stacked so that a linear
   model CANNOT fit it: "Not boring at all" is positive and "Not good at all"
   is negative, which no single weight on "not" can produce. A hidden unit
   can, by firing on "not" together with "good" — that is what the slides
   show it learning. Seeded PRNG, so the run is the same on every load and
   #N bookmarks land on the same picture.
   =========================================================================== */
(function (root) {
  "use strict";

  var REVIEWS = [
    ["Good, really good.",        1], ["Not good at all.",      0],
    ["A great cast.",             1], ["Not funny.",            0],
    ["Great fun.",                1], ["Dull and slow.",        0],
    ["Brilliant and funny.",      1], ["Boring.",               0],
    ["Funny and warm.",           1], ["A boring, slow mess.",  0],
    ["Loved every minute.",       1], ["Never good.",           0],
    ["Not boring at all.",        1], ["Not great, not funny.", 0],
    ["Never dull.",               1], ["Slow and dull.",        0],
    ["Good fun, great cast.",     1], ["A mess.",               0],
    ["Warm and brilliant.",       1], ["Not brilliant.",        0]
  ];
  var VOCAB = ["good", "great", "fun", "funny", "brilliant", "warm", "loved", "cast",
               "not", "never", "boring", "dull", "slow", "mess", "really"];

  function tokens(s) { return s.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean); }
  function featurise(s) {
    var t = tokens(s), x = VOCAB.map(function () { return 0; });
    t.forEach(function (w) { var i = VOCAB.indexOf(w); if (i >= 0) x[i] += 1; });
    return x;
  }
  var X = REVIEWS.map(function (r) { return featurise(r[0]); });
  var Y = REVIEWS.map(function (r) { return r[1]; });

  /* mulberry32: a seeded PRNG so the run is reproducible */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function init(H, seed) {
    var r = rng(seed), s = 0.9;
    var W1 = [], b1 = [], W2 = [], b2 = (r() * 2 - 1) * s;
    for (var h = 0; h < H; h++) {
      W1.push(VOCAB.map(function () { return (r() * 2 - 1) * s; }));
      b1.push((r() * 2 - 1) * s);
      W2.push((r() * 2 - 1) * s);
    }
    return { W1: W1, b1: b1, W2: W2, b2: b2 };
  }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  /* forward pass for one input; returns everything the drawings need */
  function forward(p, x) {
    var H = p.W1.length, z1 = [], a1 = [];
    for (var h = 0; h < H; h++) {
      var s = p.b1[h];
      for (var i = 0; i < x.length; i++) s += p.W1[h][i] * x[i];
      z1.push(s); a1.push(Math.tanh(s));
    }
    var z2 = p.b2;
    for (h = 0; h < H; h++) z2 += p.W2[h] * a1[h];
    return { z1: z1, a1: a1, z2: z2, out: sigmoid(z2) };
  }

  /* gradient of the cross-entropy for one example */
  function gradOne(p, x, y) {
    var f = forward(p, x), H = p.W1.length;
    var d2 = f.out - y;                                   // dL/dz2
    var gW2 = [], gb2 = d2, gW1 = [], gb1 = [];
    for (var h = 0; h < H; h++) {
      gW2.push(d2 * f.a1[h]);
      var d1 = d2 * p.W2[h] * (1 - f.a1[h] * f.a1[h]);    // back through tanh
      gb1.push(d1);
      gW1.push(x.map(function (xi) { return d1 * xi; }));
    }
    return { gW1: gW1, gb1: gb1, gW2: gW2, gb2: gb2, out: f.out,
             loss: -(y * Math.log(f.out + 1e-9) + (1 - y) * Math.log(1 - f.out + 1e-9)) };
  }

  function clone(p) {
    return { W1: p.W1.map(function (r) { return r.slice(); }), b1: p.b1.slice(), W2: p.W2.slice(), b2: p.b2 };
  }

  /* full-batch gradient descent; records a snapshot per epoch */
  function train(opts) {
    opts = opts || {};
    var H = opts.hidden || 4, lr = opts.lr || 0.6, epochs = opts.epochs || 250, seed = opts.seed || 7;
    var p = init(H, seed), N = X.length, hist = [];
    function snapshot(ep) {
      var outs = X.map(function (x) { return forward(p, x).out; });
      var loss = 0, right = 0;
      outs.forEach(function (o, i) {
        loss += -(Y[i] * Math.log(o + 1e-9) + (1 - Y[i]) * Math.log(1 - o + 1e-9));
        if ((o >= 0.5 ? 1 : 0) === Y[i]) right++;
      });
      hist.push({ epoch: ep, params: clone(p), outs: outs, loss: loss / N, right: right });
    }
    snapshot(0);
    for (var ep = 1; ep <= epochs; ep++) {
      var acc = null;
      for (var n = 0; n < N; n++) {
        var g = gradOne(p, X[n], Y[n]);
        if (!acc) acc = g; else {
          for (var h = 0; h < H; h++) {
            acc.gW2[h] += g.gW2[h]; acc.gb1[h] += g.gb1[h];
            for (var i = 0; i < VOCAB.length; i++) acc.gW1[h][i] += g.gW1[h][i];
          }
          acc.gb2 += g.gb2;
        }
      }
      for (h = 0; h < H; h++) {
        p.W2[h] -= lr * acc.gW2[h] / N; p.b1[h] -= lr * acc.gb1[h] / N;
        for (i = 0; i < VOCAB.length; i++) p.W1[h][i] -= lr * acc.gW1[h][i] / N;
      }
      p.b2 -= lr * acc.gb2 / N;
      snapshot(ep);
    }
    return hist;
  }

  /* which hidden unit does most to push one review's verdict the right way */
  function decisiveUnit(p, x, y) {
    var f = forward(p, x), best = 0, bestv = -Infinity;
    for (var h = 0; h < p.W1.length; h++) {
      var contrib = p.W2[h] * f.a1[h] * (y === 1 ? 1 : -1);   // toward the true label
      if (contrib > bestv) { bestv = contrib; best = h; }
    }
    return best;
  }

  root.CADCMLP = { REVIEWS: REVIEWS, VOCAB: VOCAB, X: X, Y: Y, featurise: featurise,
                   train: train, forward: forward, gradOne: gradOne, decisiveUnit: decisiveUnit, rng: rng };
})(typeof window !== "undefined" ? window : module.exports);
