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
  "cv-pdf":      { name: "Anmol_Goyal_CV.pdf", type: "pdf", src: "assets/cv/Anmol_Goyal_CV.pdf?v=3", w: 760, h: 720 },

  contact:       { name: "Contact", type: "folder", glyph: "contact", children: ["contact-md", "c-email", "c-linkedin", "c-github"] },
  "contact-md":  { name: "Contact.md", type: "doc", tpl: "doc-contact", w: 540, h: 320 },
  "c-email":     { name: "Email", type: "compose", w: 560, h: 480 },
  "c-linkedin":  { name: "LinkedIn", type: "link", href: "https://www.linkedin.com/in/anmolxgoyal/" },
  "c-github":    { name: "GitHub", type: "link", href: "https://github.com/AG-droid" },

  photos:        { name: "Photos", type: "photos", w: 720, h: 520 },
  terminal:      { name: "Terminal", type: "terminal", w: 760, h: 640 },
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
  // Yellow restores a maximised window to its normal size, otherwise hides it
  $(".win__btn--min", el).addEventListener("click", () => el.classList.contains("is-max") ? el.classList.remove("is-max") : minimise(id));
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
      body.innerHTML = `<figure class="viewer"><img src="${item.src}" alt=""><p></p></figure>`;
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
      compose(body, id);
      break;
  }
}

