// ===================== Arm controller =====================
// Browser port of the command-line controller I wrote for a UR7e during my
// internship (client.py + motion_server.py on ROS 2 and MoveIt).
//  - armTerminal(): the client, line for line: same commands, prompts and messages
//  - planner: stands in for motion_server.py / MoveIt (IK, Cartesian and joint-space planning)
//  - armViewer(): the real UR7e meshes from Universal Robots' ROS 2 description, drawn with WebGL

// ---------- small vector / rotation helpers (3-vectors, row-major 3x3) ----------
const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => Math.hypot(a[0], a[1], a[2]),
  unit: (a) => v3.scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1)),
};
const mulR = (A, B) => {
  const r = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return r;
};
const mulRv = (R, v) => [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];
const tR = (R) => [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]];
const colR = (R, j) => [R[j], R[3 + j], R[6 + j]];
const rpyR = (r, p, y) => {
  const cr = Math.cos(r), sr = Math.sin(r), cp = Math.cos(p), sp = Math.sin(p), cy = Math.cos(y), sy = Math.sin(y);
  return [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr, sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr, -sp, cp * sr, cp * cr];
};
const poseMul = (A, B) => ({ R: mulR(A.R, B.R), p: v3.add(A.p, mulRv(A.R, B.p)) });
// rotation matrix from a rotation vector (axis * angle), and back
function expR(w) {
  const th = v3.norm(w);
  if (th < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const [x, y, z] = v3.scale(w, 1 / th), c = Math.cos(th), s = Math.sin(th), C = 1 - c;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s,
          y * x * C + z * s, c + y * y * C, y * z * C - x * s,
          z * x * C - y * s, z * y * C + x * s, c + z * z * C];
}
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

// ---------- UR7e kinematics, from Universal Robots' ROS 2 description ----------
const PI = Math.PI;
const UR7E = {
  joints: ["shoulder_pan_joint", "shoulder_lift_joint", "elbow_joint", "wrist_1_joint", "wrist_2_joint", "wrist_3_joint"],
  limits: [2 * PI, 2 * PI, PI, 2 * PI, 2 * PI, 2 * PI],
  // joint origins (config/ur7e/default_kinematics.yaml); every joint turns about its own z
  origins: [
    { p: [0, 0, 0.1625], R: rpyR(0, 0, 0) },
    { p: [0, 0, 0], R: rpyR(PI / 2, 0, 0) },
    { p: [-0.425, 0, 0], R: rpyR(0, 0, 0) },
    { p: [-0.3922, 0, 0.1333], R: rpyR(0, 0, 0) },
    { p: [0, -0.0997, 0], R: rpyR(PI / 2, 0, 0) },
    { p: [0, 0.0996, 0], R: rpyR(PI / 2, PI, PI) },
  ],
  inertia: { p: [0, 0, 0], R: rpyR(0, 0, PI) },                                                  // base_link -> base_link_inertia
  tool0: poseMul({ p: [0, 0, 0], R: rpyR(0, -PI / 2, -PI / 2) }, { p: [0, 0, 0], R: rpyR(PI / 2, 0, PI / 2) }), // wrist_3 -> flange -> tool0
};
// Link frames in base_link: F[0] base_link_inertia, F[1..6] shoulder ... wrist_3, F[7] tool0
function frames(q) {
  const F = [UR7E.inertia];
  for (let i = 0; i < 6; i++) {
    const c = Math.cos(q[i]), s = Math.sin(q[i]);
    F.push(poseMul(poseMul(F[i], UR7E.origins[i]), { p: [0, 0, 0], R: [c, -s, 0, s, c, 0, 0, 0, 1] }));
  }
  F.push(poseMul(F[6], UR7E.tool0));
  return F;
}
const tool0 = (q) => frames(q)[7];

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
    // geometric Jacobian: joint i turns about the z axis of link frame i+1
    const J = [[], [], [], [], [], []];
    for (let i = 0; i < 6; i++) {
      const z = colR(F[i + 1].R, 2), lin = v3.cross(z, v3.sub(T.p, F[i + 1].p));
      for (let r = 0; r < 3; r++) { J[r][i] = lin[r]; J[r + 3][i] = z[r]; }
    }
    const e = [...ep, ...eo];
    const JJt = J.map((ri, i) => J.map((rj, j) => ri.reduce((s, v, k) => s + v * rj[k], 0) + (i === j ? 1e-4 : 0)));
    const y = solve(JJt, e);
    let dq = [0, 1, 2, 3, 4, 5].map((k) => J.reduce((s, row, r) => s + row[k] * y[r], 0));
    const big = Math.max(...dq.map(Math.abs));
    if (big > 0.25) dq = dq.map((d) => d * 0.25 / big);
    for (let k = 0; k < 6; k++) q[k] = Math.max(-UR7E.limits[k], Math.min(UR7E.limits[k], q[k] + dq[k]));
  }
  const T = tool0(q);
  return v3.norm(v3.sub(target.p, T.p)) < 1e-4 && v3.norm(logR(mulR(tR(T.R), target.R))) < 1e-3 ? q : null;
}

