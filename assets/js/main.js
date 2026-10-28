// ===================== File system =====================
// Everything on the "computer". Docs point at <template> ids in index.html.
const FS = {
  home:          { name: "Anmol", type: "folder", glyph: "home", children: ["about", "experience", "research", "projects", "cv", "contact", "terminal"] },
  about:         { name: "About Me.txt", type: "doc", tpl: "doc-about", w: 600, h: 560 },

  experience:    { name: "Experience", type: "folder", glyph: "experience", children: ["experience-md", "oxford", "leadership"] },
  "experience-md": { name: "Experience.md", type: "doc", tpl: "doc-experience", w: 680, h: 640 },
  oxford:        { name: "Oxford Dynamics", type: "folder", glyph: "oxford", children: ["oxford-md", "od-photos"] },
  "oxford-md":   { name: "Oxford Dynamics.md", type: "doc", tpl: "doc-oxford", w: 640, h: 620 },
  "od-photos":   { name: "Photos", type: "folder", glyph: "photos", children: ["img-team", "img-arm", "img-field", "img-sim"] },
  "img-team":    { name: "team-harwell.jpg", type: "image", src: "assets/img/oxford-dynamics/team-harwell.jpg", caption: "The robotics team at Harwell" },
  "img-arm":     { name: "ur7e-arm.jpg", type: "image", src: "assets/img/oxford-dynamics/robot-arm.jpg", caption: "The 6-DoF UR7e arm", w: 480, h: 620 },
  "img-field":   { name: "field-testing.jpg", type: "image", src: "assets/img/oxford-dynamics/field-robot.jpg", caption: "Field testing" },
  "img-sim":     { name: "isaac-sim.jpg", type: "image", src: "assets/img/oxford-dynamics/isaac-sim.jpg", caption: "NVIDIA Isaac Sim" },
  leadership:    { name: "Leadership", type: "folder", glyph: "leadership", children: ["leadership-md", "lead-photos"] },
  "leadership-md": { name: "Leadership.md", type: "doc", tpl: "doc-leadership", w: 640, h: 600 },
  "lead-photos": { name: "Photos", type: "folder", glyph: "photos", children: ["img-amazon", "img-ibm"] },
  "img-amazon":  { name: "amazon-fireside.jpg", type: "image", src: "assets/img/events/amazon-fireside.jpg", caption: "Day 1: hosting the Amazon fireside chat" },
  "img-ibm":     { name: "ibm-session.jpg", type: "image", src: "assets/img/events/ibm-session.jpg", caption: "Day 2: AI and enterprise computing with IBM" },

  research:      { name: "Research", type: "folder", glyph: "research", children: ["lnn", "reading"] },
  lnn:           { name: "Liquid Neural Networks.md", type: "doc", tpl: "doc-research", w: 660, h: 640 },
  reading:       { name: "Reading List.txt", type: "doc", tpl: "doc-reading", w: 560, h: 340 },

  projects:      { name: "Projects", type: "folder", glyph: "projects", children: ["p-quantbox", "p-react", "p-invaders", "p-github"] },
  "p-quantbox":  { name: "QuantBox", type: "link", href: "https://github.com/AG-droid/QuantBox" },
  "p-react":     { name: "React Experiments", type: "link", href: "https://github.com/AG-droid/React-JS" },
  "p-invaders":  { name: "Space Invaders", type: "link", href: "https://github.com/AG-droid/Projects/blob/master/Space_Invaders/Space_invaders.py" },
  "p-github":    { name: "GitHub Profile", type: "link", href: "https://github.com/AG-droid" },

  cv:            { name: "CV", type: "folder", glyph: "cv", children: ["cv-pdf"] },
  "cv-pdf":      { name: "Anmol_Goyal_CV.pdf", type: "pdf", src: "assets/cv/Anmol_Goyal_CV.pdf", w: 760, h: 720 },

  contact:       { name: "Contact", type: "folder", glyph: "contact", children: ["contact-md", "c-email", "c-linkedin", "c-github"] },
  "contact-md":  { name: "Contact.md", type: "doc", tpl: "doc-contact", w: 540, h: 320 },
  "c-email":     { name: "Email", type: "compose", w: 560, h: 480 },
  "c-linkedin":  { name: "LinkedIn", type: "link", href: "https://www.linkedin.com/in/anmolxgoyal/" },
  "c-github":    { name: "GitHub", type: "link", href: "https://github.com/AG-droid" },

  photos:        { name: "Photos", type: "photos", w: 720, h: 520 },
  terminal:      { name: "Terminal", type: "terminal", w: 640, h: 420 },
};
const DESKTOP = FS.home.children;
const DOCK = ["home", "experience", "research", "photos", "terminal", "|", "cv", "contact"];
const EMAIL = "anmol.goyal@kcl.ac.uk";

