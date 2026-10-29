// ===================== ask: questions about me, answered on your GPU =====================
// A small RAG pipeline that runs entirely in the visitor's browser:
//  1. retrieval: BM25 keyword search over the site's documents and my CV
//  2. generation: a small open model run with WebLLM on WebGPU, told to answer only from what was retrieved
// Nothing is sent to a server; the model is downloaded once and cached by the browser.

// Models that held up in my accuracy checks; smaller ones made up facts about me
const ASK_MODELS = [
  { name: "Llama 3.2 3B", id: "Llama-3.2-3B-Instruct", size: "1.8 GB", note: "most accurate (recommended)", recommended: true },
  { name: "Qwen2.5 1.5B", id: "Qwen2.5-1.5B-Instruct", size: "0.9 GB", note: "lighter and faster, slips up more often" },
];
const ASK_EXAMPLES = [
  "What did Anmol build at Oxford Dynamics?",
  "What is Anmol researching?",
  "Which programming languages does Anmol know?",
  "How can I contact Anmol?",
];
const ASK_SYSTEM = `You answer questions from visitors to Anmol Goyal's personal website. The person asking is a visitor, not Anmol: never address them as Anmol, and "you" in a question means the visitor.
The CONTEXT below comes from the website and CV. Text written in the first person ("I", "my") is Anmol writing about Anmol's own life. Never use pronouns for Anmol (no "I", "he", "his", "she", "her", "they"): repeat the name "Anmol" instead.
Rules:
- Use only facts stated in the CONTEXT. Never add, guess or embellish anything.
- If the CONTEXT does not contain the answer, reply exactly: "I don't know that from Anmol's site. You can ask Anmol directly at anmol.goyal@kcl.ac.uk."
- Answer in at most 4 short sentences of plain text, with no markdown and no lists.`;

const IDK = "I don't know that from Anmol's site. You can ask Anmol directly at anmol.goyal@kcl.ac.uk.";
// repeated after the question: small models follow what they read last
const ASK_REMINDER = `Answer only that question, using only facts stated in the CONTEXT. Say "Anmol", not a pronoun, and never mention the word CONTEXT. Do not connect separate facts unless the CONTEXT connects them. If the CONTEXT doesn't answer it, reply exactly: "${IDK}"`;