// Rough collision check: the table (z = 0), and the tool coming back into the base column
function collides(q) {
  const F = frames(q);
  for (let i = 3; i <= 6; i++) if (F[i].p[2] < 0.05) return "the table";
  const tip = F[7].p;
  if (tip[2] < 0.005) return "the table";
  if (Math.hypot(tip[0], tip[1]) < 0.11 && tip[2] < 0.3) return "the robot's own base";
  return null;
}

const maxDiff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
const lerpPose = (A, dp, w, s) => ({ p: v3.add(A.p, v3.scale(dp, s)), R: mulR(A.R, expR(v3.scale(w, s))) });
const rad = (d) => d * PI / 180;

// ---------- the shared robot (what /joint_states would report) ----------
const HOME = [0, -90, 90, -90, -90, 0].map(rad);
const SIM = {
  q: HOME.slice(), trail: [], target: null, views: new Set(),
  changed() { this.views.forEach((f) => f()); },
};
const DOWN = tool0(HOME).R;
const reach = (x, y, z) => ik(HOME, { p: [x, y, z], R: DOWN }, 300);
const DEFAULT_POSES = {
  home: HOME,
  pick_above: reach(0.45, -0.2, 0.25), pick: reach(0.45, -0.2, 0.06),
  place_above: reach(0.3, 0.45, 0.25), place: reach(0.3, 0.45, 0.06),
};
const TRAJECTORIES = { pick_and_place: ["home", "pick_above", "pick", "pick_above", "place_above", "place", "place_above", "home"] };
const PADS = [[0.45, -0.2, "#3fb950"], [0.3, 0.45, "#d29922"]];