// Parent links, so windows can show where they are ("Experience / Oxford Dynamics")
const PARENT = {};
Object.keys(FS).forEach((k) => (FS[k].children || []).forEach((c) => { if (k !== "home") PARENT[c] = k; }));
const pathOf = (id) => (PARENT[id] ? pathOf(PARENT[id]) + " / " : "") + FS[id].name;

const $ = (sel, root = document) => root.querySelector(sel);
const mobile = window.matchMedia("(max-width: 700px)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ===================== Icons =====================
// Small symbols drawn on each folder so they're easy to tell apart
const GLYPHS = {
  home: '<path d="M23 40l9-7 9 7"/><path d="M26 38v9h12v-9"/>',
  experience: '<rect x="22" y="33" width="20" height="14" rx="2"/><path d="M28 33v-3h8v3M22 39h20"/>',
  contact: '<rect x="22" y="32" width="20" height="14" rx="2"/><path d="M23 33l9 7 9-7"/>',
  photos: '<rect x="22" y="31" width="20" height="16" rx="2"/><path d="M23 45l6-6 4 4 3-3 5 5"/><circle cx="37" cy="35.5" r="1.5"/>',
  research: '<path d="M29 31v6l-6 10h18l-6-10v-6M27 31h10"/>',
  oxford: '<path d="M22 48h14M27 48v-5l6-6 6 4"/><circle cx="33" cy="37" r="1.5"/><path d="M39 41l3-3"/>',
  leadership: '<rect x="29" y="30" width="6" height="11" rx="3"/><path d="M25 38a7 7 0 0 0 14 0M32 45v3"/>',
  projects: '<path d="M27 33l-6 6 6 6M37 33l6 6-6 6"/>',
  cv: '<circle cx="32" cy="35" r="4"/><path d="M24 48a8 7 0 0 1 16 0"/>',
};
function iconArt(id) {
  const item = FS[id];
  switch (item.type) {
    case "folder":
      return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 14a4 4 0 0 1 4-4h14l5 5h25a4 4 0 0 1 4 4v4H6z" fill="#2c4be0"/><rect x="6" y="20" width="52" height="36" rx="4" fill="#4d6bff"/><rect x="6" y="20" width="52" height="5" rx="2" fill="#6f88ff"/><g fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[item.glyph] || ""}</g></svg>`;
    case "doc":
    case "pdf": {
      const ext = item.name.split(".").pop().toUpperCase();
      const band = item.type === "pdf" ? "#e5484d" : "#3b5bff";
      return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 4h26l12 12v42a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#fff"/><path d="M40 4v10a2 2 0 0 0 2 2h10z" fill="#d8dbe3"/><g stroke="#c4c8d2" stroke-width="2"><path d="M19 24h26M19 30h26M19 36h20"/></g><rect x="16" y="44" width="32" height="11" rx="2" fill="${band}"/><text x="32" y="52.5" font-family="system-ui,sans-serif" font-size="8" font-weight="700" fill="#fff" text-anchor="middle">${ext}</text></svg>`;
    }
    case "image":
      return `<img src="${item.src}" alt="" loading="lazy">`;
    case "compose":
      return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="8" width="48" height="48" rx="12" fill="#3b5bff"/><rect x="17" y="22" width="30" height="21" rx="3" fill="none" stroke="#fff" stroke-width="3"/><path d="M18 24l14 10 14-10" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;
    case "link":
      return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="8" width="48" height="48" rx="12" fill="#fff"/><path d="M26 38l14-14M28 24h12v12" fill="none" stroke="#3b5bff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    case "terminal":
      return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="8" width="52" height="48" rx="11" fill="#0d1117" stroke="#30363d"/><path d="M17 24l8 7-8 7" fill="none" stroke="#3fb950" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 39h14" stroke="#c9d1d9" stroke-width="3.5" stroke-linecap="round"/></svg>`;
    case "photos":
      return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="8" width="52" height="48" rx="11" fill="#fff"/><g opacity=".9"><circle cx="24" cy="25" r="8" fill="#f59e0b"/><circle cx="40" cy="25" r="8" fill="#ef4444"/><circle cx="24" cy="39" r="8" fill="#22c55e"/><circle cx="40" cy="39" r="8" fill="#3b5bff"/></g></svg>`;
  }
  return "";
}

function iconButton(id, cls = "icon") {
  const item = FS[id];
  let b;
  if (item.type === "link") {
    b = document.createElement("a");
    b.href = item.href;
    b.target = "_blank";
    b.rel = "noopener";
  } else {
    b = document.createElement("button");
    b.type = "button";
    b.dataset.open = id;
  }
  b.className = cls;
  b.innerHTML = `<span class="icon__art">${iconArt(id)}</span><span class="icon__label"></span>`;
  $(".icon__label", b).textContent = item.name;
  if (item.type === "link") b.title = item.href;
  return b;
}

// ===================== Window manager =====================
const wins = new Map();
let zTop = 10;
let cascade = 0;

const SIZES = { compose: [560, 480], folder: [560, 360], doc: [620, 560], image: [720, 520], photos: [720, 520], terminal: [640, 420], pdf: [760, 640], contact: [520, 300] };

function open(id) {
  const item = FS[id];
  if (!item) return;
  if (item.type === "link") { window.open(item.href, "_blank", "noopener"); return; }
  if (wins.has(id)) { const w = wins.get(id); w.el.hidden = false; focus(id); return; }

  const el = document.createElement("section");
  el.className = "win";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", item.name);
  el.innerHTML = `
    <header class="win__bar">
      <div class="win__btns">
        <button class="win__btn win__btn--close" type="button" aria-label="Close"></button>
        <button class="win__btn win__btn--min" type="button" aria-label="Minimise"></button>
        <button class="win__btn win__btn--max" type="button" aria-label="Maximise"></button>
      </div>
      <div class="win__title">${item.type === "image" ? `<img src="${item.src}" alt="">` : iconArt(id).replace("<img ", '<img loading="eager" ')}<span></span></div>
    </header>
    <div class="win__body"></div>`;
  $(".win__title span", el).textContent = pathOf(id);

  // size + position, cascading so windows don't stack exactly
  const [dw, dh] = SIZES[item.type] || [600, 480];
  el.setAttribute("aria-label", pathOf(id));
  const vw = window.innerWidth, vh = window.innerHeight;
  const menubar = 30, dock = 92;
  const w = Math.min(item.w || dw, vw - 32);
  const h = Math.min(item.h || dh, vh - menubar - dock - 24);
  const left = Math.max(16, Math.min(vw - w - 16, (vw - w) / 2 + 60 + cascade * 28));
  const top = Math.max(menubar + 12, Math.min(vh - dock - h - 8, menubar + 40 + cascade * 28));
  cascade = (cascade + 1) % 6;
  Object.assign(el.style, { width: w + "px", height: h + "px", left: left + "px", top: top + "px" });

  $("#windows").append(el);
  wins.set(id, { el, item });
  render(id, $(".win__body", el));

  $(".win__btn--close", el).addEventListener("click", () => close(id));
  $(".win__btn--min", el).addEventListener("click", () => minimise(id));
  $(".win__btn--max", el).addEventListener("click", () => el.classList.toggle("is-max"));
  $(".win__bar", el).addEventListener("dblclick", (e) => { if (!e.target.closest(".win__btns")) el.classList.toggle("is-max"); });
  el.addEventListener("pointerdown", () => focus(id), true);
  makeDraggable(el);
  focus(id);
}

function focus(id) {
  const w = wins.get(id);
  if (!w) return;
  w.el.style.zIndex = ++zTop;
  wins.forEach((o, key) => o.el.classList.toggle("is-inactive", key !== id));
  $("#active-title").textContent = w.item.name;
  if (w.focusInput) w.focusInput();
  syncDock();
}

function topmost() {
  let best = null;
  wins.forEach((w, key) => { if (!w.el.hidden && (!best || +w.el.style.zIndex > +wins.get(best).el.style.zIndex)) best = key; });
  return best;
}

function afterHide() {
  const next = topmost();
  if (next) focus(next);
  else { $("#active-title").textContent = "Desktop"; syncDock(); }
}

function close(id) {
  const w = wins.get(id);
  if (!w) return;
  w.el.remove();
  wins.delete(id);
  afterHide();
}

function minimise(id) {
  const w = wins.get(id);
  if (!w) return;
  w.el.hidden = true;
  afterHide();
}

function makeDraggable(el) {
  const bar = $(".win__bar", el);
  let sx, sy, ox, oy, dragging = false;
  bar.addEventListener("pointerdown", (e) => {
    if (mobile.matches || e.button !== 0 || e.target.closest(".win__btns") || el.classList.contains("is-max")) return;
    dragging = true;
    sx = e.clientX; sy = e.clientY; ox = el.offsetLeft; oy = el.offsetTop;
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const x = Math.max(80 - el.offsetWidth, Math.min(window.innerWidth - 80, ox + e.clientX - sx));
    const y = Math.max(30, Math.min(window.innerHeight - 120, oy + e.clientY - sy));
    el.style.left = x + "px";
    el.style.top = y + "px";
  });
  const stop = () => { dragging = false; };
  bar.addEventListener("pointerup", stop);
  bar.addEventListener("pointercancel", stop);
}

// ===================== Window contents =====================
function render(id, body) {
  const item = FS[id];
  switch (item.type) {
    case "folder": {
      const grid = document.createElement("div");
      grid.className = "folder";
      item.children.forEach((c) => grid.append(iconButton(c)));
      const status = document.createElement("div");
      status.className = "folder__status";
      status.textContent = `${item.children.length} items`;
      body.append(grid, status);
      break;
    }
    case "doc": {
      const doc = document.createElement("article");
      doc.className = "doc";
      doc.append($("#" + item.tpl).content.cloneNode(true));
      body.append(doc);
      break;
    }
    case "image": {
      body.innerHTML = `<figure class="viewer" style="margin:0"><img src="${item.src}" alt=""><p></p></figure>`;
      $("img", body).alt = item.caption;
      $("p", body).textContent = item.caption;
      break;
    }
    case "photos": {
      const grid = document.createElement("div");
      grid.className = "photos";
      Object.keys(FS).filter((k) => FS[k].type === "image").forEach((k) => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.open = k;
        b.innerHTML = `<img src="${FS[k].src}" alt="" loading="lazy">`;
        $("img", b).alt = FS[k].caption;
        grid.append(b);
      });
      body.append(grid);
      break;
    }
    case "pdf": {
      fetch(item.src, { method: "HEAD" })
        .then((r) => {
          if (!r.ok) throw new Error();
          body.classList.add("win__body--pdf");
          body.innerHTML = `<div class="pdfbar"><span>${item.name}</span><a href="${item.src}" target="_blank" rel="noopener">Open in new tab ↗</a><a href="${item.src}" download>Download</a></div><iframe class="pdf" src="${item.src}#view=FitH" title="${item.name}"></iframe>`;
        })
        .catch(() => {
          const doc = document.createElement("article");
          doc.className = "doc";
          doc.append($("#doc-cv-missing").content.cloneNode(true));
          body.append(doc);
        });
      break;
    }
    case "terminal":
      terminal(id, body);
      break;
    case "compose":
      compose(body);
      break;
  }
}

// ===================== Terminal =====================
function terminal(id, body) {
  body.innerHTML = `<div class="term"><pre class="term__out"></pre><div class="term__line"><span class="term__prompt">anmol@kcl:<b>~</b>$</span><input aria-label="Terminal input" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>`;
  const out = $(".term__out", body), input = $("input", body), term = $(".term", body);
  const history = [];
  let hIndex = 0;

  const print = (html = "") => { out.insertAdjacentHTML("beforeend", html + "\n"); body.scrollTop = body.scrollHeight; };
  const echo = (cmd) => {
    const line = document.createElement("span");
    line.innerHTML = `<span class="term__prompt">anmol@kcl:<b>~</b>$</span> `;
    line.append(document.createTextNode(cmd + "\n"));
    out.append(line);
  };
  const find = (q) => {
    q = q.toLowerCase().replace(/\.(md|txt|pdf|jpg)$/, "").trim();
    return Object.keys(FS).find((k) => k === q || FS[k].name.toLowerCase().replace(/\.(md|txt|pdf|jpg)$/, "") === q)
      || Object.keys(FS).find((k) => FS[k].name.toLowerCase().startsWith(q));
  };

  const commands = {
    help: () => print(
`<span class="t-accent">Available commands</span>
  whoami        who is this?
  ls            list what's on the desktop
  open &lt;name&gt;   open a file or folder  (e.g. open research)
  research      my current research
  experience    roles and skills
  cv            my CV
  contact       how to reach me
  neofetch      system info
  clear         clear the screen`),
    whoami: () => print("Anmol Goyal: maths student at King's College London,\nvisiting student AI researcher at Oxford Dynamics."),
    ls: () => print(DESKTOP.map((k) => (FS[k].type === "folder" ? `<span class="t-accent">${FS[k].name}/</span>` : FS[k].name)).join("   ")),
    open: (arg) => {
      if (!arg) return print('<span class="t-err">usage: open &lt;name&gt;</span>');
      const k = find(arg);
      if (!k) return print(`<span class="t-err">open: no such file or folder: ${escapeHtml(arg)}</span>`);
      print(`<span class="t-dim">opening ${escapeHtml(FS[k].name)} ...</span>`);
      open(k);
    },
    research: () => commands.open("lnn"),
    experience: () => commands.open("experience-md"),
    cv: () => commands.open("cv-pdf"),
    about: () => commands.open("about"),
    photos: () => commands.open("photos"),
    email: () => commands.open("c-email"),
    contact: () => print(`email     <a href="mailto:${EMAIL}">${EMAIL}</a>\nlinkedin  <a href="https://www.linkedin.com/in/anmolxgoyal/" target="_blank" rel="noopener">linkedin.com/in/anmolxgoyal</a>\ngithub    <a href="https://github.com/AG-droid" target="_blank" rel="noopener">github.com/AG-droid</a>`),
    neofetch: () => print(
`<span class="t-accent">anmol@kcl</span>
---------
<span class="t-accent">OS</span>         AnmolOS 26.10
<span class="t-accent">Host</span>       King's College London
<span class="t-accent">Kernel</span>     maths-with-statistics (final year)
<span class="t-accent">Research</span>   LTC networks as adaptive filters @ Oxford Dynamics
<span class="t-accent">Robotics</span>   ROS2 · MoveIt · NVIDIA Isaac Sim
<span class="t-accent">Languages</span>  English · Hindi · Punjabi`),
    date: () => print(new Date().toString()),
    echo: (arg) => print(escapeHtml(arg)),
    clear: () => { out.innerHTML = ""; },
    sudo: () => print('<span class="t-err">anmol is not in the sudoers file. This incident will be reported.</span>'),
    ros2: () => print("ros2: the arm controller runs on a real robot in Harwell, not in your browser :)"),
    exit: () => close(id),
  };
  commands.cd = commands.open;
  commands.cat = commands.open;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const raw = input.value.trim();
      input.value = "";
      echo(raw);
      if (raw) { history.push(raw); hIndex = history.length; }
      const [cmd, ...rest] = raw.split(/\s+/);
      if (!cmd) return;
      const fn = commands[cmd.toLowerCase()];
      fn ? fn(rest.join(" ")) : print(`<span class="t-err">command not found: ${escapeHtml(cmd)}</span>. Try <span class="t-accent">help</span>.`);
      body.scrollTop = body.scrollHeight;
    } else if (e.key === "ArrowUp" && hIndex > 0) {
      input.value = history[--hIndex]; e.preventDefault();
    } else if (e.key === "ArrowDown") {
      hIndex = Math.min(history.length, hIndex + 1);
      input.value = history[hIndex] || "";
    }
  });
  term.addEventListener("click", () => { if (!window.getSelection().toString()) input.focus(); });

  print(`Welcome to <span class="t-accent">AnmolOS</span>. Type <span class="t-accent">help</span> to see what you can do.\n`);
  wins.get(id).focusInput = () => { if (!mobile.matches) input.focus({ preventScroll: true }); };
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ===================== Dock, desktop, clock =====================
function buildDock() {
  const dock = $("#dock");
  DOCK.forEach((id) => {
    if (id === "|") { const s = document.createElement("span"); s.className = "dock__sep"; dock.append(s); return; }
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dock__item" + (["cv", "photos"].includes(id) ? " dock__item--extra" : "");
    b.dataset.open = id;
    b.dataset.id = id;
    b.setAttribute("aria-label", FS[id].name);
    b.innerHTML = iconArt(id) + `<span class="dock__tip"></span>`;
    $(".dock__tip", b).textContent = id === "home" ? "Home" : FS[id].name;
    dock.append(b);
  });
}

function syncDock() {
  document.querySelectorAll(".dock__item").forEach((b) => b.classList.toggle("is-open", wins.has(b.dataset.id)));
}

function buildDesktop() {
  const list = $("#desktop-icons");
  DESKTOP.forEach((id) => {
    const li = document.createElement("li");
    li.append(iconButton(id));
    list.append(li);
  });
}

function tickClock() {
  const now = new Date();
  $("#clock").textContent = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    + "  " + now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// "New Message" window. GitHub Pages can't send mail, so the form posts to
// FormSubmit, which forwards it to my inbox with the sender as reply-to.
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${EMAIL}`;

function compose(body) {
  body.innerHTML = `
    <form class="compose" novalidate>
      <div class="compose__row"><span>To</span><input value="Anmol Goyal" readonly tabindex="-1"></div>
      <label class="compose__row"><span>From</span><input name="email" type="email" placeholder="your@email.com" autocomplete="email" required></label>
      <label class="compose__row"><span>Subject</span><input name="subject" placeholder="Hello from your website" maxlength="150"></label>
      <textarea name="message" placeholder="Write your message..." required maxlength="5000"></textarea>
      <input class="compose__trap" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="compose__send">
        <p class="compose__status" role="status"></p>
        <button class="btn btn--primary" type="submit">Send</button>
      </div>
    </form>`;
  const form = $(".compose", body);
  const status = $(".compose__status", body);
  const send = $('[type="submit"]', body);
  const setStatus = (msg, kind = "") => { status.textContent = msg; status.dataset.kind = kind; };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim(), message = form.message.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus("Please enter a valid email address.", "error"); form.email.focus(); return; }
    if (!message) { setStatus("Please write a message.", "error"); form.message.focus(); return; }
    if (form._honey.value) return;

    send.disabled = true;
    setStatus("Sending...");
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email,
          message,
          _subject: `Website: ${form.subject.value.trim() || "New message"}`,
          _replyto: email,
          _template: "table",
          _captcha: "false",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data.success) !== "true") throw new Error(data.message || "Send failed");
      body.innerHTML = `
        <div class="compose__done">
          <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22"/><path d="M14 25l7 7 13-15"/></svg>
          <h2>Message sent</h2>
          <p>Thanks for reaching out. I'll reply to <strong></strong> soon.</p>
        </div>`;
      $(".compose__done strong", body).textContent = email;
    } catch (err) {
      send.disabled = false;
      setStatus("Couldn't send right now. You can email me directly at " + EMAIL + ".", "error");
    }
  });
}

