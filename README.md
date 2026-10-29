<div align="center">

# AnmolOS

**The personal site of Anmol Goyal, built as a tiny desktop operating system that runs in your browser.**

[![Live site](https://img.shields.io/badge/live-anmol--goyal.com-3b82f6?style=flat-square)](https://anmol-goyal.com)
[![GitHub Pages](https://img.shields.io/badge/hosted%20on-GitHub%20Pages-222?style=flat-square&logo=github)](https://pages.github.com)
![No build step](https://img.shields.io/badge/build%20step-none-28c840?style=flat-square)
![Vanilla JS](https://img.shields.io/badge/vanilla-JS%20%2B%20CSS-f7df1e?style=flat-square&logo=javascript&logoColor=black)
[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-d97757?style=flat-square)](https://claude.com/claude-code)

<a href="https://anmol-goyal.com">
  <img src=".github/preview.png" alt="AnmolOS: a desktop with folders, a dock and a terminal showing a welcome screen" width="900">
</a>

</div>

---

## About

Instead of a scrolling page, the portfolio is a desktop. Folders on the left hold my experience, research, projects and CV. A dock sits at the bottom, and a terminal greets you when the site loads. You can drag windows around, open documents, flick through photos, read the CV or send me a message without leaving the page.

I'm a Maths with Statistics student at **King's College London** and a visiting student AI researcher at **Oxford Dynamics**. I work on robotics, physical AI and **liquid neural networks**.

## How this was built

I designed and led this project, and used **[Claude Code](https://claude.com/claude-code)**, an AI coding agent, to write most of the implementation. My part was the engineering around the code: deciding what to build and how it should behave, setting the requirements, reviewing what came back, testing it on real devices, and tracking down what was broken until it was fixed. Here's what that looked like in practice.

**Product & design**
- **I set the concept.** The first version was a conventional scrolling portfolio. I didn't think it said anything about me, so I pointed at desktop-style sites I admired and changed direction to a browser "operating system".
- **I made the calls on what to cut.** An iteration with LaTeX equations and canvas diagrams looked worse in the browser than on paper, so I scrapped it rather than polishing it.
- **I designed the information architecture**: an *Experience* folder with *Oxford Dynamics* and *Leadership* inside, each with its own notes and a *Photos* folder, plus the desktop layout, wallpaper and dock.
- **I came up with the features that give it personality**: the terminal greeting you on load, a `reboot` command that plays a full shutdown and boot sequence, and a `cd` that actually navigates instead of just opening windows.

**The arm controller and the agent**
- **I came up with both.** Putting the controller from my internship on the site so visitors can drive a UR7e, and an AI version of me that runs on the visitor's own GPU, with no server and nothing leaving their device.
- **I set the bar for the arm.** I rejected the first version: I wanted my own `client.py` commands reproduced faithfully, in its own terminal window like the real setup, driving an accurate UR7e model rather than a hand-drawn arm.
- **I shaped how the agent behaves.** Speaking in the first person as me, letting visitors choose the model, knowing the whole site rather than only my research, and offering to open things ("show me your CV" → "Want me to open it?").
- **I tuned it by using it.** I found its guardrails were refusing friendly questions, that it fixated on my research, that it crashed my phone when loading a model, and that it misread terminal commands typed into the chat. Each one led to a fix, including a no-download lite mode for phones.

**Testing & debugging**

I tested every change in a real browser and on my phone. Most of the bugs fixed here are ones I found and reported:
- Project links that didn't open.
- Email buttons that did nothing on machines without a mail app. This led to building a real send-from-site contact form.
- The minimise button failing on maximised windows. The root cause was a CSS `display` rule overriding the `hidden` attribute.
- Contact messages taking over a minute to send. I pushed for a fix, which meant moving to a faster email provider and sending in the background with notifications.
- Stale versions after deploys, which led to cache-busting on every asset.

**Engineering & ops**
- Set up SSH deploys to GitHub Pages and the custom domain's DNS, including GitHub domain verification.
- Configured and verified the form-to-email services end to end with real messages.
- Asked the security question before anyone else did ("is this site secure?"). That led to a Content Security Policy, a referrer policy, input escaping, and a review of old endpoints left in the repo's history.

**Content & accuracy**

I reviewed every claim on the site and in the CV against what I actually did, and corrected what didn't match. An AI tool is only as trustworthy as the person checking its output.

> The way I see it: AI tools let one person move at the speed of a small team. What still matters is taste, judgement, and the persistence to test, find what's broken and insist it's fixed. That's the part of this project I'm proudest of.

## Features

| | |
|---|---|
| 🖥️ **Desktop and windows** | Drag, focus, minimise, maximise and close windows, like a real OS. Anything you open that isn't in the dock pops into it while it's running, like on a Mac |
| 📁 **File system** | Nested folders with Markdown-style docs and photo galleries |
| ⌨️ **Terminal** | Opens on load with an ASCII welcome; real commands with a working `cd`, Tab completion, history and clickable shortcuts |
| 🦾 **Arm controller** | The robot-arm controller I wrote in my internship (ROS 2 + MoveIt), ported to the browser: `client.py` runs in its own terminal window and drives a real UR7e model in a WebGL viewer |
| 🤖 **anmol, my AI agent** | Type `agent` in the terminal, or open Projects → Anmol Agent, to chat with an AI version of me. It answers in the first person from my site, this README and my CV, and offers to open things for you ("show me your CV" → "Want me to open it?"). It runs entirely in the visitor's browser, on their GPU, and nothing leaves their device |
| ✉️ **Contact form** | Sends a message straight to my inbox in the background, with notifications for progress, success and failure |
| 📄 **CV viewer** | The PDF opens in a window, with buttons to open it in a new tab or download it |
| 📱 **Mobile layout** | On phones it becomes a home-screen grid with full-screen apps |
| 🔒 **Locked down** | Content Security Policy, no third-party scripts, all user input and AI output escaped, a rate-limited contact form, and an agent that can't be talked out of its rules or into sharing personal details |
| 🪶 **No build step** | Plain HTML, CSS and JavaScript. The only library, WebLLM, is loaded on demand when someone starts the agent |

## Things to try

- **Drive a real robot arm.** Open Projects → Arm Controller → Launch Controller, or type `controller` in the terminal. A terminal runs a port of the ROS 2 controller I wrote during my internship, and a 3D UR7e arm moves as you type commands like `move z 100` or `pick_and_place`.
- **Chat with me.** Type `agent` in the terminal, or open Projects → Anmol Agent → Launch Agent. It's an AI version of me that knows my site and CV, so ask it what I'm working on or what's fun to try here. Say "show me your CV" or "how do I contact you?" and it offers to open the right thing on screen. On a phone, pick lite mode.
- **Get around like a real terminal.** `cd Experience`, `ls`, `cat "About Me.txt"`, `open .` and Tab completion all work, and everything `ls` prints is clickable.
- **Reboot the computer.** Type `reboot` to watch every app close, the system shut down and boot back up.
- **Find the easter eggs.** Try `sudo`, `neofetch` or `whoami`.
- **Use it like a desktop.** Drag windows, maximise them with the green button or a double-click on the title bar, and minimise them with yellow. On a phone it turns into a home screen with full-screen apps.
- **Send me a message** from Contact → Email without leaving the page.

## What's on the desktop

```
~/
├── About Me.txt
├── Experience/
│   ├── Experience.md
│   ├── Oxford Dynamics/
│   │   ├── Oxford Dynamics.md
│   │   └── Photos/
│   └── Leadership/
│       ├── Leadership.md
│       └── Photos/
├── Research/
│   ├── Liquid Neural Networks.md
│   └── Reading List.txt
├── Projects/
│   ├── Arm Controller/
│   │   ├── Launch Controller   (client.py in a terminal + the UR7e in a 3D viewer)
│   │   └── README.md           how to drive the arm
│   └── Anmol Agent/
│       ├── Launch Agent        (chat with an AI version of me in its own terminal)
│       └── README.md           how the agent works
├── CV/
│   └── Anmol_Goyal_CV.pdf
├── Contact/           → Contact.md, Email, LinkedIn, GitHub, Site Source
└── Terminal
```

## Terminal commands

```console
anmol@kcl:~$ help
```

| Command | What it does |
|---|---|
| `agent` | Chat with anmol, an AI version of me that can also open things for you (`exit` or Esc to leave) |
| `ask <question>` | Ask anmol a single question |
| `research` | Open my current research on liquid neural networks |
| `experience` | Open my experience |
| `cv` | Open my CV |
| `controller` | Launch my robot-arm controller |
| `email` | Write me a message |
| `contact` | Print my links |
| `cd <folder>`, `cd ..`, `cd ~` | Move around the file system (the prompt shows where you are) |
| `ls`, `pwd` | List the current folder (click an entry to go into it or open it), print the path |
| `cat <file>` | Read a document right in the terminal |
| `open <name>`, `open .` | Open a file or the current folder in a window |
| `about`, `whoami`, `photos` | Who I am |
| `reboot` | Shut everything down and boot again |
| `neofetch`, `date`, `echo`, `clear`, `exit` | The usual |

There are also a couple of easter eggs. Try `sudo`.

## Project structure

```
.
├── index.html               shell markup + <template> blocks holding each document's content
├── assets/
│   ├── css/style.css        windows, dock, terminal, notifications, light/dark + mobile layouts
│   ├── js/main.js           file system, window manager, terminal, contact form, boot screen
│   ├── js/ask.js            the agent: retrieval, model or lite-mode replies, actions
│   ├── js/vendor/           WebLLM 0.2.86 (Apache-2.0), loaded only when the agent loads a model
│   ├── data/cv.json         CV text as passages for the agent (regenerate when the CV changes)
│   ├── js/arm.js            arm controller: client.py port, UR7e kinematics, IK + planners, WebGL viewer
│   ├── models/ur7e/         UR7e meshes converted from Universal Robots' ROS 2 description (BSD-3-Clause)
│   ├── img/                 wallpaper, Oxford Dynamics and event photos
│   └── cv/                  CV (PDF)
├── cv-src/                LaTeX source for the CV (build with latexmk, copy the PDF to assets/cv/)
├── favicon.ico
└── CNAME                    custom domain → anmol-goyal.com
```

## How it works

- **The file system** is the `FS` object at the top of `main.js`. Each entry is a `folder`, `doc`, `image`, `pdf`, `link`, `compose`, `photos` or `terminal`. A folder lists its children by id, and the window title path (e.g. *Experience / Oxford Dynamics / Photos*) is worked out from the tree.
- **Documents** live in `<template>` elements in `index.html`, so the content is plain HTML that's easy to edit.
- **The window manager** handles stacking order, dragging with pointer events, minimise to the dock and maximise. Windows open in a slight cascade so they don't stack exactly on top of each other.
- **The contact form** posts to [Web3Forms](https://web3forms.com) from the browser. The window closes as soon as you hit send, and a notification tracks the message. If sending fails, your draft is kept and you get a *Try again* button.
- **The arm controller** opens two windows. The terminal runs a line-by-line JavaScript port of my ROS 2 `client.py`, with the same commands, prompts, messages and error handling. A small planner stands in for `motion_server.py` and MoveIt: a damped least-squares IK solver, Cartesian paths in 5 mm steps, and joint-space moves. The viewer draws the real UR7e meshes with a hand-written WebGL renderer, posed with the kinematic chain from the official URDF (`base_link` frame). The meshes come from [Universal Robots' ROS 2 description](https://github.com/UniversalRobots/Universal_Robots_ROS2_Description) (BSD-3-Clause, licence in `assets/models/ur7e/`), converted to a compact binary.
- **Caching:** GitHub Pages caches pages for 10 minutes, so the CSS and JS are loaded with a `?v=N` query string. Bump `N` in `index.html` whenever they change.

### The agent

`agent` (and `ask` for a single question) is retrieval-augmented generation that runs entirely in the browser.

- **What it knows.** The desktop documents (split at their headings), this README (fetched live from the site, minus the developer-only sections) and my CV (`assets/data/cv.json`) are split into passages and indexed with BM25. Updating this README updates what the agent knows on the next page load.
- **How it answers.** Each message pulls the few best-matching passages. An open model, run with [WebLLM](https://github.com/mlc-ai/web-llm) on WebGPU, answers as me in the first person using only those passages, and lists them as clickable sources. The chat remembers the last two exchanges, so follow-ups like "tell me more" work.
- **Models.** Visitors choose Llama 3.2 3B (1.8 GB, recommended) or Llama 3.1 8B (4.5 GB). The model downloads once and the browser caches it. Nothing is sent to a server.
- **Lite mode.** No model at all: it works out what kind of question was asked (current work, internship, studies, skills, the arm, things to try and so on) and replies with the most relevant lines from the site and CV, turned into first person. It's the default on phones, which don't give a browser tab enough memory for a model, and in browsers without WebGPU. If loading a model ever closes the tab, a flag left in `localStorage` makes the agent suggest lite mode on the next visit.
- **Opening things.** When something on the site answers the question (my CV, the email window, the arm controller, my research notes, photos and so on), the agent says where to find it and asks "Want me to open it?", then opens it on a yes. These offers come from a fixed list in `ask.js` matched against the question, not from the model, so they behave the same with every model and in lite mode.
- **Keeping it accurate.**
  - The rule "answer only from these passages" is stated before and after the question, at a low temperature.
  - If none of a question's real topics appear anywhere on the site, it says so without asking the model at all. Greetings and time words ("hey", "at the moment") don't count as topics.
  - The CV's experience section is included for work questions, today's date is given to the model, and date ranges are spelled out ("from June 2026 to September 2026"), so roles and tenses don't get mixed up.
  - I tested six models through whole conversations full of trick questions and kept the two that never made anything up.
- **Safety.**
  - Attempts to override the agent ("ignore your instructions", "you are now…", "pretend to be…") get a fixed reply and never reach the model.
  - Questions about personal details like a phone number, address or age get a fixed reply pointing to email, so the model can't guess.
  - Messages are capped at 300 characters, and everything the model writes is escaped before it's shown, so it can't inject anything into the page.
  - The agent can only open things from its fixed list; the model itself can't trigger anything.
  - The model files are pinned: weights to an exact Hugging Face revision, and the compiled runtime to an exact commit with its SHA-384 hash checked before it runs.

### Adding something to the desktop

1. Add an entry to `FS` in `assets/js/main.js`:
   ```js
   talks: { name: "Talks.md", type: "doc", tpl: "doc-talks", w: 620, h: 560 },
   ```
2. Add its id to a folder's `children`, or to `home` to put it on the desktop.
3. For a doc, add the matching template to `index.html`:
   ```html
   <template id="doc-talks"> ... </template>
   ```

## Run it locally

```bash
git clone git@github.com:AG-droid/Ag-droid.github.io.git
cd Ag-droid.github.io
python3 -m http.server 8000
```

Then open <http://localhost:8000>. A local server is needed (instead of opening the file directly) so the CV preview and security policy behave the same as on the live site.

## Deployment

Every push to `master` is published by **GitHub Pages** to [anmol-goyal.com](https://anmol-goyal.com). The domain is set in `CNAME` and verified with GitHub, and HTTPS is enforced.

## Contact

<p>
  <a href="https://anmol-goyal.com">Website</a> ·
  <a href="mailto:anmol.goyal@kcl.ac.uk">anmol.goyal@kcl.ac.uk</a> ·
  <a href="https://www.linkedin.com/in/anmolxgoyal/">LinkedIn</a> ·
  <a href="https://github.com/AG-droid">GitHub</a>
</p>

<sub>© Anmol Goyal. The code is free to learn from; please don't reuse my personal content, photos or CV.</sub>
