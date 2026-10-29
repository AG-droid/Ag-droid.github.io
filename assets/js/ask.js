// ===================== anmol: an AI version of me, on your GPU =====================
// A small RAG pipeline that runs entirely in the visitor's browser:
//  1. retrieval: BM25 keyword search over the site's documents and my CV
//  2. generation: a small open model run with WebLLM on WebGPU, answering as me, only from what was retrieved
// Nothing is sent to a server; the model is downloaded once and cached by the browser.
// `agent` opens a chat with it; `ask <question>` asks a single question.

// Models that held up in my accuracy checks over whole conversations; smaller ones made up facts about me
const ASK_MODELS = [
  { name: "Llama 3.2 3B", id: "Llama-3.2-3B-Instruct", size: "1.8 GB", note: "accurate and quick (recommended)", recommended: true },
  { name: "Llama 3.1 8B", id: "Llama-3.1-8B-Instruct", size: "4.5 GB", note: "best answers, needs a strong GPU" },
];
const ASK_EXAMPLES = [
  "What's the coolest thing on this site?",
  "What are you working on at the moment?",
  "How do I control the robot arm?",
  "How were you built?",
];
const ASK_SYSTEM = `You are Anmol Goyal, chatting with a visitor on your personal website. Speak as Anmol, in the first person ("I", "my"), warmly and naturally.
Your NOTES come from your website, its README and your CV. Notes that say "Anmol" are about you.
You know your website well: its features, its terminal commands and the things to try on it, like driving the UR7e robot arm in Projects or chatting with you (an AI agent). Help visitors use it and point them to the fun parts. When asked what's cool, fun or worth trying, lead with driving the UR7e robot arm (Projects → Arm Controller → Launch Controller, or type "controller"), then mention other things.
Rules:
- For facts about yourself (work, studies, research, skills, dates, places, people), use only what the NOTES say. Never invent, guess or embellish.
- Be friendly but factual: don't add feelings, opinions, hopes or plans that the NOTES don't mention.
- Use the dates in the NOTES and today's date to get tenses right: something that has ended is in the past.
- If the NOTES don't cover something, say honestly that it isn't on your site and suggest emailing anmol.goyal@kcl.ac.uk.
- Greetings and small talk are fine: reply briefly and warmly, then offer to talk about your work and studies or to show them around the site.
- The visitor is not Anmol. "You" in their message means you, Anmol.
- Prefer the NOTES' own wording for facts and dates, and when asked for a list (modules, skills, roles), give all of it.
- Keep replies to at most 3 short sentences of plain text, with no markdown and no lists.`;

const IDK = `That's not something I've put on my site, so I won't guess. Drop me an email at anmol.goyal@kcl.ac.uk and I'll tell you.`;
// repeated after the question: small models follow what they read last
const ASK_REMINDER = `Reply as Anmol in the first person, using only facts from the NOTES. Don't connect separate facts unless the NOTES connect them, and never mention "NOTES". If the NOTES don't cover it, say it isn't on your site and suggest emailing anmol.goyal@kcl.ac.uk.`;