// Anything with data-open (icons, dock, links inside docs) opens that item
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-open]");
  if (t) open(t.dataset.open);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { const t = topmost(); if (t) close(t); }
});

// ===================== Boot =====================
const BOOT = [
  "AnmolOS 26.10 tty1",
  "",
  "[  OK  ] Mounted /home/anmol",
  "[  OK  ] Started maths-with-statistics.service (KCL, final year)",
  "[  OK  ] Started ros2-daemon",
  "[  OK  ] Calibrated 6-DoF arm controller",
  "[  OK  ] Loaded digital twin from NVIDIA Isaac Sim",
  "[ WAIT ] Integrating liquid neurons (dt = 0.01) ...",
  "[  OK  ] Liquid time constants adapted",
  "[  OK  ] Reached target: Desktop",
];

function boot(done) {
  let seen = false;
  try { seen = sessionStorage.getItem("booted") === "1"; } catch (e) {}
  if (seen || reducedMotion) return done();

  const screen = $("#boot"), log = $("#boot-log");
  screen.hidden = false;
  let i = 0, finished = false, timer;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    try { sessionStorage.setItem("booted", "1"); } catch (e) {}
    screen.classList.add("is-done");
    setTimeout(() => { screen.hidden = true; }, 400);
    document.removeEventListener("keydown", finish);
    done();
  };
  const step = () => {
    if (i >= BOOT.length) { timer = setTimeout(finish, 500); return; }
    const line = escapeHtml(BOOT[i++])
      .replace("[  OK  ]", '[  <span class="ok">OK</span>  ]')
      .replace("[ WAIT ]", '[ <span class="wait">WAIT</span> ]');
    log.insertAdjacentHTML("beforeend", line + "\n");
    timer = setTimeout(step, BOOT[i - 1].includes("WAIT") ? 380 : 110);
  };
  screen.addEventListener("click", finish);
  document.addEventListener("keydown", finish);
  step();
}

// ===================== Start =====================
buildDesktop();
buildDock();
tickClock();
setInterval(tickClock, 15000);
boot(() => { if (!mobile.matches) open("about"); });
