// Theme toggle (remembers choice)
(function () {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = saved || (prefersDark ? "dark" : "light");

  document.querySelector(".theme-toggle").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  });
})();

// Nav border on scroll + active link
(function () {
  const nav = document.querySelector(".nav");
  const links = [...document.querySelectorAll(".nav__links a")];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href")));

  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 10);
    const y = window.scrollY + window.innerHeight / 3;
    let current = -1;
    sections.forEach((s, i) => { if (s && s.offsetTop <= y) current = i; });
    links.forEach((a, i) => a.classList.toggle("is-active", i === current));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

// Reveal elements as they enter the viewport
(function () {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  items.forEach((el) => io.observe(el));
})();

// Hero background: a quiet dot field that drifts toward the cursor
(function () {
  const canvas = document.querySelector(".hero__field");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GAP = 28;
  let w, h, dpr, dots = [];
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth; h = canvas.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = [];
    for (let x = GAP / 2; x < w; x += GAP)
      for (let y = GAP / 2; y < h; y += GAP) dots.push({ x, y });
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    const style = getComputedStyle(document.documentElement);
    const base = style.getPropertyValue("--line").trim();
    const accent = style.getPropertyValue("--accent").trim();
    for (const d of dots) {
      const dx = d.x - mouse.x, dy = d.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      const near = Math.max(0, 1 - dist / 160);
      const wave = reduced ? 0 : Math.sin(d.x * 0.02 + d.y * 0.015 + t * 0.0008) * 0.5 + 0.5;
      const r = 1 + wave * 0.6 + near * 1.8;
      ctx.beginPath();
      ctx.arc(d.x - dx * near * 0.12, d.y - dy * near * 0.12, r, 0, Math.PI * 2);
      ctx.fillStyle = near > 0.05 ? accent : base;
      ctx.globalAlpha = near > 0.05 ? 0.35 + near * 0.65 : 1;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduced) requestAnimationFrame(draw);
  }

  canvas.parentElement.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    if (reduced) draw(0);
  });
  canvas.parentElement.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

// Typeset equations with KaTeX (plain-text fallback stays if the CDN fails)
(function () {
  if (!window.katex) return;
  document.querySelectorAll(".tex, .tex-i").forEach((el) => {
    try {
      katex.render(el.dataset.tex, el, { displayMode: el.classList.contains("tex"), throwOnError: false });
    } catch (e) {}
  });
})();