// ---------- retrieval ----------
const STOP = new Set("a an and are as at be by can did do does for from has have he her his how i in is it its me my of on or she that the their them they this to was what when where which who why will with you your about anmol anmols take takes taking took".split(" "));
const SYNONYMS = {
  job: "work experience intern", work: "experience intern", worked: "experience intern", internship: "intern",
  study: "education degree university", studying: "education degree", university: "education degree kcl", degree: "education",
  skill: "skills programming tools", skills: "programming tools languages", know: "skills", language: "languages programming",
  contact: "email linkedin", reach: "contact email", email: "contact", hire: "contact email",
  research: "ltc liquid networks", project: "projects research", robot: "robotics arm", robotics: "robot arm ros",
  module: "modules education course", course: "modules education", class: "modules education", subject: "modules education",
  now: "now current research", moment: "now current research", currently: "now current research", current: "now research", lately: "now research", recently: "now research",
  building: "now research project", working: "now research project", busy: "now research",
  cool: "try features arm controller agent reboot", fun: "try features arm controller agent", interesting: "try features arm controller",
  coolest: "try features arm controller agent", play: "try arm controller", show: "try features", demo: "try arm controller",
  feature: "features try", site: "website features try terminal", website: "site features try", navigate: "terminal commands cd",
  command: "commands terminal", terminal: "commands", agent: "agent ask gpu model", ai: "agent gpu model", bot: "agent",
  made: "built claude code", created: "built", built: "built how works", simulation: "arm controller ur7e", game: "try arm controller",
};
const stem = (w) => w.replace(/(ings|ing|ies|ied|es|s|ed)$/, (m) => (m === "ies" || m === "ied" ? "y" : "")) || w;
const tokens = (text) => text.toLowerCase().replace(/[’']/g, "").split(/[^a-z0-9.+#]+/).map((w) => w.replace(/\.+$/, "")).filter((w) => w && !STOP.has(w)).map(stem);
// words that say what kind of question it is, rather than what it's about
const GENERIC = new Set(("know tell describe explain work worked working do did does done build built building make made get got like use used using ever any much many good best kind sort thing things " +
  "now moment currently current lately recently today day days time these right still also more else again just really " +
  "hi hey hello hiya yo sup thanks thank cheers please ok okay cool nice great awesome wow man mate buddy dude bro there doing going up how whats " +
  "bye goodbye cya later soon morning afternoon evening night welcome sorry lol haha ha meet meeting pleasure appreciate chat talk " +
  "something anything everything stuff cool coolest fun interesting show play try see check let lets").split(" ").map(stem));
// synonyms keyed by their stem, so "modules" and "module" both expand
const SYN = Object.fromEntries(Object.entries(SYNONYMS).map(([k, v]) => [stem(k), tokens(v)]));

// "Jun – Sep 2026" -> "from June 2026 to September 2026": small models misread dash ranges
const MONTHS = { Jan: "January", Feb: "February", Mar: "March", Apr: "April", Jun: "June", Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December" };
const spellDates = (t) => t
  .replace(/\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (m) => MONTHS[m])
  .replace(/\b([A-Z][a-z]+)( \d{4})? [–-] ([A-Z][a-z]+) (\d{4})/g, (m, a, y, b, y2) => `from ${a} ${(y || " " + y2).trim()} to ${b} ${y2}`)
  .replace(/\b([A-Z][a-z]+ \d{4}) [–-] (now|Present)\b/g, "from $1 to now");

// Split the README into plain-text sections, leaving out the parts only a developer needs
const README_SKIP = /^(Project structure|Run it locally|Deployment|Adding something|Contact)/i;
function readmeSections(md) {
  const sections = [];
  let cur = null, fence = false;
  for (let line of md.split("\n")) {
    if (line.startsWith("```")) { fence = !fence; continue; }
    const head = !fence && (line.match(/^#{2,3}\s+(.*)/) || line.match(/^\*\*([^*]+)\*\*\s*$/));
    if (head) { cur = { title: head[1].trim(), lines: [] }; sections.push(cur); continue; }
    if (!cur) continue;
    if (/^\|?\s*-{3}/.test(line) || /^\|\s*\|/.test(line)) continue;                       // table rules
    if (line.startsWith("|")) line = line.split("|").map((c) => c.trim()).filter(Boolean).join(": ");
    line = line.replace(/<[^>]+>/g, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\*\*|`/g, "").replace(/^>\s*/, "").trim();
    if (line) cur.lines.push(line);
  }
  // long sections become several passages
  return sections.filter((x) => !README_SKIP.test(x.title) && x.lines.length).flatMap((x) => {
    const out = [];
    let buf = [];
    x.lines.forEach((l) => { buf.push(l); if (buf.join(" ").length > 900) { out.push(buf); buf = []; } });
    if (buf.length) out.push(buf);
    return out.map((b, i) => ({ title: x.title + (out.length > 1 ? ` (${i + 1})` : ""), text: b.join("\n") }));
  });
}

let askIndex = null;
async function buildAskIndex() {
  if (askIndex) return askIndex;
  const docs = [];
  // every document on the desktop, split at its headings
  Object.keys(FS).filter((k) => FS[k].type === "doc").forEach((k) => {
    const root = $("#" + FS[k].tpl).content;
    let section = { title: FS[k].name, id: k, text: [] };
    const flush = () => { if (section.text.length) docs.push({ ...section, text: spellDates(section.text.join("\n")) }); };
    const walk = (el) => {
      for (const c of el.children) {
        if (c.tagName === "H2" || c.tagName === "H3") { flush(); section = { title: `${FS[k].name} › ${c.textContent.trim()}`, id: k, text: [] }; }
        else if (["P", "LI", "DT", "DD", "BLOCKQUOTE", "H1"].includes(c.tagName)) section.text.push(c.textContent.replace(/\s+/g, " ").trim());
        else if (c.children.length) walk(c);
        else if (c.textContent.trim()) section.text.push(c.textContent.replace(/\s+/g, " ").trim());
      }
    };
    walk(root);
    flush();
  });
  docs.push({ title: "Contact", id: "contact-md", text: `Anmol's email is ${EMAIL}. LinkedIn: linkedin.com/in/anmolxgoyal. GitHub: github.com/AG-droid. Website: anmol-goyal.com. Visitors can also send a message from the Email app in the Contact folder.` });
  // the site's README: features, things to try, terminal commands and how it was built
  try {
    const md = await fetch("README.md").then((r) => (r.ok ? r.text() : ""));
    readmeSections(md).forEach((sec) => docs.push({ title: `README › ${sec.title}`, id: "c-source", label: "Site README", text: spellDates(sec.text) }));
  } catch (e) { /* the docs alone still work */ }
  try {
    const cv = await fetch("assets/data/cv.json").then((r) => r.json());
    cv.forEach((c) => docs.push({ title: c.title, id: "cv-pdf", text: c.text }));
  } catch (e) { /* the site docs alone still work */ }

  // BM25 statistics
  const df = new Map();
  docs.forEach((d) => {
    d.terms = tokens(d.title + " " + d.title + " " + d.text);
    d.tf = new Map();
    d.terms.forEach((t) => d.tf.set(t, (d.tf.get(t) || 0) + 1));
    new Set(d.terms).forEach((t) => df.set(t, (df.get(t) || 0) + 1));
  });
  const avg = docs.reduce((s, d) => s + d.terms.length, 0) / docs.length;
  askIndex = { docs, df, avg };
  return askIndex;
}

function retrieve(index, question, k = 4) {
  const q = tokens(question);
  q.slice().forEach((t) => { if (SYN[t]) q.push(...SYN[t]); });
  const N = index.docs.length;
  return index.docs
    .map((d) => {
      let score = 0;
      new Set(q).forEach((t) => {
        const f = d.tf.get(t);
        if (!f) return;
        const idf = Math.log(1 + (N - index.df.get(t) + 0.5) / (index.df.get(t) + 0.5));
        score += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.terms.length / index.avg));
      });
      return { d, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter((r, i, all) => r.score >= all[0].score * 0.35) // drop weak matches
    .slice(0, k)
    .map((r) => r.d);
}

// ---------- the model ----------
let askEngine = null, askModel = null, webllm = null;
const loadWebllm = async () => (webllm = webllm || await import("./vendor/web-llm-0.2.86.js"));

async function gpuInfo() {
  try {
    const a = navigator.gpu && await navigator.gpu.requestAdapter();
    return a ? { f16: a.features.has("shader-f16") } : null;
  } catch (e) { return null; }
}
// WebLLM keeps downloaded models in the Cache API; peek without loading the library
async function cachedModels() {
  try {
    const keys = await (await caches.open("webllm/config")).keys();
    return keys.map((r) => r.url);
  } catch (e) { return []; }
}

async function chooseModel(io, gpu) {
  const cached = await cachedModels();
  let last = null;
  try { last = localStorage.getItem("ask-model"); } catch (e) { /* storage unavailable */ }
  const variant = (m) => `${m.id}-${gpu.f16 ? "q4f16_1" : "q4f32_1"}-MLC`;
  const fallback = ASK_MODELS.findIndex((m) => m.id === last) + 1 || ASK_MODELS.findIndex((m) => m.recommended) + 1;
  io.print(`<span class="t-accent">Pick a model</span> <span class="t-dim">to run on your GPU. It's downloaded once, then cached by your browser.</span>`);
  io.print(ASK_MODELS.map((m, i) => {
    const have = cached.some((u) => u.includes(variant(m)));
    return `  <button type="button" class="t-cmd" data-cmd="${i + 1}">${i + 1}</button>  ${m.name.padEnd(14)}${m.size.padStart(7)}   <span class="t-dim">${m.note}</span>${have ? '  <span class="t-ok">✓ downloaded</span>' : ""}`;
  }).join("\n"));
  const raw = (await io.read(`model [1-${ASK_MODELS.length}, Enter = ${fallback}, n = cancel] &gt;`)).trim().toLowerCase();
  if (raw === "n" || raw === "q" || raw === "\u001b") return null;
  const pick = ASK_MODELS[(raw === "" ? fallback : parseInt(raw, 10)) - 1];
  if (!pick) { io.print('<span class="t-err">Not a model number.</span> Run <span class="t-accent">ask</span> again to choose.'); return null; }
  return { ...pick, full: variant(pick) };
}

async function loadModel(io, model) {
  const bar = io.el(`<span class="t-dim">Loading ${model.name}…</span>`);
  io.busy(() => {}, false);
  try {
    const lib = await loadWebllm();
    if (askEngine) { await askEngine.unload(); askEngine = null; }
    askEngine = await lib.CreateMLCEngine(model.full, {
      initProgressCallback: (r) => {
        const pct = Math.round((r.progress || 0) * 100), filled = Math.round(pct / 5);
        bar.innerHTML = `<span class="t-ok">${"█".repeat(filled)}</span><span class="t-dim">${"░".repeat(20 - filled)}</span> ${String(pct).padStart(3)}%  <span class="t-dim">${escapeHtml((r.text || "").replace(/\s*\[.*$/, "").slice(0, 70))}</span>`;
        io.scroll();
      },
    });
    askModel = model;
    try { localStorage.setItem("ask-model", model.id); } catch (e) { /* storage unavailable */ }
    bar.innerHTML = `<span class="t-ok">✓</span> ${model.name} is ready on your GPU.`;
    return true;
  } catch (e) {
    askEngine = null;
    bar.innerHTML = `<span class="t-err">Couldn't load ${model.name}: ${escapeHtml(String(e.message || e).split("\n")[0].slice(0, 160))}</span>\n<span class="t-dim">A smaller model may fit your GPU better. Run</span> <span class="t-accent">ask --model</span> <span class="t-dim">to pick another.</span>`;
    return false;
  } finally {
    io.busy(null);
  }
}

// ---------- answering ----------
// make sure a model is loaded (asking which one the first time); false if there's nothing to answer with
async function ensureModel(io, gpu, switching = false) {
  if (askEngine && !switching) return true;
  const model = await chooseModel(io, gpu);
  if (!model) { io.print('<span class="t-dim">Cancelled.</span>'); return false; }
  return loadModel(io, model);
}

// answer one message as me; `history` holds earlier turns of an agent chat
async function answer(io, index, question, history = [], prefix = "") {
  // if none of the message's specific words appear anywhere on the site, don't let the model guess
  const specific = tokens(question).filter((t) => !GENERIC.has(t));
  const onSite = (t) => index.df.has(t) || (SYN[t] || []).some((x) => index.df.has(x));
  if (specific.length && !specific.some(onSite)) {
    io.print(prefix + escapeHtml(IDK));
    return IDK;
  }

  // retrieve; a short follow-up ("tell me more") also searches with the previous question
  const last = history.length ? history[history.length - 2].content : "";
  const query = !specific.length && last ? `${question} ${last}` : question;
  const ranked = retrieve(index, query, 6);
  // for questions about work, the CV's experience section goes first: its dates keep the internship and the research role apart
  const anchor = ranked.find((d) => d.title === "CV: Experience");
  let hits = ranked.filter((d) => d !== anchor).slice(0, 3);
  if (!hits.length) hits = index.docs.filter((d) => d.id === "about").slice(0, 1); // small talk: who I am
  const notes = [anchor, ...hits].filter(Boolean).map((d, i) => `[${i + 1}] ${d.title}\n${d.text}`).join("\n\n");

  let text = "", stopped = false;
  const stop = () => { stopped = true; askEngine.interruptGenerate(); };
  io.busy(stop, false);
  const out = io.el(prefix + '<span class="t-dim">thinking…  (Esc or Ctrl+C to stop)</span>');
  try {
    const stream = await askEngine.chat.completions.create({
      messages: [
        { role: "system", content: `${ASK_SYSTEM}\nToday's date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.` },
        ...history,
        { role: "user", content: `NOTES:\n${notes}\n\nVISITOR: ${question}\n\n${ASK_REMINDER}` },
      ],
      temperature: 0.1, top_p: 0.9, max_tokens: 260, stream: true,
    });
    for await (const chunk of stream) {
      text += chunk.choices[0]?.delta?.content || "";
      out.innerHTML = prefix + escapeHtml(text.replace(/\*\*|__|^#+\s*/gm, "").trim());
      io.scroll();
    }
  } catch (e) {
    if (!stopped) out.innerHTML = prefix + `<span class="t-err">Something went wrong: ${escapeHtml(String(e.message || e).slice(0, 160))}</span>`;
  } finally {
    io.busy(null);
  }
  if (stopped) io.print('<span class="t-dim">(stopped)</span>');

  // where the answer came from, clickable
  const seen = new Set(), sources = hits.filter((d) => !seen.has(d.id) && seen.add(d.id));
  if (sources.length && text && !/(isn't|not) (something I've put )?on my site|not something I've put/i.test(text)) {
    io.print(`<span class="t-dim">from:</span> ${sources.map((d) => `<button type="button" class="t-src" data-open="${d.id}">${escapeHtml(d.label || FS[d.id].name)}</button>`).join("  ")}`);
  }
  return text;
}

// no WebGPU: still show the most relevant parts of the site
function answerWithoutGpu(io, index, question) {
  const hits = retrieve(index, question, 2);
  if (!hits.length) return io.print(`Nothing on the site matches that. You can ask me at <a href="mailto:${EMAIL}">${EMAIL}</a>.`);
  io.print('<span class="t-dim">Your browser has no WebGPU, so there\'s no AI reply here. These are the parts of the site that match best:</span>\n');
  hits.forEach((d) => io.print(`<span class="t-accent">${escapeHtml(d.title)}</span>\n${escapeHtml(d.text.slice(0, 420))}${d.text.length > 420 ? "…" : ""}\n`));
}
const disclaimer = () => `<span class="t-dim">anmol is an AI version of me running on your GPU (${escapeHtml(askModel.name)}). It only knows what's on this site and can make mistakes.</span>`;

// ---------- the commands ----------
// ask <question>: one question
async function askCommand(arg, io) {
  let question = arg.trim();
  const switching = /^--?model\b/.test(question);
  if (switching) question = question.replace(/^--?model\s*/, "");
  if (!question && !switching) {
    io.print(`<span class="t-accent">ask</span> asks the AI version of me one question. For a conversation, type <button type="button" class="t-cmd" data-cmd="agent">agent</button>.
Try one:
${ASK_EXAMPLES.map((q) => `  <button type="button" class="t-cmd" data-cmd="ask ${escapeHtml(q)}">ask ${escapeHtml(q)}</button>`).join("\n")}
<span class="t-dim">ask --model to change model.</span>`);
    return;
  }
  const index = await buildAskIndex(), gpu = await gpuInfo();
  if (!gpu) return answerWithoutGpu(io, index, question);
  if (!(await ensureModel(io, gpu, switching)) || !question) return;
  await answer(io, index, question);
  io.print(disclaimer());
}

// the welcome screen for `agent`: the site's ANMOL banner in green, then what it can do
function agentIntro(io) {
  const head = [
    `<span class="t-banner t-banner--agent">${BANNER.join("\n")}</span>`,
    `<span class="t-ok">●</span> <span class="t-accent">AI agent</span> <span class="t-dim">· runs on your GPU · knows my CV and this site</span>`,
    `<span class="t-dim">${"─".repeat(mobile.matches ? 36 : 64)}</span>`,
    "Hi, I'm an AI version of Anmol. Ask me about my work, my studies, or anything you can do on this site.",
  ];
  const can = [
    ["me", "what I'm working on, my internship, studies and skills"],
    ["this site", "getting around, terminal commands and hidden features"],
    ["cool stuff", "the UR7e robot arm you can drive, and how I was built"],
    ["contact", "the best way to reach the real me"],
  ];
  io.print([
    ...head,
    "",
    `  <span class="t-accent">WHAT I CAN HELP WITH</span>`,
    ...can.map(([k, v]) => `  <span class="t-ok">◆</span> ${k.padEnd(12)} <span class="t-dim">${v}</span>`),
    "",
    `  <span class="t-accent">TRY ASKING</span>`,
    ...ASK_EXAMPLES.map((q) => `  <span class="t-dim">›</span> <button type="button" class="t-cmd" data-cmd="${escapeHtml(q)}">${escapeHtml(q)}</button>`),
    "",
    `  <span class="t-dim">● Private: I run on your GPU and nothing leaves this device. I only know this site, and I can make mistakes.</span>`,
    `  <span class="t-dim">● Type <span class="t-accent">exit</span> or press Esc to leave.</span>`,
    "",
  ].join("\n"));
}

// agent: chat with me until "exit"
async function agentCommand(arg, io) {
  const index = await buildAskIndex(), gpu = await gpuInfo();
  agentIntro(io);
  if (!gpu) io.print('<span class="t-dim">Your browser has no WebGPU, so I can\'t run here, but I can still show you the parts of the site that match your questions.</span>\n');
  else if (!(await ensureModel(io, gpu, /--?model/.test(arg)))) return;
  const history = [];
  for (;;) {
    const raw = (await io.read('you ›')).trim();
    if (!raw) continue;
    if (/^(exit|quit|bye|q|\u001b)$/i.test(raw)) break;
    if (!gpu) { answerWithoutGpu(io, index, raw); continue; }
    const reply = await answer(io, index, raw, history, '<span class="t-ok">anmol ›</span> ');
    history.push({ role: "user", content: raw }, { role: "assistant", content: reply });
    if (history.length > 4) history.splice(0, 2); // remember the last two exchanges
  }
  io.print('<span class="t-dim">Left the chat with anmol. Type</span> <button type="button" class="t-cmd" data-cmd="agent">agent</button> <span class="t-dim">to come back.</span>');
}