// ---------- retrieval ----------
const STOP = new Set("a an and are as at be by can did do does for from has have he her his how i in is it its me my of on or she that the their them they this to was what when where which who why will with you your about anmol anmols take takes taking took".split(" "));
const SYNONYMS = {
  job: "work experience intern", work: "experience intern", worked: "experience intern", internship: "intern",
  study: "education degree university", studying: "education degree", university: "education degree kcl", degree: "education",
  skill: "skills programming tools", skills: "programming tools languages", know: "skills", language: "languages programming",
  contact: "email linkedin", reach: "contact email", email: "contact", hire: "contact email",
  research: "ltc liquid networks", project: "projects research", robot: "robotics arm", robotics: "robot arm ros",
  module: "modules education course", course: "modules education", class: "modules education", subject: "modules education",
};
// words that say what kind of question it is, rather than what it's about
const GENERIC = new Set("know tell describe explain work worked working do did does done build built make made get got like use used using ever any much many good best kind sort thing things".split(" "));
const stem = (w) => w.replace(/(ings|ing|ies|ied|es|s|ed)$/, (m) => (m === "ies" || m === "ied" ? "y" : "")) || w;
const tokens = (text) => text.toLowerCase().replace(/[’']/g, "").split(/[^a-z0-9.+#]+/).map((w) => w.replace(/\.+$/, "")).filter((w) => w && !STOP.has(w)).map(stem);
// synonyms keyed by their stem, so "modules" and "module" both expand
const SYN = Object.fromEntries(Object.entries(SYNONYMS).map(([k, v]) => [stem(k), tokens(v)]));

let askIndex = null;
async function buildAskIndex() {
  if (askIndex) return askIndex;
  const docs = [];
  // every document on the desktop, split at its headings
  Object.keys(FS).filter((k) => FS[k].type === "doc").forEach((k) => {
    const root = $("#" + FS[k].tpl).content;
    let section = { title: FS[k].name, id: k, text: [] };
    const flush = () => { if (section.text.length) docs.push({ ...section, text: section.text.join("\n") }); };
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
  io.print(`<span class="t-accent">Pick a model to answer questions.</span> <span class="t-dim">It runs on your GPU: your questions never leave this device.</span>
<span class="t-dim">It's downloaded once, then cached by your browser for next time.</span>
`);
  io.print(ASK_MODELS.map((m, i) => {
    const have = cached.some((u) => u.includes(variant(m)));
    return `  <button type="button" class="t-cmd" data-cmd="${i + 1}">${i + 1}</button>  ${m.name.padEnd(14)}${m.size.padStart(7)}   <span class="t-dim">${m.note}</span>${have ? '  <span class="t-ok">✓ downloaded</span>' : ""}`;
  }).join("\n"));
  const raw = (await io.read(`model [1-${ASK_MODELS.length}, Enter = ${fallback}, n = cancel] &gt;`)).trim().toLowerCase();
  if (raw === "n" || raw === "q") return null;
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

// ---------- the command ----------
async function askCommand(arg, io) {
  let question = arg.trim();
  const switching = /^--?model\b/.test(question);
  if (switching) question = question.replace(/^--?model\s*/, "");

  if (!question && !switching) {
    io.print(`<span class="t-accent">ask</span> answers questions about Anmol from this site and the CV, using an AI model on your own GPU.
Try one:
${ASK_EXAMPLES.map((q) => `  <button type="button" class="t-cmd" data-cmd="ask ${escapeHtml(q)}">ask ${escapeHtml(q)}</button>`).join("\n")}
<span class="t-dim">ask --model to change model.</span>`);
    return;
  }

  const index = await buildAskIndex();
  const gpu = await gpuInfo();
  if (!gpu) {
    // no WebGPU: still show the most relevant parts of the site
    const hits = retrieve(index, question, 2);
    if (!hits.length) return io.print(`Nothing on the site matches that. You can ask Anmol at <a href="mailto:${EMAIL}">${EMAIL}</a>.`);
    io.print('<span class="t-dim">Your browser has no WebGPU, so there\'s no AI answer here. These are the parts of the site that match best:</span>\n');
    hits.forEach((d) => io.print(`<span class="t-accent">${escapeHtml(d.title)}</span>\n${escapeHtml(d.text.slice(0, 420))}${d.text.length > 420 ? "…" : ""}\n`));
    return;
  }

  if (!askEngine || switching) {
    const model = await chooseModel(io, gpu);
    if (!model) return io.print('<span class="t-dim">Cancelled.</span>');
    if (!(await loadModel(io, model))) return;
    if (!question) return;
    io.print("");
  }

  // retrieve, then generate an answer grounded in what was retrieved
  // if none of the question's specific words appear anywhere on the site, don't let the model guess
  const specific = tokens(question).filter((t) => !GENERIC.has(t));
  const onSite = (t) => index.df.has(t) || (SYN[t] || []).some((x) => index.df.has(x));
  if (specific.length && !specific.some(onSite)) {
    io.print(IDK);
    return;
  }

  // for questions about work, the CV's experience section goes first: it keeps the internship and the research role apart
  const ranked = retrieve(index, question, 6);
  const anchor = ranked.find((d) => d.title === "CV: Experience");
  const hits = ranked.filter((d) => d !== anchor).slice(0, 3);
  const context = [anchor, ...hits].filter(Boolean).map((d, i) => `[${i + 1}] ${d.title}\n${d.text}`).join("\n\n");
  let text = "", stopped = false;
  const stop = () => { stopped = true; askEngine.interruptGenerate(); };
  io.busy(stop, false);
  const out = io.el('<span class="t-dim">thinking…  (Esc or Ctrl+C to stop)</span>');
  try {
    const stream = await askEngine.chat.completions.create({
      messages: [{ role: "system", content: ASK_SYSTEM }, { role: "user", content: `CONTEXT:\n${context}\n\nQUESTION: ${question}\n\n${ASK_REMINDER}` }],
      temperature: 0.1, top_p: 0.9, frequency_penalty: 0.3, max_tokens: 260, stream: true,
    });
    for await (const chunk of stream) {
      text += chunk.choices[0]?.delta?.content || "";
      out.textContent = text.replace(/\*\*|__|^#+\s*/gm, "");
      io.scroll();
    }
  } catch (e) {
    if (!stopped) out.innerHTML = `<span class="t-err">Something went wrong: ${escapeHtml(String(e.message || e).slice(0, 160))}</span>`;
  } finally {
    io.busy(null);
  }
  if (stopped) io.print('<span class="t-dim">(stopped)</span>');

  // where the answer came from, clickable
  const seen = new Set(), sources = hits.filter((d) => !seen.has(d.id) && seen.add(d.id));
  if (sources.length && !/^I don't know/i.test(text.trim())) {
    io.print(`<span class="t-dim">sources:</span> ${sources.map((d) => `<button type="button" class="t-cmd t-file" data-cmd="open ${d.id}">${escapeHtml(FS[d.id].name)}</button>`).join("  ")}`);
  }
  io.print(`<span class="t-dim">${escapeHtml(askModel.name)} on your GPU · small models can make mistakes, so check the sources.</span>`);
}