// ---------- planner: stands in for motion_server.py and MoveIt ----------
// Returns the same status strings the client checks for.
const planner = {
  SUCCESS: "Path planned and executed successfully!",

  // target pose of tool0 after moving <disp> along/about <axis>
  goal(axis, disp, local) {
    const T = tool0(SIM.q), i = "xyz".indexOf(axis[axis.length - 1]);
    const e = [0, 0, 0];
    e[i] = 1;
    if (axis[0] !== "r") return { p: v3.add(T.p, v3.scale(local ? colR(T.R, i) : e, disp)), R: T.R };
    const turn = expR(v3.scale(e, disp));
    return { p: T.p, R: local ? mulR(T.R, turn) : mulR(turn, T.R) };
  },

  // straight line for the tool in 5 mm steps, like MoveIt's computeCartesianPath
  async cartesian_path_planner({ axis, disp, local = false }, log) {
    const goal = this.goal(axis, disp, local), start = tool0(SIM.q);
    const dp = v3.sub(goal.p, start.p), w = logR(mulR(tR(start.R), goal.R));
    const n = Math.max(2, Math.ceil(Math.max(v3.norm(dp) / 0.005, v3.norm(w) / 0.03)));
    const path = [SIM.q.slice()];
    SIM.target = goal.p;
    for (let i = 1; i <= n; i++) {
      const prev = path[path.length - 1], q = ik(prev, lerpPose(start, dp, w, i / n), 60);
      const why = !q ? "no IK solution along the path" : maxDiff(q, prev) > 0.3 ? "the joints would have to flip mid-path" : collides(q) ? `collision with ${collides(q)}` : null;
      if (why) {
        SIM.target = null;
        SIM.changed();
        return `Cartesian path planning failed: only ${((i - 1) / n * 100).toFixed(2)}% of the path achieved (${why})`;
      }
      path.push(q);
    }
    log(`Cartesian path planned: 100.00% achieved, ${path.length} waypoints. Executing...`);
    await this.execute(path);
    this.final(log);
    return this.SUCCESS;
  },

  // one IK solve near the current joints (or saved joint angles), then all joints move together
  async joint_space_planner({ axis, disp, local = false, joint_angles }, log) {
    let goalQ = joint_angles;
    if (!goalQ) {
      const goal = this.goal(axis, disp, local), start = tool0(SIM.q);
      const dp = v3.sub(goal.p, start.p), w = logR(mulR(tR(start.R), goal.R));
      const n = Math.max(1, Math.ceil(Math.max(v3.norm(dp) / 0.03, v3.norm(w) / 0.15)));
      SIM.target = goal.p;
      goalQ = SIM.q;
      for (let i = 1; i <= n && goalQ; i++) goalQ = ik(goalQ, lerpPose(start, dp, w, i / n), 100);
      goalQ = goalQ || ik(SIM.q, goal, 400);
      if (!goalQ) { SIM.target = null; SIM.changed(); return "Joint space planning failed: no IK solution for the target pose"; }
    }
    const steps = Math.max(2, Math.ceil(maxDiff(SIM.q, goalQ) / 0.02)), path = [];
    for (let i = 0; i <= steps; i++) {
      const q = SIM.q.map((v, k) => v + (goalQ[k] - v) * (i / steps));
      if (collides(q)) { SIM.target = null; SIM.changed(); return `Joint space planning failed: the path collides with ${collides(q)}`; }
      path.push(q);
    }
    log(`Joint space path planned (${path.length} waypoints). Executing...`);
    await this.execute(path);
    this.final(log);
    return this.SUCCESS;
  },

  // play the trajectory at a steady pace with eased start and stop
  execute(path) {
    let joint = 0, len = 0;
    for (let i = 1; i < path.length; i++) {
      joint = Math.max(joint, maxDiff(path[i], path[0]));
      len += v3.norm(v3.sub(tool0(path[i]).p, tool0(path[i - 1]).p));
    }
    const seconds = Math.max(0.8, joint / 0.9, len / 0.15), n = path.length - 1;
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = (now) => {
        const s = Math.min(1, (now - t0) / (seconds * 1000));
        const u = s * s * (3 - 2 * s) * n, i = Math.min(n - 1, Math.floor(u)), f = u - i;
        SIM.q = path[i].map((v, k) => v + (path[i + 1][k] - v) * f);
        SIM.trail.push(tool0(SIM.q).p);
        if (SIM.trail.length > 1500) SIM.trail.shift();
        if (s < 1) { SIM.changed(); requestAnimationFrame(step); }
        else { SIM.q = path[n].slice(); SIM.target = null; SIM.changed(); resolve(); }
      };
      requestAnimationFrame(step);
    });
  },

  final(log) {
    const p = tool0(SIM.q).p.map((v) => (v * 1000).toFixed(1));
    log(`Final tool0 position (base_link): x=${p[0]} mm, y=${p[1]} mm, z=${p[2]} mm`);
  },
};

// ---------- Python stand-ins, so errors land in the client's except: exactly like the original ----------
class PyError extends Error {}
const item = (list, i) => { if (i >= list.length || i < -list.length) throw new PyError("IndexError: list index out of range"); return list[i < 0 ? list.length + i : i]; };
const charAt = (s, i) => { if (i >= s.length) throw new PyError("IndexError: string index out of range"); return s[i]; };
const getKey = (obj, k) => { if (!Object.hasOwn(obj, k)) throw new PyError(`KeyError: '${k}'`); return obj[k]; };
const pyFloat = (s) => {
  if (!/^\s*[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?\s*$/i.test(s)) throw new PyError(`ValueError: could not convert string to float: '${s}'`);
  return parseFloat(s);
};
const isNumber = (s) => { try { pyFloat(s); return true; } catch (e) { return false; } };
const pyStr = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x)); // str(float) in Python