// Hero graphic: a small liquid time-constant circuit, simulated live.
// Each neuron follows dx/dt = -(1/tau + f) x + f A, with f driven by incoming spikes.
(function () {
  const canvas = document.querySelector(".circuit");
  if (!canvas) return;
  let ctx, w, h;

  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const layout = [[5, 0.22], [4, 0.41], [3, 0.59], [2, 0.75]];
  const nodes = [];
  const layers = layout.map(([count, y], li) =>
    Array.from({ length: count }, (_, i) => {
      const node = {
        layer: li, nx: 0.5 + (i - (count - 1) / 2) * (0.6 / Math.max(count - 1, 1)) * (li === 3 ? 0.5 : 1),
        ny: y, x: rand() * 0.3, input: 0, tau: 0.6 + rand() * 0.8, out: [],
        phase: rand() * Math.PI * 2, freq: 0.4 + rand() * 0.9,
      };
      nodes.push(node);
      return node;
    })
  );
  const edges = [];
  const connect = (a, b) => { const e = { a, b, bend: (rand() - 0.5) * 0.12 }; edges.push(e); a.out.push(e); };
  for (let l = 0; l < layers.length - 1; l++) {
    layers[l].forEach((a) => {
      const targets = [...layers[l + 1]].sort(() => rand() - 0.5).slice(0, l === 2 ? 2 : 2);
      targets.forEach((b) => connect(a, b));
    });
  }
  connect(layers[2][0], layers[2][2]);
  connect(layers[2][2], layers[2][0]);

  const pulses = [];
  const history = layers[3].map(() => []);
  const HIST = 120;

  const pos = (n) => [n.nx * w, n.ny * h];
  function bezier(e, t) {
    const [x1, y1] = pos(e.a), [x2, y2] = pos(e.b);
    const cx = (x1 + x2) / 2 + e.bend * w + (e.a.layer === e.b.layer ? 0 : 0);
    const cy = (y1 + y2) / 2 + (e.a.layer === e.b.layer ? -0.08 * h : 0);
    const u = 1 - t;
    return [u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2, cx, cy];
  }

  function step(dt, time) {
    for (const n of nodes) {
      if (n.layer === 0) n.input = 0.5 + 0.5 * Math.sin(time * n.freq + n.phase);
      const f = 1 / (1 + Math.exp(-(4 * n.input - 2)));
      n.x += (-(1 / n.tau + f) * n.x + f) * dt;
      n.input *= Math.exp(-dt * 2.5);
      if (n.out.length && rand() < n.x * n.x * dt * 2.2) {
        pulses.push({ e: n.out[Math.floor(rand() * n.out.length)], t: 0 });
      }
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += dt * 0.9;
      if (p.t >= 1) { p.e.b.input += 0.9; pulses.splice(i, 1); }
    }
    layers[3].forEach((n, i) => { history[i].push(n.x); if (history[i].length > HIST) history[i].shift(); });
  }

  function draw() {
    const accent = cssVar("--accent"), muted = cssVar("--muted"), surface = cssVar("--surface");
    ctx.clearRect(0, 0, w, h);

    ctx.lineWidth = 1;
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.28;
    for (const e of edges) {
      const [x1, y1] = pos(e.a), [x2, y2] = pos(e.b);
      const [, , cx, cy] = bezier(e, 0);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
    }

    ctx.fillStyle = accent;
    for (const p of pulses) {
      const [x, y] = bezier(p.e, p.t);
      ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
    }

    for (const n of nodes) {
      const [x, y] = pos(n);
      const r = n.layer === 3 ? 9 : n.layer === 2 ? 8 : 6.5;
      ctx.globalAlpha = 1;
      ctx.fillStyle = surface; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.15 + 0.85 * Math.min(n.x, 1);
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // motor neuron output traces
    const top = 0.82 * h, span = 0.1 * h, left = 0.14 * w, width = 0.72 * w;
    const lo = Math.min(...history.flat()), hi = Math.max(...history.flat());
    const norm = (v) => (hi - lo < 1e-3 ? 0.5 : (v - lo) / (hi - lo));
    ctx.globalAlpha = 0.3; ctx.strokeStyle = muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, top + span); ctx.lineTo(left + width, top + span); ctx.stroke();
    history.forEach((hist, i) => {
      ctx.globalAlpha = i === 0 ? 1 : 0.45;
      ctx.strokeStyle = accent; ctx.lineWidth = 1.6;
      ctx.beginPath();
      hist.forEach((v, k) => {
        const px = left + (k / (HIST - 1)) * width, py = top + span - norm(v) * span;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  let time = 0, last = 0, visible = true;
  function frame(now) {
    const dt = Math.min((now - last) / 1000 || 0, 0.05);
    last = now;
    if (visible) { time += dt; step(dt, time); draw(); }
    requestAnimationFrame(frame);
  }

  function resize() { ({ ctx, w, h } = fitCanvas(canvas)); if (reducedMotion) draw(); }
  window.addEventListener("resize", resize);
  resize();
  // warm up so the first frame already looks alive
  for (let i = 0; i < 240; i++) { time += 1 / 60; step(1 / 60, time); }

  if (reducedMotion) {
    draw();
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  } else {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    }
    requestAnimationFrame(frame);
  }
})();

// Fig. 1: step response of a liquid neuron vs a fixed time-constant neuron
(function () {
  const canvas = document.querySelector(".response");
  if (!canvas) return;
  const slider = document.getElementById("input-strength");
  const output = document.querySelector('output[for="input-strength"]');
  const TAU = 1, T_END = 5, T_STEP = 0.4;
  let ctx, w, h;

  // closed-form solutions for a step input at T_STEP (A = 1), normalised to their steady state
  const liquid = (t, f) => (t < T_STEP ? 0 : 1 - Math.exp(-(1 / TAU + f) * (t - T_STEP)));
  const fixed = (t) => (t < T_STEP ? 0 : 1 - Math.exp(-(t - T_STEP) / TAU));

  function draw() {
    const I = parseFloat(slider.value);
    const f = 6 * I;
    output.textContent = I.toFixed(2);
    const accent = cssVar("--accent"), muted = cssVar("--muted"), line = cssVar("--line"), text = cssVar("--text");
    const pad = { l: 38, r: 12, t: 14, b: 30 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    const X = (t) => pad.l + (t / T_END) * pw, Y = (v) => pad.t + (1 - v) * ph;
    ctx.clearRect(0, 0, w, h);
    ctx.font = '500 11px "IBM Plex Mono", monospace';

    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted;
    [0, 0.5, 1].forEach((v) => {
      ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(w - pad.r, Y(v)); ctx.stroke();
      ctx.textAlign = "right"; ctx.fillText(v.toFixed(1), pad.l - 8, Y(v) + 4);
    });
    ctx.textAlign = "center";
    for (let t = 0; t <= T_END; t++) ctx.fillText(t, X(t), h - 10);
    ctx.textAlign = "right"; ctx.fillText("t / τ", w - pad.r, Y(0) - 8);

    const curve = (fn, color, dashed, width) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dashed ? [5, 5] : []);
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const t = (i / 200) * T_END;
        i ? ctx.lineTo(X(t), Y(fn(t))) : ctx.moveTo(X(t), Y(fn(t)));
      }
      ctx.stroke(); ctx.setLineDash([]);
    };
    curve(fixed, muted, true, 1.5);
    curve((t) => liquid(t, f), accent, false, 2.5);

    // mark the liquid neuron's effective time constant (63% rise)
    const tSys = TAU / (1 + TAU * f);
    const mx = X(T_STEP + tSys), my = Y(1 - Math.exp(-1));
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = text; ctx.textAlign = "left";
    ctx.fillText("τ_sys = " + tSys.toFixed(2) + "τ", mx + 10, my + 14);
  }

  function resize() { ({ ctx, w, h } = fitCanvas(canvas)); draw(); }
  slider.addEventListener("input", draw);
  window.addEventListener("resize", resize);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (document.fonts) document.fonts.ready.then(draw);
  resize();
})();

document.getElementById("year").textContent = new Date().getFullYear();