// ===================== Terminal =====================
function terminal(id, body) {
  body.innerHTML = `<div class="term"><pre class="term__out"></pre><div class="term__line"><span class="term__prompt"></span><input aria-label="Terminal input" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>`;
  const out = $(".term__out", body), input = $("input", body), term = $(".term", body);
  const history = [];
  let hIndex = 0;
  let cwd = "home";

  // ~/Experience/Oxford Dynamics style path for a folder id
  const pathStr = (k) => (k === "home" ? "~" : pathStr(PARENT[k] || "home") + "/" + FS[k].name);
  const prompt = () => `<span class="term__prompt">anmol@kcl:<b>${escapeHtml(pathStr(cwd))}</b>$</span>`;
  const setPrompt = () => { $(".term__line .term__prompt", body).outerHTML = prompt(); };
  setPrompt();

  const print = (html = "", scroll = true) => { out.insertAdjacentHTML("beforeend", html + "\n"); if (scroll) body.scrollTop = body.scrollHeight; };
  const echo = (cmd) => {
    const line = document.createElement("span");
    line.innerHTML = prompt() + " ";
    line.append(document.createTextNode(cmd + "\n"));
    out.append(line);
  };
  // Resolve a path like "Experience/Oxford Dynamics", "..", "~/cv" relative to cwd
  const bare = (n) => n.toLowerCase().replace(/\.(md|txt|pdf|jpg)$/, "");
  const resolve = (arg) => {
    let path = arg.trim().replace(/^["']|["']$/g, "").replace(/\\ /g, " ");
    let at = cwd;
    if (path.startsWith("~") || path.startsWith("/")) { at = "home"; path = path.replace(/^[~/]+/, ""); }
    for (const part of path.split("/").filter(Boolean)) {
      if (part === ".") continue;
      if (part === "..") { at = PARENT[at] || "home"; continue; }
      const kids = FS[at].children;
      if (!kids) return null;
      const q = bare(part);
      at = kids.find((c) => bare(FS[c].name) === q) || kids.find((c) => bare(FS[c].name).startsWith(q));
      if (!at) return null;
    }
    return at;
  };
  const find = (q) => {
    q = q.toLowerCase().replace(/\.(md|txt|pdf|jpg)$/, "").trim();
    return Object.keys(FS).find((k) => k === q || FS[k].name.toLowerCase().replace(/\.(md|txt|pdf|jpg)$/, "") === q)
      || Object.keys(FS).find((k) => FS[k].name.toLowerCase().startsWith(q));
  };

  // a command name you can click instead of typing
  const cmd = (name, pad = 12) => `<button type="button" class="t-cmd" data-cmd="${name}">${name}</button>${" ".repeat(Math.max(1, pad - name.length))}`;

  const commands = {
    help: () => print(
`<span class="t-accent">Available commands</span> <span class="t-dim">(type them, or click)</span>
  ${cmd("whoami")}who is this?
  ${cmd("ls")}list the current folder
  cd &lt;folder&gt;   move into a folder  <span class="t-dim">(cd .. to go back)</span>
  cat &lt;file&gt;    read a file right here
  open &lt;name&gt;  open it in a window  <span class="t-dim">(open . for this folder)</span>
  ${cmd("pwd")}where am I?
  ${cmd("research")}what I'm working on now
  ${cmd("experience")}where I've worked
  ${cmd("cv")}open my CV
  ${cmd("email")}send me a message
  ${cmd("contact")}links to find me
  ${cmd("neofetch")}system info
  ${cmd("reboot")}turn it off and on again
  ${cmd("clear")}clear the screen`),
    whoami: () => print("Anmol Goyal: maths student at King's College London,\nvisiting student AI researcher at Oxford Dynamics."),
    ls: (arg) => {
      const k = arg ? resolve(arg) : cwd;
      if (!k) return print(`<span class="t-err">ls: no such file or folder: ${escapeHtml(arg)}</span>`);
      if (!FS[k].children) return print(escapeHtml(FS[k].name));
      // every entry is clickable: folders cd into, everything else opens
      print(FS[k].children.map((c) => {
        const it = FS[c], dir = it.type === "folder", name = escapeHtml(it.name);
        const target = escapeHtml(JSON.stringify((arg ? arg.replace(/\/$/, "") + "/" : "") + it.name));
        return `<button type="button" class="t-cmd${dir ? "" : " t-file"}" data-cmd="${dir ? "cd" : "open"} ${target}">${name}${dir ? "/" : it.type === "link" ? " ↗" : ""}</button>`;
      }).join("   ") || '<span class="t-dim">(empty)</span>');
    },
    cd: (arg) => {
      const k = arg ? resolve(arg) : "home";
      if (!k) return print(`<span class="t-err">cd: no such folder: ${escapeHtml(arg)}</span>`);
      if (FS[k].type !== "folder") return print(`<span class="t-err">cd: not a folder: ${escapeHtml(FS[k].name)}</span>. Try <span class="t-accent">cat</span> or <span class="t-accent">open</span>.`);
      cwd = k;
      setPrompt();
    },
    pwd: () => print(escapeHtml(pathStr(cwd).replace(/^~/, "/home/anmol"))),
    cat: (arg) => {
      if (!arg) return print('<span class="t-err">usage: cat &lt;file&gt;</span>');
      const k = resolve(arg) || find(arg);
      if (!k) return print(`<span class="t-err">cat: no such file: ${escapeHtml(arg)}</span>`);
      const it = FS[k];
      if (it.type === "folder") return print(`<span class="t-err">cat: ${escapeHtml(it.name)}: is a folder</span>. Try <span class="t-accent">cd</span>.`);
      if (it.type !== "doc") return commands.open(arg);
      print(docText($("#" + it.tpl).content));
    },
    open: (arg) => {
      if (!arg) return print('<span class="t-err">usage: open &lt;name&gt;</span>');
      const k = resolve(arg) || find(arg);
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
    reboot: () => {
      print('<span class="t-err">Broadcast message from anmol@kcl: the system is going down for reboot NOW!</span>');
      setTimeout(reboot, 700);
    },
  };
  commands.dir = commands.ls;

  const run = (raw) => {
    echo(raw);
    if (raw) { history.push(raw); hIndex = history.length; }
    const [name, ...rest] = raw.split(/\s+/);
    if (!name) return;
    const fn = commands[name.toLowerCase()];
    fn ? fn(rest.join(" ")) : print(`<span class="t-err">command not found: ${escapeHtml(name)}</span>. Try ${cmd("help", 0)}`);
    body.scrollTop = body.scrollHeight;
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      // complete the last word against the current folder
      e.preventDefault();
      const m = input.value.match(/^(\S+\s+)(.*)$/);
      if (!m) return;
      const slash = m[2].lastIndexOf("/");
      const dir = slash >= 0 ? resolve(m[2].slice(0, slash) || "/") : cwd;
      const stem = m[2].slice(slash + 1).toLowerCase();
      const hits = dir && FS[dir].children ? FS[dir].children.filter((c) => FS[c].name.toLowerCase().startsWith(stem)) : [];
      if (hits.length === 1) {
        const it = FS[hits[0]];
        input.value = m[1] + m[2].slice(0, slash + 1) + it.name + (it.type === "folder" ? "/" : "");
      } else if (hits.length > 1) {
        echo(input.value);
        print(hits.map((c) => escapeHtml(FS[c].name)).join("   "));
      }
    } else if (e.key === "Enter") {
      const raw = input.value.trim();
      input.value = "";
      run(raw);
    } else if (e.key === "ArrowUp" && hIndex > 0) {
      input.value = history[--hIndex]; e.preventDefault();
    } else if (e.key === "ArrowDown") {
      hIndex = Math.min(history.length, hIndex + 1);
      input.value = history[hIndex] || "";
    }
  });
  term.addEventListener("click", (e) => {
    const c = e.target.closest(".t-cmd");
    if (c) { run(c.dataset.cmd); return; }
    if (!window.getSelection().toString()) input.focus();
  });

  welcome(print, cmd);
  wins.get(id).focusInput = () => { if (!mobile.matches) input.focus({ preventScroll: true }); };
}

// Greeting shown when the terminal first opens, printed line by line
const BANNER = [
  " █████╗ ███╗   ██╗███╗   ███╗ ██████╗ ██╗     ",
  "██╔══██╗████╗  ██║████╗ ████║██╔═══██╗██║     ",
  "███████║██╔██╗ ██║██╔████╔██║██║   ██║██║     ",
  "██╔══██║██║╚██╗██║██║╚██╔╝██║██║   ██║██║     ",
  "██║  ██║██║ ╚████║██║ ╚═╝ ██║╚██████╔╝███████╗",
  "╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝ ╚═════╝ ╚══════╝",
];

// Plain-text rendering of a document template for `cat`
function docText(node) {
  const lines = [];
  const text = (el) => escapeHtml(el.textContent.replace(/\s+/g, " ").trim());
  const walk = (el) => {
    for (const c of el.children) {
      const tag = c.tagName;
      if (tag === "H1") lines.push(`<strong>${text(c).toUpperCase()}</strong>`, "");
      else if (tag === "H2" || tag === "H3") lines.push(`<span class="t-accent">## ${text(c)}</span>`);
      else if (tag === "LI") lines.push(`  • ${text(c)}`);
      else if (tag === "BLOCKQUOTE") lines.push(`<span class="t-dim">  │ ${text(c)}</span>`, "");
      else if (tag === "P" || tag === "DT" || tag === "DD") lines.push(text(c), "");
      else if (c.children.length) { walk(c); if (tag === "UL" || tag === "OL") lines.push(""); }
      else if (c.textContent.trim()) lines.push(text(c));
    }
  };
  walk(node);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function welcome(print, cmd) {
  const lines = [
    `<span class="t-banner">${BANNER.join("\n")}</span>`,
    `Welcome to <span class="t-accent">AnmolOS</span>, the personal site of <strong>Anmol Goyal</strong>.`,
    "",
    `<span class="t-dim">▸</span> Maths with Statistics student @ King's College London`,
    `<span class="t-dim">▸</span> Visiting Student AI Researcher @ Oxford Dynamics`,
    `<span class="t-dim">▸</span> Into robotics, physical AI and liquid neural networks`,
    "",
    `This site works like a little computer. You can:`,
    `  <span class="t-ok">✓</span> open the folders on the desktop: Experience, Research, Projects, CV`,
    `  <span class="t-ok">✓</span> drag windows around and use the dock at the bottom`,
    `  <span class="t-ok">✓</span> or stay right here and run a command:`,
    "",
    `      ${cmd("research")}what I'm working on now`,
    `      ${cmd("experience")}where I've worked`,
    `      ${cmd("cv")}open my CV`,
    `      ${cmd("email")}send me a message`,
    `      ${cmd("help")}everything else`,
    "",
    `<span class="t-dim">Type a command and press Enter, or just click one.</span>`,
    "",
  ];
  // keep the banner in view while it prints; later commands scroll as usual
  if (reducedMotion) { lines.forEach((l) => print(l, false)); return; }
  let i = 0;
  const next = () => { if (i < lines.length) { print(lines[i++], false); setTimeout(next, i === 1 ? 250 : 35); } };
  next();
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
// Web3Forms, which forwards it to my inbox with the sender as reply-to.
// The access key is public by design: it can only send mail to me.
const FORM_ENDPOINT = "https://api.web3forms.com/submit";
const FORM_KEY = "6adc672b-978b-426d-8ddf-ef1e757f6979";

// A draft that failed to send, restored the next time the compose window opens
let draft = null;

function compose(body, id) {
  body.innerHTML = `
    <form class="compose" novalidate>
      <div class="compose__row"><span>To</span><input class="compose__to" value="${EMAIL}" readonly aria-label="Recipient"><button type="button" class="compose__copy">Copy</button></div>
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
  const setStatus = (msg, kind = "") => { status.textContent = msg; status.dataset.kind = kind; };
  if (draft) { form.email.value = draft.email; form.subject.value = draft.subject; form.message.value = draft.message; draft = null; }

  const copyBtn = $(".compose__copy", body);
  copyBtn.addEventListener("click", () => copyEmail(copyBtn));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.email.value.trim(), message = form.message.value.trim(), subject = form.subject.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus("Please enter a valid email address.", "error"); form.email.focus(); return; }
    if (!message) { setStatus("Please write a message.", "error"); form.message.focus(); return; }
    if (form._honey.value) return;

    // Send in the background so the visitor can carry on browsing
    close(id);
    sendMessage({ email, subject, message });
  });
}

// Copy the address, with a fallback for browsers without the Clipboard API
function copyEmail(btn) {
  const label = btn.textContent;
  const done = () => { btn.textContent = "Copied ✓"; setTimeout(() => (btn.textContent = label), 2000); };
  const fallback = () => {
    const t = document.createElement("textarea");
    t.value = EMAIL; document.body.append(t); t.select();
    try { document.execCommand("copy"); done(); } catch (e) {}
    t.remove();
  };
  navigator.clipboard ? navigator.clipboard.writeText(EMAIL).then(done, fallback) : fallback();
}

async function sendMessage({ email, subject, message }) {
  const pending = notify("sending", "Sending your message…", "It's on the way. Feel free to keep exploring.");
  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: FORM_KEY,
        subject: `Website: ${subject || "New message"}`,
        from_name: "anmol-goyal.com",
        email,
        replyto: email,
        message,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || String(data.success) !== "true") throw new Error(data.message || "");
    dismiss(pending);
    notify("ok", "Message sent", `Thanks! I'll reply to ${email} soon.`, 6000);
  } catch (err) {
    dismiss(pending);
    draft = { email, subject, message };
    const n = notify("error", "Message failed to send", `You can email me directly at ${EMAIL}.`);
    const actions = document.createElement("div");
    actions.className = "toast__actions";
    actions.innerHTML = `<button type="button">Copy email</button><button type="button">Try again</button>`;
    const [copyBtn, retryBtn] = actions.children;
    copyBtn.addEventListener("click", () => copyEmail(copyBtn));
    retryBtn.addEventListener("click", () => { dismiss(n); open("c-email"); });
    $(".toast__text", n).append(actions);
  }
}

// ===================== Notifications =====================
function notify(kind, title, text, timeout = 0) {
  let stack = $("#toasts");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toasts";
    stack.setAttribute("aria-live", "polite");
    document.body.append(stack);
  }
  const n = document.createElement("div");
  n.className = "toast";
  n.dataset.kind = kind;
  n.innerHTML = `
    <span class="toast__icon" aria-hidden="true"></span>
    <div class="toast__text"><strong></strong><p></p></div>
    <button class="toast__close" type="button" aria-label="Dismiss">×</button>`;
  $("strong", n).textContent = title;
  $("p", n).textContent = text;
  $(".toast__close", n).addEventListener("click", () => dismiss(n));
  stack.append(n);
  if (timeout) setTimeout(() => dismiss(n), timeout);
  return n;
}

function dismiss(n) {
  if (!n.isConnected || n.classList.contains("is-leaving")) return;
  n.classList.add("is-leaving");
  setTimeout(() => n.remove(), 200);
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

const SHUTDOWN = [
  "[  OK  ] Stopped liquid-neurons.service",
  "[  OK  ] Saved learned time constants",
  "[  OK  ] Parked 6-DoF arm in home position",
  "[  OK  ] Stopped ros2-daemon",
  "[  OK  ] Closed NVIDIA Isaac Sim session",
  "[  OK  ] Stopped maths-with-statistics.service",
  "[ WAIT ] Syncing filesystems ...",
  "[  OK  ] Unmounted /home/anmol",
  "[  OK  ] Reached target: Reboot",
  "",
  "reboot: Restarting system",
];

const bootLine = (text) => escapeHtml(text)
  .replace("[  OK  ]", '[  <span class="ok">OK</span>  ]')
  .replace("[ WAIT ]", '[ <span class="wait">WAIT</span> ]');

// Prints lines one by one on the boot screen, pausing longer on WAIT lines
function typeLines(lines, done, speed = 110) {
  const log = $("#boot-log");
  let i = 0, timer;
  const step = () => {
    if (i >= lines.length) { done(); return; }
    const line = lines[i++];
    log.insertAdjacentHTML("beforeend", bootLine(line) + "\n");
    timer = setTimeout(step, line.includes("WAIT") ? 500 : speed);
  };
  step();
  return () => clearTimeout(timer);
}

function showBootScreen() {
  const screen = $("#boot");
  $("#boot-log").innerHTML = "";
  screen.classList.remove("is-done");
  screen.hidden = false;
  return screen;
}

function boot(done, force = false) {
  let seen = false;
  try { seen = sessionStorage.getItem("booted") === "1"; } catch (e) {}
  if (!force && (seen || reducedMotion)) return done();

  const screen = showBootScreen();
  $(".boot__hint").hidden = false;
  let finished = false, stop, timer;
  const finish = () => {
    if (finished) return;
    finished = true;
    stop(); clearTimeout(timer);
    try { sessionStorage.setItem("booted", "1"); } catch (e) {}
    screen.classList.add("is-done");
    setTimeout(() => { screen.hidden = true; }, 400);
    screen.removeEventListener("click", finish);
    document.removeEventListener("keydown", finish);
    done();
  };
  stop = typeLines(BOOT, () => { timer = setTimeout(finish, 500); });
  screen.addEventListener("click", finish);
  document.addEventListener("keydown", finish);
}

// Shut everything down, go dark for a moment, then boot again
function reboot() {
  // the terminal running the command goes last
  const apps = [...wins.keys()].sort((a, b) => (a === "terminal") - (b === "terminal")).map((k) => FS[k].name);
  [...wins.keys()].forEach(close);
  if (reducedMotion) { open("terminal"); return; }

  showBootScreen();
  $(".boot__hint").hidden = true;
  const lines = [...apps.map((name) => `[  OK  ] Closed ${name}`), ...SHUTDOWN];
  typeLines(lines, () => setTimeout(() => {
    $("#boot-log").innerHTML = "";
    setTimeout(() => boot(() => open("terminal"), true), 1200);
  }, 900), 170);
}

// ===================== Start =====================
buildDesktop();
buildDock();
tickClock();
setInterval(tickClock, 15000);
boot(() => open("terminal"));
