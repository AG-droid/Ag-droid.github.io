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

document.getElementById("year").textContent = new Date().getFullYear();