// help.json, printed the way print_help() lays it out
const HELP_JSON = {
  help: ["To list every command --> help", "To show the format for one command --> help <command>"],
  move: ["To move around the cartesian plane --> move <x/y/z> <mm>", "To rotate the end effector --> move <rx/ry/rz> <degrees>"],
  mode: ["To set the movement mode --> mode <l/g><j/c>", "l = local (tool frame), g = global (base frame)", "j = joint space, c = cartesian (straight line)"],
  save: ["To save the current pose as a waypoint --> save <name>"],
  list_states: ["To list the saved waypoints --> list_states"],
  list_trajectories: ["To list the saved trajectories --> list_trajectories"],
  "<waypoint>": ["To go back to a saved waypoint --> <waypoint name>", "To run a saved trajectory --> <trajectory name>"],
  q: ["To quit --> q"],
};
// textwrap.fill(text, width, initial_indent, subsequent_indent)
function fill(text, width, first, rest) {
  const lines = [];
  let cur = first, fresh = true;
  for (const word of text.split(" ")) {
    if (!fresh && (cur + " " + word).length > width) { lines.push(cur); cur = rest + word; }
    else cur = fresh ? cur + word : cur + " " + word;
    fresh = false;
  }
  lines.push(cur);
  return lines.join("\n");
}

// ---------- the terminal: a small shell that runs client.py ----------
const SHELL = "anmol@ros2:~/arm_controller$";
const STATES_KEY = "arm-states";

