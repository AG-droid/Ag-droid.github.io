// ===================== Arm controller =====================
// Browser port of the command-line controller I wrote for a UR7e during my
// internship (client.py + motion_server.py on ROS 2 and MoveIt). The commands,
// modes and waypoint logic are the same; a small kinematics solver stands in
// for MoveIt and a canvas drawing stands in for the real arm.

const ARM = {
  // UR7e DH parameters (same kinematics as the UR5e), in metres and radians
  d: [0.1625, 0, 0, 0.1333, 0.0997, 0.0996],
  a: [0, -0.425, -0.3922, 0, 0, 0],
  alpha: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0],
  joints: ["shoulder_pan_joint", "shoulder_lift_joint", "elbow_joint", "wrist_1_joint", "wrist_2_joint", "wrist_3_joint"],
  limits: [2 * Math.PI, 2 * Math.PI, Math.PI, 2 * Math.PI, 2 * Math.PI, 2 * Math.PI],
  tool: 0.11, // gripper length past the flange; the TCP sits at its tip
};

// ---------- small vector / rotation helpers (3-vectors, row-major 3x3) ----------
const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => Math.hypot(a[0], a[1], a[2]),
  unit: (a) => v3.scale(a, 1 / (v3.norm(a) || 1)),
};
const mulR = (A, B) => {
  const r = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return r;
};
const mulRv = (R, v) => [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];
const tR = (R) => [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]];
const colR = (R, j) => [R[j], R[3 + j], R[6 + j]];
// rotation matrix from a rotation vector (axis * angle)
function expR(w) {
  const th = v3.norm(w);
  if (th < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const [x, y, z] = v3.scale(w, 1 / th), c = Math.cos(th), s = Math.sin(th), C = 1 - c;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s,
          y * x * C + z * s, c + y * y * C, y * z * C - x * s,
          z * x * C - y * s, z * y * C + x * s, c + z * z * C];
}
// rotation vector from a rotation matrix
function logR(R) {
  const th = Math.acos(Math.max(-1, Math.min(1, (R[0] + R[4] + R[8] - 1) / 2)));
  if (th < 1e-9) return [0, 0, 0];
  if (th > Math.PI - 1e-6) {
    // at 180° the axis comes from the diagonal of R = 2nnᵀ - I
    const n = [0, 4, 8].map((i) => Math.sqrt(Math.max(0, (R[i] + 1) / 2)));
    if (n[0] >= n[1] && n[0] >= n[2]) { n[1] *= Math.sign(R[1]) || 1; n[2] *= Math.sign(R[2]) || 1; }
    else if (n[1] >= n[2]) { n[0] *= Math.sign(R[1]) || 1; n[2] *= Math.sign(R[5]) || 1; }
    else { n[0] *= Math.sign(R[2]) || 1; n[1] *= Math.sign(R[5]) || 1; }
    return v3.scale(n, th);
  }
  const k = th / (2 * Math.sin(th));
  return [(R[7] - R[5]) * k, (R[2] - R[6]) * k, (R[3] - R[1]) * k];
}

// ---------- kinematics ----------
// Frames of every joint: F[0] is the base, F[1..6] follow each joint, F[7] is the TCP
function frames(q) {
  const F = [{ R: [1, 0, 0, 0, 1, 0, 0, 0, 1], p: [0, 0, 0] }];
  for (let i = 0; i < 6; i++) {
    const ct = Math.cos(q[i]), st = Math.sin(q[i]), ca = Math.cos(ARM.alpha[i]), sa = Math.sin(ARM.alpha[i]);
    const L = { R: [ct, -st * ca, st * sa, st, ct * ca, -ct * sa, 0, sa, ca], p: [ARM.a[i] * ct, ARM.a[i] * st, ARM.d[i]] };
    const P = F[i];
    F.push({ R: mulR(P.R, L.R), p: v3.add(P.p, mulRv(P.R, L.p)) });
  }
  const f = F[6];
  F.push({ R: f.R, p: v3.add(f.p, v3.scale(colR(f.R, 2), ARM.tool)) });
  return F;
}
const tcp = (q) => frames(q)[7];

