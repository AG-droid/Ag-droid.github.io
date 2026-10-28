<div align="center">

# AnmolOS

**The personal site of Anmol Goyal, built as a tiny desktop operating system that runs in your browser.**

[![Live site](https://img.shields.io/badge/live-anmol--goyal.com-3b82f6?style=flat-square)](https://anmol-goyal.com)
[![GitHub Pages](https://img.shields.io/badge/hosted%20on-GitHub%20Pages-222?style=flat-square&logo=github)](https://pages.github.com)
![No frameworks](https://img.shields.io/badge/dependencies-none-28c840?style=flat-square)
![Vanilla JS](https://img.shields.io/badge/vanilla-JS%20%2B%20CSS-f7df1e?style=flat-square&logo=javascript&logoColor=black)

<a href="https://anmol-goyal.com">
  <img src=".github/preview.png" alt="AnmolOS: a desktop with folders, a dock and a terminal showing a welcome screen" width="900">
</a>

</div>

---

## About

Instead of a scrolling page, the portfolio is a desktop. Folders on the left hold my experience, research, projects and CV. A dock sits at the bottom, and a terminal greets you when the site loads. You can drag windows around, open documents, flick through photos, read the CV or send me a message without leaving the page.

I'm a Maths with Statistics student at **King's College London** and a visiting student AI researcher at **Oxford Dynamics**. I work on robotics, physical AI and **liquid neural networks**.

## Features

| | |
|---|---|
| 🖥️ **Desktop and windows** | Drag, focus, minimise, maximise and close windows, like a real OS |
| 📁 **File system** | Nested folders with Markdown-style docs and photo galleries |
| ⌨️ **Terminal** | Opens on load with an ASCII welcome; real commands with history and clickable shortcuts |
| ✉️ **Contact form** | Sends a message straight to my inbox in the background, with notifications for progress, success and failure |
| 📄 **CV viewer** | The PDF opens in a window, with buttons to open it in a new tab or download it |
| 📱 **Mobile layout** | On phones it becomes a home-screen grid with full-screen apps |
| 🔒 **Locked down** | Content Security Policy, no third-party scripts, all user input escaped |
| 🪶 **Zero dependencies** | Plain HTML, CSS and JavaScript, with no build step |

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
├── Projects/          → QuantBox, React experiments, Space Invaders, GitHub
├── CV/
│   └── Anmol_Goyal_CV.pdf
├── Contact/           → Contact.md, Email, LinkedIn, GitHub
└── Terminal
```

## Terminal commands

```console
anmol@kcl:~$ help
```

| Command | What it does |
|---|---|
| `research` | Open my current research on liquid neural networks |
| `experience` | Open my experience |
| `cv` | Open my CV |
| `email` | Write me a message |
| `contact` | Print my links |
| `ls`, `open <name>`, `cd`, `cat` | Explore the file system |
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
│   ├── img/                 wallpaper, Oxford Dynamics and event photos
│   └── cv/                  CV (PDF)
├── favicon.ico
└── CNAME                    custom domain → anmol-goyal.com
```

## How it works

- **The file system** is the `FS` object at the top of `main.js`. Each entry is a `folder`, `doc`, `image`, `pdf`, `link`, `compose`, `photos` or `terminal`. A folder lists its children by id, and the window title path (e.g. *Experience / Oxford Dynamics / Photos*) is worked out from the tree.
- **Documents** live in `<template>` elements in `index.html`, so the content is plain HTML that's easy to edit.
- **The window manager** handles stacking order, dragging with pointer events, minimise to the dock and maximise. Windows open in a slight cascade so they don't stack exactly on top of each other.
- **The contact form** posts to [Web3Forms](https://web3forms.com) from the browser. The window closes as soon as you hit send, and a notification tracks the message. If sending fails, your draft is kept and you get a *Try again* button.
- **Caching:** GitHub Pages caches pages for 10 minutes, so the CSS and JS are loaded with a `?v=N` query string. Bump `N` in `index.html` whenever they change.

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