function armTerminal(body, closeWindow) {
  body.innerHTML = `<div class="term"><pre class="term__out"></pre><div class="term__line" hidden><span class="term__prompt"></span><input aria-label="Terminal input" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>`;
  const out = $(".term__out", body), line = $(".term__line", body), promptEl = $(".term__prompt", body), input = $("input", body);
  const write = (html) => { out.insertAdjacentHTML("beforeend", html + "\n"); body.scrollTop = body.scrollHeight; };
  const print = (text = "") => write(escapeHtml(String(text)));
  const stamp = () => (Date.now() / 1000).toFixed(9);
  const logger = (node) => ({
    info: (m) => write(`[INFO] [${stamp()}] [${node}]: ${escapeHtml(m)}`),
    error: (m) => write(`<span class="t-err">[ERROR] [${stamp()}] [${node}]: ${escapeHtml(m)}</span>`),
  });

  // input(): resolves with the next line typed (or with `typed`, entered for the user)
  const history = [];
  let hIndex = 0, pending = null;
  const read = (promptHtml, typed) => typed !== undefined
    ? new Promise((resolve) => { write(promptHtml + escapeHtml(typed)); setTimeout(() => resolve(typed), 400); })
    : new Promise((resolve) => {
    promptEl.innerHTML = promptHtml;
    line.hidden = false;
    pending = resolve;
    body.scrollTop = body.scrollHeight;
    if (!mobile.matches && body.closest(".win:not(.is-inactive)")) input.focus({ preventScroll: true });
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && pending) {
      const raw = input.value, done = pending;
      input.value = "";
      pending = null;
      line.hidden = true;
      write(promptEl.innerHTML + escapeHtml(raw));
      if (raw.trim()) { history.push(raw); hIndex = history.length; }
      done(raw);
    } else if (e.key === "ArrowUp" && hIndex > 0) { input.value = history[--hIndex]; e.preventDefault(); }
    else if (e.key === "ArrowDown") { hIndex = Math.min(history.length, hIndex + 1); input.value = history[hIndex] || ""; }
  });
  body.addEventListener("click", () => { if (!window.getSelection().toString()) input.focus(); });

  const shellPrompt = `<span class="term__prompt">${SHELL}</span> `;
  async function shell() {
    write(shellPrompt + "python3 client.py");
    await client(true);
    for (;;) {
      const cmd = (await read(shellPrompt)).trim();
      if (!body.isConnected) return;
      if (!cmd) continue;
      if (/^(python3? |ros2 run \S+ )?client(\.py)?$/.test(cmd)) await client();
      else if (cmd === "ls") print("client.py  help.json  motion_server.py  states.json  trajectories.json");
      else if (cmd === "clear") out.innerHTML = "";
      else if (cmd === "exit") return closeWindow();
      else print(`${cmd.split(" ")[0]}: command not found  (run: python3 client.py)`);
    }
  }

  // ===== client.py =====
  // showHelp: type "help" at the first prompt, so new users see the commands straight away
  async function client(showHelp = false) {
    const log = logger("user_interaction_node"), serverLog = logger("motion_planner_and_executor_node").info;
    const node = { is_local: false, JointSpace: false };

    const loadStates = () => {
      const data = { joint_names: UR7E.joints, poses: { ...DEFAULT_POSES } };
      try { Object.assign(data.poses, JSON.parse(localStorage.getItem(STATES_KEY) || "{}")); } catch (e) { /* storage unavailable */ }
      return data;
    };
    const writeStates = (data) => {
      const mine = Object.fromEntries(Object.entries(data.poses).filter(([k]) => !Object.hasOwn(DEFAULT_POSES, k)));
      try { localStorage.setItem(STATES_KEY, JSON.stringify(mine)); } catch (e) { /* storage unavailable */ }
    };

    function print_help(topic = null) {
      let items = HELP_JSON;
      if (topic) {
        topic = topic.toLowerCase().trim();
        if (!Object.hasOwn(HELP_JSON, topic)) { print(`\n  No help for '${topic}'. Commands: ${Object.keys(HELP_JSON).join(", ")}\n`); return; }
        items = { [topic]: HELP_JSON[topic] };
      }
      const pad = Math.max(...Object.keys(HELP_JSON).map((k) => k.length));
      print();
      for (const [name, lines] of Object.entries(items)) {
        lines.forEach((l, i) => {
          const label = i === 0 ? `  ${name.padEnd(pad)} : ` : " ".repeat(pad + 5);
          const number = lines.length > 1 ? `${i + 1}. ` : "";
          print(fill(number + l, 92, label, " ".repeat(pad + 5 + number.length)));
          if (i < lines.length - 1) print();
        });
        print();
      }
    }

    // joint angles from /joint_states, in our fixed joint order
    const get_current_pose = () => SIM.q.slice();

    async function call_trajectory(saved_trajectories, saved_joints_data, trajectory_to_execute) {
      for (const i of saved_trajectories[trajectory_to_execute]) {
        print(`Executing ${i}`);
        const destination_state = saved_joints_data.poses[i];
        const output = await planner.joint_space_planner({ joint_angles: destination_state }, serverLog);
        if (output === "Path planned and executed successfully!") print(`${i} Completed!`);
        else { log.error(`Failed to execute trajectory. issue at waypoint ${i}`); break; }
      }
      print("Trajectory executed successfully!");
    }

    function save_state(joints, saved_joints_data, message) {
      const new_position = get_current_pose();
      const poses = saved_joints_data.poses;
      const waypoint = Object.keys(poses).find((name) => poses[name].length === new_position.length && poses[name].every((v, k) => v === new_position[k]));
      if (waypoint === undefined) {
        saved_joints_data.poses[item(message, -1)] = new_position;
        writeStates(saved_joints_data);
        print(`Waypoint saved successfully as '${item(message, -1)}'`);
      } else {
        print(`The waypoint you are trying to save already exists as '${waypoint}'`);
      }
    }

    function change_mode(message) {
      const arg = [...item(message, 1)];
      if (charAt(arg, 0) === "l") node.is_local = true;
      else if (arg[0] === "g") node.is_local = false;
      else print("Wrong arguements passed, please try again.");
      if (charAt(arg, 1) === "j") node.JointSpace = true;
      else if (arg[1] === "c") node.JointSpace = false;
      else print("Wrong arguments passed, please try again.");
      print("Status Updated Successfully!");
    }

    async function motion_server_caller(message) {
      const coordinates = ["x", "y", "z"];
      const coordinate_to_move = item(message, 1);
      let displacement, output;
      if (charAt(coordinate_to_move, 0) === "r" && coordinates.includes(charAt(coordinate_to_move, 1))) {
        // the user types degrees; the planner works in radians
        if (isNumber(item(message, -1))) displacement = rad(pyFloat(item(message, -1)));
        else log.error("ERROR: Wrong Data type rotational value, please try again with correct data type.");
        if (displacement === undefined) throw new PyError("UnboundLocalError: local variable 'displacement' referenced before assignment");
        output = await planner.cartesian_path_planner({ axis: coordinate_to_move, disp: displacement, local: true }, serverLog);
        print(output);
      } else if (coordinates.includes(coordinate_to_move[0])) {
        if (!isNumber(item(message, -1))) log.info("ERROR: Wrong Data type rotational value, please try again with correct data type.");
        // the user types millimetres; the planner wants metres
        displacement = pyFloat(item(message, -1)) / 1000;
        if (node.JointSpace) {
          output = await planner.joint_space_planner({ axis: coordinate_to_move, disp: displacement, local: node.is_local }, serverLog);
          print(output);
        } else {
          output = await planner.cartesian_path_planner({ axis: coordinate_to_move, disp: displacement, local: node.is_local }, serverLog);
          // Cartesian planning can fail partway; offer a joint-space move to the same target instead
          if (output.toLowerCase().includes("failed")) {
            print(output);
            const ask_joint_state = await read("Try via joint states instead? (y/n) ");
            if (ask_joint_state.toLowerCase() === "y") {
              output = await planner.joint_space_planner({ axis: coordinate_to_move, disp: displacement, local: node.is_local }, serverLog);
              print(output);
            }
          }
        }
      } else {
        log.info("ERROR : Wrong syntax, please try again.");
      }
    }

    async function input_handler() {
      const saved_joints_data = loadStates();
      const joints = saved_joints_data.joint_names;
      const saved_trajectories = TRAJECTORIES;
      try {
        for (;;) {
          print(`Moving in ${node.is_local ? "local" : "global"} with ${node.JointSpace ? "Joint Space" : "Cartesian"} movement (units being used : mm & angles)`);
          const ask = (await read("Enter Command --> ", showHelp ? "help" : undefined)).toLowerCase();
          showHelp = false;
          if (!body.isConnected) return;
          const message = ask.split(" ");

          if (ask === "q") break;
          else if (message[0] === "help") { print_help(message.length > 1 ? message[1] : null); continue; }
          else if (message[0] === "list_states") Object.keys(saved_joints_data.poses).forEach((w, i) => print(`${i + 1}. ${w}`));
          else if (message[0] === "list_trajectories") Object.keys(saved_trajectories).forEach((t, i) => print(`${i + 1}. ${t}`));
          else if (message[0] === "save" && message.length === 2) save_state(joints, saved_joints_data, message);
          else if (message[0] === "mode" && item(message, 1).length === 2) { change_mode(message); continue; }
          else if (message[0] === "move") { await motion_server_caller(message); continue; }
          else if (Object.hasOwn(saved_trajectories, ask)) {
            // only start if the arm is at the trajectory's first waypoint
            const current_pose = get_current_pose();
            const first_waypoint_position = saved_joints_data.poses[saved_trajectories[ask][0]];
            let current_pose_at_start = true;
            for (let i = 0; i < current_pose.length; i++) {
              const a = pyStr(current_pose[i]).slice(0, 5), b = pyStr(first_waypoint_position[i]).slice(0, 5);
              if (a !== b) { print(a); print(b); current_pose_at_start = false; break; }
            }
            if (current_pose_at_start) { await call_trajectory(saved_trajectories, saved_joints_data, ask); continue; }
            log.error("ERROR: Failed to execute trajectory as current position is away from the starting position of trajectory.");
          } else {
            // anything else is a saved waypoint name
            const destination_state = getKey(saved_joints_data.poses, ask);
            print(await planner.joint_space_planner({ joint_angles: destination_state }, serverLog));
          }
        }
      } catch (e) {
        if (!(e instanceof PyError)) throw e;
        log.error("ERROR: Invalid input/ Wrong input format");
        const repeat = await read("Would you like to try again? (y/n) ");
        if (repeat.toLowerCase() === "y") await input_handler();
      }
    }

    await input_handler();
  }

  shell();
  return () => { if (!mobile.matches && pending) input.focus({ preventScroll: true }); };
}