// solve A x = b for a small dense system (Gaussian elimination, partial pivoting)
function solve(A, b) {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

// Damped least-squares IK from a seed; returns joint angles or null
function ik(seed, target, iters = 80) {
  const q = seed.slice();
  for (let it = 0; it < iters; it++) {
    const F = frames(q), T = F[7];
    const ep = v3.sub(target.p, T.p);
    const eo = mulRv(T.R, logR(mulR(tR(T.R), target.R)));
    if (v3.norm(ep) < 2e-5 && v3.norm(eo) < 2e-4) return q;
    // geometric Jacobian, one column per joint (joint i turns about z of frame i)
    const J = [[], [], [], [], [], []];
    for (let i = 0; i < 6; i++) {
      const z = colR(F[i].R, 2), lin = v3.cross(z, v3.sub(T.p, F[i].p));
      for (let r = 0; r < 3; r++) { J[r][i] = lin[r]; J[r + 3][i] = z[r]; }
    }
    const e = [...ep, ...eo], lambda2 = 1e-4;
    const JJt = J.map((ri, i) => J.map((rj, j) => ri.reduce((s, v, k) => s + v * rj[k], 0) + (i === j ? lambda2 : 0)));
    const y = solve(JJt, e);
    let dq = [0, 1, 2, 3, 4, 5].map((k) => J.reduce((s, row, r) => s + row[k] * y[r], 0));
    const big = Math.max(...dq.map(Math.abs));
    if (big > 0.25) dq = dq.map((d) => d * 0.25 / big);
    for (let k = 0; k < 6; k++) q[k] = Math.max(-ARM.limits[k], Math.min(ARM.limits[k], q[k] + dq[k]));
  }
  const T = tcp(q);
  return v3.norm(v3.sub(target.p, T.p)) < 1e-4 && v3.norm(logR(mulR(tR(T.R), target.R))) < 1e-3 ? q : null;
}

// Rough collision check: the floor, and the tool coming back into the base column
function collides(q) {
  const F = frames(q);
  for (let i = 2; i <= 7; i++) if (F[i].p[2] < (i === 7 ? 0.005 : 0.04)) return "the floor";
  const tip = F[7].p;
  if (Math.hypot(tip[0], tip[1]) < 0.09 && tip[2] < 0.3) return "the robot's own base";
  return null;
}

const maxDiff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
const lerpPose = (A, B, w, dp, s) => ({ p: v3.add(A.p, v3.scale(dp, s)), R: mulR(A.R, expR(v3.scale(w, s))) });

// ---------- planners (what motion_server.py does with MoveIt) ----------
// Cartesian: the TCP moves along a straight line in 5 mm steps, like computeCartesianPath
function planCartesian(q0, goal) {
  const start = tcp(q0), dp = v3.sub(goal.p, start.p), w = logR(mulR(tR(start.R), goal.R));
  const n = Math.max(2, Math.ceil(Math.max(v3.norm(dp) / 0.005, v3.norm(w) / 0.03)));
  const path = [q0];
  let q = q0, why = null;
  for (let i = 1; i <= n; i++) {
    const nq = ik(q, lerpPose(start, goal, w, dp, i / n), 60);
    if (!nq) why = "no IK solution along the line (out of reach or near a singularity)";
    else if (maxDiff(nq, q) > 0.3) why = "the arm would have to flip its joints mid-path";
    else if (collides(nq)) why = `the path collides with ${collides(nq)}`;
    if (why) return { path, fraction: (i - 1) / n, why };
    path.push(nq);
    q = nq;
  }
  return { path, fraction: 1 };
}

// Joint space: one IK solve near the current configuration, then move every joint together
function planJoint(q0, goal) {
  // walk the IK along the line first so the solution stays close to where the arm is
  const start = tcp(q0), dp = v3.sub(goal.p, start.p), w = logR(mulR(tR(start.R), goal.R));
  const n = Math.max(1, Math.ceil(Math.max(v3.norm(dp) / 0.03, v3.norm(w) / 0.15)));
  let q = q0;
  for (let i = 1; i <= n && q; i++) q = ik(q, lerpPose(start, goal, w, dp, i / n), 100);
  q = q || ik(q0, goal, 400);
  if (!q) return { why: "no IK solution for the target pose (out of reach)" };
  return jointPath(q0, q);
}
function jointPath(q0, q1) {
  const steps = Math.max(2, Math.ceil(maxDiff(q0, q1) / 0.02));
  const path = [];
  for (let i = 0; i <= steps; i++) {
    const q = q0.map((v, k) => v + (q1[k] - v) * (i / steps));
    const hit = collides(q);
    if (hit) return { why: `the joint-space path collides with ${hit}` };
    path.push(q);
  }
  return { path, joint: true };
}

// ---------- the app ----------
const deg = (r) => r * 180 / Math.PI, rad = (d) => d * Math.PI / 180;

function armController(body) {
  body.classList.add("win__body--arm");
  body.innerHTML = `
    <div class="arm">
      <div class="arm__view">
        <canvas aria-label="Simulated UR7e robot arm"></canvas>
        <div class="arm__hud arm__hud--tl"><span class="arm__chip">UR7e · simulated in your browser</span><span class="arm__chip arm__mode"></span></div>
        <div class="arm__hud arm__hud--tr">drag to orbit<br>scroll to zoom<br>double-click to reset</div>
        <pre class="arm__hud arm__hud--bl arm__readout"></pre>
      </div>
      <div class="arm__side">
        <div class="term arm__term"><pre class="term__out"></pre><div class="term__line" hidden><span class="term__prompt"></span><input aria-label="Controller input" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>
        <div class="arm__chips" aria-label="Example commands"></div>
      </div>
    </div>`;
  const canvas = $("canvas", body), ctx = canvas.getContext("2d");
  const termEl = $(".arm__term", body), out = $(".term__out", body), line = $(".term__line", body);
  const promptEl = $(".term__prompt", body), input = $("input", body);
  const readout = $(".arm__readout", body), modeChip = $(".arm__mode", body);

  // ----- state (what client.py keeps on the node, plus states.json / trajectories.json) -----
  const HOME = [0, -90, 90, -90, -90, 0].map(rad);
  let q = HOME.slice(), isLocal = false, jointSpace = false, running = false;
  let trail = [], ghost = null;

  const down = { R: tcp(HOME).R };
  const at = (x, y, z) => ik(HOME, { p: [x, y, z], R: down.R }, 300);
  const DEFAULT_POSES = {
    home: HOME,
    pick_above: at(-0.5, 0.2, 0.25), pick: at(-0.5, 0.2, 0.08),
    place_above: at(-0.3, -0.45, 0.25), place: at(-0.3, -0.45, 0.08),
    up: [0, -90, 0, -90, 0, 0].map(rad),
  };
  const trajectories = { pick_and_place: ["home", "pick_above", "pick", "pick_above", "place_above", "place", "place_above", "home"] };
  const states = { joint_names: ARM.joints, poses: { ...DEFAULT_POSES } };
  try { Object.assign(states.poses, JSON.parse(localStorage.getItem("arm-states") || "{}")); } catch (e) { /* storage unavailable */ }
  const persist = () => {
    const mine = Object.fromEntries(Object.entries(states.poses).filter(([k]) => !(k in DEFAULT_POSES)));
    try { localStorage.setItem("arm-states", JSON.stringify(mine)); } catch (e) { /* storage unavailable */ }
  };

  // ----- terminal output -----
  const print = (html = "") => { out.insertAdjacentHTML("beforeend", html + "\n"); termEl.scrollTop = termEl.scrollHeight; };
  const stamp = () => (Date.now() / 1000).toFixed(9);
  const info = (node, msg) => print(`<span class="t-dim">[INFO] [${stamp()}] [${node}]:</span> ${msg}`);
  const error = (node, msg) => print(`<span class="t-err">[ERROR] [${stamp()}] [${node}]: ${msg}</span>`);
  const CLIENT = "user_interaction_node", SERVER = "motion_planner_and_executor_node";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // input() equivalent: resolves with the next line the user enters
  const history = [];
  let hIndex = 0, pending = null;
  const readLine = (text) => new Promise((resolve) => {
    promptEl.textContent = text;
    line.hidden = false;
    pending = resolve;
    termEl.scrollTop = termEl.scrollHeight;
    if (!mobile.matches && document.activeElement !== input && body.closest(".win:not(.is-inactive)")) input.focus({ preventScroll: true });
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && pending) {
      const raw = input.value, done = pending;
      input.value = "";
      pending = null;
      line.hidden = true;
      print(`<span class="term__prompt">${escapeHtml(promptEl.textContent)}</span>${escapeHtml(raw)}`);
      if (raw.trim()) { history.push(raw); hIndex = history.length; }
      done(raw);
    } else if (e.key === "ArrowUp" && hIndex > 0) { input.value = history[--hIndex]; e.preventDefault(); }
    else if (e.key === "ArrowDown") { hIndex = Math.min(history.length, hIndex + 1); input.value = history[hIndex] || ""; }
  });
  termEl.addEventListener("click", (e) => {
    const c = e.target.closest(".t-cmd");
    if (c) { c.dataset.relaunch ? launch() : type(c.dataset.cmd); return; }
    if (!window.getSelection().toString()) input.focus();
  });

  // example commands under the terminal, typed in for you
  const CHIPS = ["help", "move z 100", "move x -150", "move ry 30", "mode gj", "mode gc", "pick_and_place", "home"];
  $(".arm__chips", body).innerHTML = CHIPS.map((c) => `<button type="button" class="arm__chipbtn">${c}</button>`).join("");
  $(".arm__chips", body).addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) type(b.textContent); });
  function type(cmd) {
    if (!pending || !promptEl.textContent.startsWith("Enter Command")) return;
    input.value = cmd;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  }

  // ----- help (help.json in the original, printed the same way) -----
  const HELP = {
    help: ["List every command --> help", "Show the format for one command --> help <command>"],
    move: ["To move around the cartesian plane --> move <x/y/z> <mm>", "To rotate the end effector --> move <rx/ry/rz> <degrees>"],
    mode: ["Set the movement mode --> mode <l/g><j/c>", "l = local (tool frame), g = global (base frame); j = joint space, c = cartesian (straight line)"],
    save: ["Save the current pose as a waypoint --> save <name>"],
    list_states: ["List the saved waypoints --> list_states"],
    list_trajectories: ["List the saved trajectories --> list_trajectories"],
    waypoint: ["Go back to a saved waypoint --> <waypoint name>", "Run a saved trajectory from its first waypoint --> <trajectory name>"],
    q: ["Quit the controller --> q"],
  };
  function printHelp(topic) {
    let items = HELP;
    if (topic) {
      if (!HELP[topic]) return print(`\n  No help for '${escapeHtml(topic)}'. Commands: ${Object.keys(HELP).join(", ")}\n`);
      items = { [topic]: HELP[topic] };
    }
    const pad = Math.max(...Object.keys(HELP).map((k) => k.length));
    const lines = [""];
    for (const [name, rows] of Object.entries(items)) {
      rows.forEach((row, i) => {
        const label = i === 0 ? `  <span class="t-accent">${name.padEnd(pad)}</span> : ` : " ".repeat(pad + 5);
        lines.push(label + (rows.length > 1 ? `${i + 1}. ` : "") + escapeHtml(row));
      });
      lines.push("");
    }
    print(lines.join("\n"));
  }

  // ----- motion: plan, log like the planner node, then animate -----
  function execute(path, seconds) {
    return new Promise((resolve) => {
      const t0 = performance.now(), n = path.length - 1;
      const step = (now) => {
        if (!body.isConnected) return resolve();
        const s = Math.min(1, (now - t0) / (seconds * 1000));
        const u = (s * s * (3 - 2 * s)) * n, i = Math.min(n - 1, Math.floor(u)), f = u - i;
        q = n === 0 ? path[0].slice() : path[i].map((v, k) => v + (path[i + 1][k] - v) * f);
        trail.push(tcp(q).p);
        if (trail.length > 900) trail.shift();
        draw();
        if (s < 1) requestAnimationFrame(step);
        else { q = path[n].slice(); ghost = null; draw(); resolve(); }
      };
      requestAnimationFrame(step);
    });
  }
  const duration = (path) => {
    let joint = 0, len = 0;
    for (let i = 1; i < path.length; i++) {
      joint = Math.max(joint, maxDiff(path[i], path[0]));
      len += v3.norm(v3.sub(tcp(path[i]).p, tcp(path[i - 1]).p));
    }
    return Math.max(0.7, joint / 1.1, len / 0.18);
  };

  // target pose for "move <axis> <amount>" from the current pose
  function targetFor(axis, amount, local) {
    const T = tcp(q), i = "xyz".indexOf(axis.at(-1));
    const e = [0, 0, 0];
    e[i] = 1;
    if (axis.length === 1) {
      const dir = local ? colR(T.R, i) : e;
      return { p: v3.add(T.p, v3.scale(dir, amount)), R: T.R };
    }
    const turn = expR(v3.scale(e, amount));
    return { p: T.p, R: local ? mulR(T.R, turn) : mulR(turn, T.R) };
  }

  async function cartesianPlanner(axis, amount, local) {
    const goal = targetFor(axis, amount, local);
    ghost = goal.p;
    info(SERVER, `Planning Cartesian path: ${axis} ${describe(axis, amount)} in the ${local ? "tool" : "base"} frame (eef_step 5 mm)`);
    await sleep(250);
    const plan = planCartesian(q, goal);
    if (plan.fraction < 1) {
      ghost = null;
      draw();
      return `Cartesian path planning failed: only ${(plan.fraction * 100).toFixed(1)}% of the path could be computed, ${plan.why}.`;
    }
    info(SERVER, `Computed 100.0% of the Cartesian path (${plan.path.length} waypoints). Executing...`);
    await execute(plan.path, duration(plan.path));
    return "Path planned and executed successfully!";
  }

  async function jointSpacePlanner({ axis, amount, local, jointAngles }) {
    let plan;
    if (jointAngles) {
      info(SERVER, "Planning joint-space move to the saved joint angles");
      plan = jointPath(q, jointAngles);
    } else {
      const goal = targetFor(axis, amount, local);
      ghost = goal.p;
      info(SERVER, `Solving IK for target: ${axis} ${describe(axis, amount)} in the ${local ? "tool" : "base"} frame`);
      plan = planJoint(q, goal);
    }
    await sleep(250);
    if (!plan.path) { ghost = null; draw(); return `Joint-space planning failed: ${plan.why}.`; }
    info(SERVER, `IK solution found, joint-space trajectory with ${plan.path.length} points. Executing...`);
    await execute(plan.path, duration(plan.path));
    return "Path planned and executed successfully!";
  }
  const describe = (axis, amount) => axis.length === 1 ? `${amount >= 0 ? "+" : ""}${(amount * 1000).toFixed(1)} mm` : `${amount >= 0 ? "+" : ""}${deg(amount).toFixed(1)}°`;

  // ----- the command handlers (client.py's methods) -----
  async function motionServerCaller(message) {
    const axis = message[1] || "", raw = message.at(-1);
    const isNumber = message.length > 2 && raw !== "" && !isNaN(Number(raw));
    if (axis[0] === "r" && "xyz".includes(axis[1]) && axis.length === 2) {
      if (!isNumber) return error(CLIENT, "ERROR: Wrong Data type rotational value, please try again with correct data type.");
      // the user types degrees; the planner works in radians
      print(await (jointSpace ? jointSpacePlanner({ axis, amount: rad(Number(raw)), local: isLocal }) : cartesianPlanner(axis, rad(Number(raw)), isLocal)));
    } else if ("xyz".includes(axis[0]) && axis.length === 1) {
      if (!isNumber) return error(CLIENT, "ERROR: Wrong Data type linear value, please try again with correct data type.");
      const amount = Number(raw) / 1000; // mm -> m
      if (jointSpace) return print(await jointSpacePlanner({ axis, amount, local: isLocal }));
      // Cartesian planning can fail partway (singularity / collision along the
      // line). If it does, offer a joint-space move to the same target instead,
      // which only needs the END pose to be valid.
      const output = await cartesianPlanner(axis, amount, isLocal);
      print(output);
      if (output.toLowerCase().includes("failed")) {
        const ask = await readLine("Try via joint states instead? (y/n) ");
        if (ask.trim().toLowerCase() === "y") print(await jointSpacePlanner({ axis, amount, local: isLocal }));
      }
    } else {
      info(CLIENT, "ERROR : Wrong syntax, please try again.");
    }
  }

  function changeMode(arg) {
    const [a, b] = arg;
    if (!"lg".includes(a) || !"jc".includes(b)) return print("Wrong arguments passed, please try again.");
    isLocal = a === "l";
    jointSpace = b === "j";
    print("Status Updated Successfully!");
    syncMode();
  }

  function saveState(name) {
    const current = q.map((v) => +v.toFixed(4));
    const existing = Object.keys(states.poses).find((k) => maxDiff(states.poses[k], current) < 1e-4);
    if (existing) return print(`The waypoint you are trying to save already exists as '${escapeHtml(existing)}'`);
    states.poses[name] = current;
    persist();
    print(`Waypoint saved successfully as '${escapeHtml(name)}'`);
  }

  async function callTrajectory(name) {
    // only start if the arm is already at the trajectory's first waypoint
    if (maxDiff(q, states.poses[trajectories[name][0]]) > 1e-3) {
      error(CLIENT, "ERROR: Failed to execute trajectory as current position is away from the starting position of trajectory.");
      return print(`<span class="t-dim">(it starts at '${trajectories[name][0]}': type ${trajectories[name][0]} first)</span>`);
    }
    for (const wp of trajectories[name]) {
      print(`Executing ${wp}`);
      const output = await jointSpacePlanner({ jointAngles: states.poses[wp] });
      if (output !== "Path planned and executed successfully!") return error(CLIENT, `Failed to execute trajectory. issue at waypoint ${wp}`);
      print(`${wp} Completed!`);
    }
    print("Trajectory executed successfully!");
  }

  async function handle(ask) {
    const message = ask.split(" ");
    if (message[0] === "help") return printHelp(message[1]);
    if (message[0] === "clear") { out.innerHTML = ""; return; }
    if (message[0] === "list_states") return print(Object.keys(states.poses).map((k, i) => `${i + 1}. ${escapeHtml(k)}`).join("\n"));
    if (message[0] === "list_trajectories") return print(Object.keys(trajectories).map((k, i) => `${i + 1}. ${k}`).join("\n"));
    if (message[0] === "save" && message.length === 2) return saveState(message[1]);
    if (message[0] === "mode" && message[1]?.length === 2) return changeMode(message[1]);
    if (message[0] === "move") return motionServerCaller(message);
    if (ask in trajectories) return callTrajectory(ask);
    // anything else is a saved waypoint name; an unknown one is a KeyError in the original
    if (!(ask in states.poses)) throw new Error("unknown waypoint");
    print(await jointSpacePlanner({ jointAngles: states.poses[ask] }));
  }

  // input_handler(): the main loop, until q
  async function loop() {
    while (running) {
      print(`<span class="t-dim">Moving in ${isLocal ? "local" : "global"} with ${jointSpace ? "Joint Space" : "Cartesian"} movement (units being used : mm & angles)</span>`);
      const ask = (await readLine("Enter Command --> ")).trim().toLowerCase().replace(/\s+/g, " ");
      if (!body.isConnected) return;
      if (!ask) continue;
      if (ask === "q") break;
      try {
        await handle(ask);
      } catch (e) {
        error(CLIENT, "ERROR: Invalid input/ Wrong input format");
        print('<span class="t-dim">(type help to see the commands)</span>');
        const again = await readLine("Would you like to try again? (y/n) ");
        if (again.trim().toLowerCase() !== "y") break;
      }
    }
    running = false;
    info(CLIENT, "Shutting down: destroying nodes, rclpy.shutdown()");
    print(`<span class="t-dim">[ros2run]: Process exited cleanly</span>\n\n<button type="button" class="t-cmd" data-relaunch="1">ros2 run arm_controller client</button>  <span class="t-dim">to start it again</span>`);
  }

  async function launch() {
    if (running) return;
    running = true;
    const boot = [
      ["", `<span class="term__prompt">anmol@kcl:<b>~/Projects</b>$</span> ros2 run arm_controller client`],
      [SERVER, `Loading robot model 'ur7e' (6 joints), planning group 'ur_manipulator'`],
      [SERVER, "Cartesian planner ready (eef_step 5 mm), joint-space planner ready"],
      [CLIENT, "Waiting for /compute_fk service... available"],
      [CLIENT, `Loaded ${Object.keys(states.poses).length} waypoints from states.json and ${Object.keys(trajectories).length} trajectory from trajectories.json`],
      [CLIENT, "MultiThreadedExecutor spinning both nodes in a background thread"],
    ];
    for (const [node, msg] of boot) {
      node ? info(node, msg) : print(msg);
      await sleep(reducedMotion ? 0 : 140);
    }
    print(`\n<span class="t-accent">This is my ROS 2 arm controller, ported to run in your browser.</span>
<span class="t-dim">Same commands as the real one; a JavaScript IK solver stands in for MoveIt.</span>
Try <button type="button" class="t-cmd" data-cmd="move z 100">move z 100</button>, <button type="button" class="t-cmd" data-cmd="pick_and_place">pick_and_place</button> or <button type="button" class="t-cmd" data-cmd="help">help</button>.
`);
    loop();
  }

  // ----- drawing -----
  const cam = { yaw: 2.45, pitch: 0.42, dist: 1.95, target: [-0.22, 0, 0.3] };
  const camHome = { ...cam };
  let W = 0, H = 0, dpr = 1, eye, right, up, fwd, focal;
  function setCamera() {
    const cp = Math.cos(cam.pitch);
    eye = v3.add(cam.target, v3.scale([cp * Math.cos(cam.yaw), cp * Math.sin(cam.yaw), Math.sin(cam.pitch)], cam.dist));
    fwd = v3.unit(v3.sub(cam.target, eye));
    right = v3.unit(v3.cross(fwd, [0, 0, 1]));
    up = v3.cross(right, fwd);
    focal = Math.min(W * 1.25, H * 1.6);
  }
  const project = (p) => {
    const v = v3.sub(p, eye), z = v3.dot(v, fwd), s = focal / Math.max(z, 0.05);
    return { x: W / 2 + v3.dot(v, right) * s, y: H * 0.56 - v3.dot(v, up) * s, z, s };
  };

  function draw() {
    if (!W) return;
    setCamera();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // floor grid
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      const g = i * 0.1;
      ctx.strokeStyle = i === 0 ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.06)";
      line3([g, -1, 0], [g, 1, 0]);
      line3([-1, g, 0], [1, g, 0]);
    }
    // pick and place pads
    pad([-0.5, 0.2], "#3fb950", "pick");
    pad([-0.3, -0.45], "#d29922", "place");

    const F = frames(q);
    const P = F.map((f) => f.p), Z = F.map((f) => colR(f.R, 2)), X = F.map((f) => colR(f.R, 0));
    const along = (i, a, b) => [v3.add(P[i], v3.scale(Z[i], a)), v3.add(P[i], v3.scale(Z[i], b))];
    const LINK = "#d5dae1", JOINT = "#7f93ab", DARK = "#3a4048";
    const tipBase = v3.add(P[6], v3.scale(Z[6], 0.05)), tip = P[7];
    const parts = [
      [[0, 0, 0], [0, 0, 0.06], 0.08, DARK],
      [[0, 0, 0.05], P[1], 0.062, LINK],
      [...along(1, -0.075, 0.075), 0.066, JOINT],          // shoulder
      [P[1], P[2], 0.048, LINK],                            // upper arm
      [...along(2, -0.06, 0.06), 0.056, JOINT],             // elbow
      [P[2], P[3], 0.04, LINK],                             // forearm
      [v3.add(P[3], v3.scale(Z[3], -0.03)), P[4], 0.042, JOINT], // wrist 1
      [P[4], P[5], 0.042, LINK],                            // wrist 2
      [P[5], P[6], 0.04, JOINT],                            // wrist 3
      [P[6], tipBase, 0.034, DARK],                         // flange and gripper body
      [v3.add(tipBase, v3.scale(X[6], 0.026)), v3.add(tip, v3.scale(X[6], 0.018)), 0.009, DARK],
      [v3.add(tipBase, v3.scale(X[6], -0.026)), v3.add(tip, v3.scale(X[6], -0.018)), 0.009, DARK],
    ];

    // soft shadows on the floor
    ctx.lineCap = "round";
    for (const [a, b, r] of parts) {
      const A = project([a[0], a[1], 0]), B = project([b[0], b[1], 0]);
      ctx.strokeStyle = "rgba(0,0,0,.22)";
      ctx.lineWidth = 2 * r * (A.s + B.s) / 2;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }

    // path the tool has travelled
    if (trail.length > 1) {
      ctx.strokeStyle = "rgba(121,192,255,.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      trail.forEach((p, i) => { const s = project(p); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
      ctx.stroke();
    }

    // the arm, far parts first
    parts.map(([a, b, r, c]) => ({ A: project(a), B: project(b), r, c }))
      .sort((m, n) => (n.A.z + n.B.z) - (m.A.z + m.B.z))
      .forEach(({ A, B, r, c }) => {
        const w = 2 * r * (A.s + B.s) / 2;
        seg(A, B, w + 2, "rgba(0,0,0,.45)");
        seg(A, B, w, c);
        ctx.save(); ctx.translate(-w * 0.16, -w * 0.18);
        seg(A, B, w * 0.32, "rgba(255,255,255,.28)");
        ctx.restore();
      });

    // tool frame axes and the planning target
    const T = F[7];
    [["#ff7b72", 0], ["#3fb950", 1], ["#79c0ff", 2]].forEach(([c, k]) => {
      ctx.strokeStyle = c; ctx.lineWidth = 2;
      line3(T.p, v3.add(T.p, v3.scale(colR(T.R, k), 0.07)));
    });
    if (ghost) {
      const g = project(ghost);
      ctx.strokeStyle = "#79c0ff"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(g.x, g.y, 7, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    }

    // read-outs
    const R = T.R, rpy = [Math.atan2(R[7], R[8]), Math.asin(-Math.max(-1, Math.min(1, R[6]))), Math.atan2(R[3], R[0])];
    readout.textContent =
      ARM.joints.map((n, i) => `${n.replace("_joint", "").padEnd(14)}${deg(q[i]).toFixed(1).padStart(7)}°`).join("\n") +
      `\n\ntcp  x ${(T.p[0] * 1000).toFixed(0).padStart(5)}  y ${(T.p[1] * 1000).toFixed(0).padStart(5)}  z ${(T.p[2] * 1000).toFixed(0).padStart(5)} mm` +
      `\n    rx ${deg(rpy[0]).toFixed(0).padStart(5)} ry ${deg(rpy[1]).toFixed(0).padStart(5)} rz ${deg(rpy[2]).toFixed(0).padStart(5)} °`;
  }
  function seg(A, B, w, c) {
    ctx.strokeStyle = c; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  }
  function line3(a, b) {
    const A = project(a), B = project(b);
    if (A.z < 0.05 || B.z < 0.05) return;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  }
  function pad([x, y], colour, label) {
    const c = [[-0.05, -0.05], [0.05, -0.05], [0.05, 0.05], [-0.05, 0.05]].map(([dx, dy]) => project([x + dx, y + dy, 0]));
    ctx.fillStyle = colour + "33"; ctx.strokeStyle = colour + "aa"; ctx.lineWidth = 1;
    ctx.beginPath(); c.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill(); ctx.stroke();
    const l = project([x, y + 0.08, 0]);
    ctx.fillStyle = colour; ctx.font = "11px " + getComputedStyle(body).getPropertyValue("--mono"); ctx.textAlign = "center";
    ctx.fillText(label, l.x, l.y);
  }

  const syncMode = () => { modeChip.textContent = `${isLocal ? "local · tool frame" : "global · base frame"} · ${jointSpace ? "joint space" : "Cartesian"}`; };

  // canvas size follows the window
  new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    draw();
  }).observe(canvas);

  // orbit and zoom
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    cam.yaw = drag.yaw - (e.clientX - drag.x) * 0.008;
    cam.pitch = Math.max(0.05, Math.min(1.45, drag.pitch + (e.clientY - drag.y) * 0.006));
    draw();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); cam.dist = Math.max(1, Math.min(4.5, cam.dist * Math.exp(e.deltaY * 0.0015))); draw(); }, { passive: false });
  canvas.addEventListener("dblclick", () => { Object.assign(cam, camHome); draw(); });

  syncMode();
  launch();
  return () => { if (!mobile.matches && pending) input.focus({ preventScroll: true }); };
}