// ---------- the viewer: real UR7e meshes in WebGL ----------
let ur7eMesh = null; // fetched once, shared by every viewer
function loadUr7eMesh() {
  ur7eMesh = ur7eMesh || Promise.all([
    fetch("assets/models/ur7e/ur7e.json").then((r) => r.json()),
    fetch("assets/models/ur7e/ur7e.bin").then((r) => r.arrayBuffer()),
  ]).then(([manifest, buffer]) => ({ manifest, buffer }));
  return ur7eMesh;
}

// column-major 4x4 helpers for WebGL
const m4 = {
  mul(a, b) {
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) r[c * 4 + rr] = a[rr] * b[c * 4] + a[4 + rr] * b[c * 4 + 1] + a[8 + rr] * b[c * 4 + 2] + a[12 + rr] * b[c * 4 + 3];
    return r;
  },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  },
  lookAt(eye, target, up) {
    const z = v3.unit(v3.sub(eye, target)), x = v3.unit(v3.cross(up, z)), y = v3.cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -v3.dot(x, eye), -v3.dot(y, eye), -v3.dot(z, eye), 1]);
  },
  pose: ({ R, p }) => new Float32Array([R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, p[0], p[1], p[2], 1]),
  identity: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
};

const VERT = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNrm;
uniform mat4 uVP, uM;
out vec3 vN, vW;
void main() { vec4 w = uM * vec4(aPos, 1.0); vW = w.xyz; vN = mat3(uM) * aNrm; gl_Position = uVP * w; }`;
const FRAG = `#version 300 es
precision highp float;
in vec3 vN, vW;
uniform vec3 uColor, uEye;
uniform float uLit, uAlpha;
out vec4 o;
void main() {
  if (uLit < 0.5) { o = vec4(uColor, uAlpha); return; }
  vec3 n = normalize(vN), v = normalize(uEye - vW);
  if (dot(n, v) < 0.0) n = -n;
  vec3 L = normalize(vec3(0.5, -0.4, 0.8));
  float d = max(dot(n, L), 0.0), sky = 0.5 + 0.5 * n.z;
  float s = pow(max(dot(n, normalize(L + v)), 0.0), 40.0) * 0.3;
  o = vec4(uColor * (0.22 + 0.25 * sky + 0.7 * d) + s, 1.0);
}`;

function armViewer(body) {
  body.classList.add("win__body--armview");
  body.innerHTML = `<div class="armview"><canvas aria-label="Simulated UR7e robot arm"></canvas><p class="armview__status">Loading UR7e model…</p><pre class="armview__joints"></pre><p class="armview__hint">drag to orbit · scroll to zoom · double-click to reset</p></div>`;
  const canvas = $("canvas", body), status = $(".armview__status", body), jointsEl = $(".armview__joints", body);
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: true });
  if (!gl) { status.textContent = "This browser doesn't support WebGL 2, so the arm can't be drawn here. The controller still runs."; return; }

  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  const U = Object.fromEntries(["uVP", "uM", "uColor", "uEye", "uLit", "uAlpha"].map((n) => [n, gl.getUniformLocation(prog, n)]));

  // plain float geometry for the grid, pads, trail and axes
  const lineVao = gl.createVertexArray(), lineBuf = gl.createBuffer();
  gl.bindVertexArray(lineVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const drawRaw = (mode, pts, color, alpha = 1) => {
    gl.uniform1f(U.uLit, 0); gl.uniform3fv(U.uColor, color); gl.uniform1f(U.uAlpha, alpha);
    gl.uniformMatrix4fv(U.uM, false, m4.identity);
    gl.bindVertexArray(lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts.flat()), gl.DYNAMIC_DRAW);
    gl.drawArrays(mode, 0, pts.length);
  };
  const grid = [];
  for (let i = -10; i <= 10; i++) { const g = i / 10; grid.push([g, -1, 0], [g, 1, 0], [-1, g, 0], [1, g, 0]); }
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

  // link meshes, uploaded once the model arrives
  let links = null;
  loadUr7eMesh().then(({ manifest, buffer }) => {
    if (!body.isConnected) return;
    links = manifest.links.map((link) => link.chunks.map((c) => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(buffer, c.vOff, c.vCount * 12), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.SHORT, true, 12, 0);   // int16 positions, metres * 32767
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.BYTE, true, 12, 8);    // int8 normals
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(buffer, c.iOff, c.iCount * (c.wide ? 4 : 2)), gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      return { vao, count: c.iCount, type: c.wide ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, color: c.color };
    }));
    status.hidden = true;
    redraw();
  }).catch(() => { status.textContent = "Couldn't load the UR7e model. The controller still runs."; });

  const cam = { yaw: -0.7, pitch: 0.36, dist: 1.6, target: [0.2, 0.05, 0.3] };
  const camHome = { ...cam };
  let W = 0, H = 0, queued = false;

  function draw() {
    queued = false;
    if (!W || !body.isConnected) return;
    const cp = Math.cos(cam.pitch);
    const eye = v3.add(cam.target, v3.scale([cp * Math.cos(cam.yaw), cp * Math.sin(cam.yaw), Math.sin(cam.pitch)], cam.dist));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(U.uVP, false, m4.mul(m4.perspective(0.7, W / H, 0.02, 20), m4.lookAt(eye, cam.target, [0, 0, 1])));
    gl.uniform3fv(U.uEye, eye);

    // table grid, pick/place pads and a soft shadow under the base
    gl.depthMask(false);
    drawRaw(gl.LINES, grid, [1, 1, 1], 0.07);
    drawRaw(gl.LINES, [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0]], [1, 1, 1], 0.16);
    PADS.forEach(([x, y, c]) => {
      const sq = [[x - 0.05, y - 0.05, 0.001], [x + 0.05, y - 0.05, 0.001], [x + 0.05, y + 0.05, 0.001], [x - 0.05, y + 0.05, 0.001]];
      drawRaw(gl.TRIANGLE_FAN, sq, hex(c), 0.22);
      drawRaw(gl.LINE_LOOP, sq, hex(c), 0.8);
    });
    drawRaw(gl.TRIANGLE_FAN, [[0, 0, 0.001], ...Array.from({ length: 33 }, (_, i) => [0.11 * Math.cos(i * PI / 16), 0.11 * Math.sin(i * PI / 16), 0.001])], [0, 0, 0], 0.35);
    gl.depthMask(true);

    // the arm: each link's mesh placed at its frame
    const F = frames(SIM.q);
    if (links) {
      gl.uniform1f(U.uLit, 1);
      links.forEach((chunks, i) => {
        gl.uniformMatrix4fv(U.uM, false, m4.pose(F[i]));
        chunks.forEach((c) => { gl.uniform3fv(U.uColor, c.color); gl.bindVertexArray(c.vao); gl.drawElements(gl.TRIANGLES, c.count, c.type, 0); });
      });
    }

    // where the tool has been, where it's going, and the tool0 frame
    gl.disable(gl.DEPTH_TEST);
    if (SIM.trail.length > 1) drawRaw(gl.LINE_STRIP, SIM.trail, [0.47, 0.75, 1], 0.9);
    if (SIM.target) {
      const t = SIM.target, d = 0.03;
      drawRaw(gl.LINES, [[t[0] - d, t[1], t[2]], [t[0] + d, t[1], t[2]], [t[0], t[1] - d, t[2]], [t[0], t[1] + d, t[2]], [t[0], t[1], t[2] - d], [t[0], t[1], t[2] + d]], [0.47, 0.75, 1], 1);
    }
    const T = F[7];
    [[1, 0.42, 0.4], [0.25, 0.73, 0.31], [0.47, 0.75, 1]].forEach((c, k) => drawRaw(gl.LINES, [T.p, v3.add(T.p, v3.scale(colR(T.R, k), 0.08))], c, 1));

    jointsEl.textContent = UR7E.joints.map((n, i) => `${n.replace("_joint", "").padEnd(14)}${(SIM.q[i] * 180 / PI).toFixed(1).padStart(7)}°`).join("\n");
  }
  const redraw = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };

  SIM.views.add(redraw);
  new MutationObserver(() => { if (!body.isConnected) SIM.views.delete(redraw); }).observe($("#windows"), { childList: true });
  new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    redraw();
  }).observe(canvas);

  // orbit and zoom
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    cam.yaw = drag.yaw - (e.clientX - drag.x) * 0.008;
    cam.pitch = Math.max(0.03, Math.min(1.5, drag.pitch + (e.clientY - drag.y) * 0.006));
    redraw();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); cam.dist = Math.max(0.6, Math.min(5, cam.dist * Math.exp(e.deltaY * 0.0015))); redraw(); }, { passive: false });
  canvas.addEventListener("dblclick", () => { Object.assign(cam, camHome); redraw(); });
}
