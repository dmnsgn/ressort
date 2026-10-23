import inverseLerp from "inverse-lerp";
import { eases } from "pex-math";
import * as ressort from "ressort";
import { Pane } from "tweakpane";

import { COLORS, PALETTE, createCanvas } from "./utils.js";

document.querySelector("main").innerHTML = /* html */ `
  <p class="Lead">
    <strong>Steppers side by side.</strong>
    Every lane chases the same goal with a different update. Click or drag in a
    lane to move the goal. More lanes and settings are in the panel.
  </p>
  <section class="Panel">
    <h2 class="Panel-title">Lanes</h2>
    <canvas class="Panel-canvas Panel-canvas--lanes"></canvas>
    <p class="Panel-status"></p>
  </section>
`;

const status = document.querySelector(".Panel-status");
const { canvas, context, resize, strokePath } = createCanvas(
  document.querySelector(".Panel-canvas--lanes"),
);

const LANE_GAP = 6;
const VALUE_RANGE = [-0.25, 1.25];
const VELOCITY_SCALE = 8;
const EASE_NAMES = [
  "cubicOut",
  "quadInOut",
  "expoOut",
  "sineInOut",
  "backOut",
  "elasticOut",
];

const settings = {
  scenario: "retarget",
  interval: 1.2,
  speed: 0.6,
  noise: 0.03,
  kick: 4,

  fps: 60,
  variableDt: false,
  timeScale: 1,
  window: 4,
  showVelocity: true,
  paused: false,

  easeName: "cubicOut",
  easeDuration: 0.6,

  halfLife: 0.12,

  smoothTime: 0.15,
  maxSpeed: 2,

  duration: 0.6,
  bounce: 0.3,
};

const readout = {
  omega: 0,
  zeta: 0,
  stiffness: 0,
  damping: 0,
};

// Derived from the settings: rebuilt on change, never per step.
let config;
const transition = ressort.createTransition();

function configure() {
  config = ressort.fromPerceptual(settings);
  const physical = ressort.toPhysical(config);
  Object.assign(readout, {
    omega: config.omega,
    zeta: config.zeta,
    stiffness: physical.stiffness,
    damping: physical.damping,
  });
}

// Lanes
// Every lane moves a value towards the same goal with a different logic.
const stepper = (step) => ({
  state: { velocity: 0 },
  reset(value) {
    this.value = value;
    this.velocity = this.state.velocity = 0;
  },
  kick(velocity) {
    this.state.velocity += velocity;
  },
  step(goal, goalVelocity, dt) {
    this.value = step(this.value, goal, this.state, goalVelocity, dt);
    this.velocity = this.state.velocity;
  },
});

const lanes = [
  {
    id: "easing",
    color: COLORS.easing,
    label: () =>
      `Easing · eases.${settings.easeName} · restarts on every new goal`,
    reset(value) {
      this.from = this.to = this.value = value;
      this.elapsed = Infinity;
      this.velocity = 0;
    },
    step(goal, _, dt) {
      // An easing only knows where it started: a new goal starts a new curve.
      if (goal !== this.to) {
        this.from = this.value;
        this.to = goal;
        this.elapsed = 0;
      }
      this.elapsed += dt;
      const t = Math.min(this.elapsed / settings.easeDuration, 1);
      const previous = this.value;
      this.value =
        this.from + (this.to - this.from) * eases[settings.easeName](t);
      this.velocity = (this.value - previous) / dt;
    },
  },
  {
    id: "damp",
    color: COLORS.damp,
    label: () => `Damp · damp() · no velocity: kinks on every new goal`,
    reset(value) {
      this.value = value;
      this.velocity = 0;
    },
    step(goal, _, dt) {
      const previous = this.value;
      this.value = ressort.damp(this.value, goal, settings.halfLife, dt);
      this.velocity = (this.value - previous) / dt;
    },
  },
  {
    id: "smoothDamp",
    color: COLORS.smoothDamp,
    label: () => `Smooth damp · smoothDamp() · never overshoots`,
    ...stepper((value, goal, state, _, dt) =>
      ressort.smoothDamp(
        value,
        goal,
        state,
        settings.smoothTime,
        dt,
        settings.maxSpeed,
      ),
    ),
  },
  {
    id: "spring",
    color: COLORS.spring,
    label: () => `Spring · advance() · keeps its speed, takes kicks`,
    ...stepper((value, goal, state) =>
      ressort.advance(value, goal, state, transition),
    ),
  },
  {
    id: "springMoving",
    color: COLORS.springMoving,
    label: () =>
      `Spring + goal velocity · advance(…, goalVelocity) · no lag behind a moving goal`,
    ...stepper((value, goal, state, goalVelocity) =>
      ressort.advance(value, goal, state, transition, goalVelocity),
    ),
  },
  {
    id: "euler",
    color: COLORS.euler,
    label: () =>
      `Euler spring · changes with the frame rate${
        performance.now() - eulerExploded < 1000 ? " · blew up, reset" : ""
      }`,
    ...stepper((value, goal, state, _, dt) => {
      const { omega, zeta } = config;
      const acceleration =
        -omega * omega * (value - goal) - 2 * zeta * omega * state.velocity;
      state.velocity += acceleration * dt;
      const next = value + state.velocity * dt;
      if (Number.isFinite(next) && Math.abs(next) < 1e3) return next;
      eulerExploded = performance.now();
      state.velocity = 0;
      return goal;
    }),
  },
];
let eulerExploded = -Infinity;
// The essential comparison first: the others are a toggle away.
const DEFAULT_LANES = new Set(["easing", "spring", "euler"]);
const visible = Object.fromEntries(
  lanes.map(({ id }) => [id, DEFAULT_LANES.has(id)]),
);

// Simulation
const simulation = {
  time: 0,
  goal: 0.5,
  goalVelocity: 0,
  direction: 1,
  nextRetarget: 0,
  pointerGoal: null,
  samples: [],
};

const randomGoal = (from) => {
  let goal;
  do goal = 0.15 + Math.random() * 0.7;
  while (Math.abs(goal - from) < 0.25);
  return goal;
};

// Sets the goal and its velocity at the start of the step.
const SCENARIOS = {
  retarget(s) {
    s.goalVelocity = 0;
    if (settings.interval > 0 && s.time >= s.nextRetarget) {
      s.goal = randomGoal(s.goal);
      s.nextRetarget = s.time + settings.interval;
    }
  },
  track(s) {
    const t = s.time;
    s.goal =
      0.5 +
      0.25 * Math.sin(1.7 * t) +
      0.1 * Math.sin(4.3 * t + 1) +
      settings.noise * (Math.random() * 2 - 1);
    s.goalVelocity =
      0.25 * 1.7 * Math.cos(1.7 * t) + 0.1 * 4.3 * Math.cos(4.3 * t + 1);
  },
  moving(s) {
    if (s.goal >= 0.8) s.direction = -1;
    if (s.goal <= 0.2) s.direction = 1;
    s.goalVelocity = s.direction * settings.speed;
  },
};

function simulate(dt) {
  const s = simulation;
  if (s.pointerGoal === null) {
    SCENARIOS[settings.scenario](s);
  } else {
    s.goal = s.pointerGoal;
    s.goalVelocity = 0;
  }

  // One transition per step, shared by every spring with the same config.
  ressort.transition(transition, config, dt);
  for (const lane of lanes) lane.step(s.goal, s.goalVelocity, dt);

  s.goal += s.goalVelocity * dt;
  s.time += dt;
  s.samples.push({
    time: s.time,
    goal: s.goal,
    values: lanes.map(({ value }) => value),
    velocities: lanes.map(({ velocity }) => velocity),
  });
  const oldest = s.time - settings.window - 1;
  while (s.samples[0].time < oldest) s.samples.shift();
}

function reset() {
  const s = simulation;
  s.goal = 0.5;
  s.goalVelocity = 0;
  s.nextRetarget = s.time + settings.interval;
  s.samples.length = 0;
  for (const lane of lanes) lane.reset(0.5);
}

function kick() {
  for (const lane of lanes) lane.kick?.(settings.kick);
}

// Layout
const layout = () => {
  const shown = lanes.filter(({ id }) => visible[id]);
  const laneHeight = canvas.clientHeight / Math.max(shown.length, 1);
  return shown.map((lane, i) => ({
    lane,
    x: 0,
    y: i * laneHeight,
    width: canvas.clientWidth,
    height: laneHeight - LANE_GAP,
  }));
};

const toY = (rect, value) =>
  rect.y + rect.height * (1 - inverseLerp(...VALUE_RANGE, value));
const fromY = (rect, y) =>
  VALUE_RANGE[0] +
  (1 - inverseLerp(rect.y, rect.y + rect.height, y)) *
    (VALUE_RANGE[1] - VALUE_RANGE[0]);

// Drawing
function drawLane({ lane, x, y, width, height }, index) {
  const rect = { x, y, width, height };
  const plotRight = x + width - 24;
  const plotWidth = plotRight - x;
  const { samples, time } = simulation;
  const toX = (t) => plotRight - ((time - t) / settings.window) * plotWidth;

  context.fillStyle = PALETTE.bg.chrome;
  context.fillRect(x, y, width, height);
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();

  for (const level of [0, 1]) {
    strokePath(
      [
        [x, toY(rect, level)],
        [plotRight, toY(rect, level)],
      ],
      PALETTE.bg.line,
    );
  }

  strokePath(
    samples.map((s) => [toX(s.time), toY(rect, s.goal)]),
    PALETTE.fg.muted,
    1,
    [4, 4],
  );
  if (settings.showVelocity) {
    const middle = y + height / 2;
    strokePath(
      samples.map((s) => [
        toX(s.time),
        middle - (s.velocities[index] / VELOCITY_SCALE) * height * 0.4,
      ]),
      `${lane.color}55`,
    );
  }
  const points = samples.map((s) => [toX(s.time), toY(rect, s.values[index])]);
  strokePath(points, lane.color, 2);
  // Few steps per second: show where the simulation actually sampled.
  if (settings.fps <= 30) {
    context.fillStyle = lane.color;
    for (const [px, py] of points) context.fillRect(px - 1.5, py - 1.5, 3, 3);
  }
  context.restore();

  context.beginPath();
  context.arc(plotRight + 12, toY(rect, lane.value), 5, 0, Math.PI * 2);
  context.fillStyle = lane.color;
  context.fill();
  context.fillStyle = PALETTE.fg.muted;
  context.fillRect(plotRight + 4, toY(rect, simulation.goal) - 0.5, 16, 1);

  context.fillStyle = lane.color;
  context.fillText(lane.label(), x + 8, y + 14);
}

function draw() {
  resize();

  for (const rect of layout()) drawLane(rect, lanes.indexOf(rect.lane));

  status.textContent = `t = ${simulation.time.toFixed(1)} s`;
}

// Input
const pointerGoal = (event) => {
  const rect = layout().find(
    ({ y, height }) => event.offsetY >= y && event.offsetY <= y + height,
  );
  return rect ? Math.min(Math.max(fromY(rect, event.offsetY), 0), 1) : null;
};
canvas.addEventListener("pointerdown", (event) => {
  simulation.pointerGoal = pointerGoal(event);
  if (simulation.pointerGoal !== null)
    canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (simulation.pointerGoal === null) return;
  simulation.pointerGoal = pointerGoal(event) ?? simulation.pointerGoal;
});
const release = () => {
  if (simulation.pointerGoal === null) return;
  simulation.goal = simulation.pointerGoal;
  simulation.pointerGoal = null;
  simulation.nextRetarget = simulation.time + settings.interval;
};
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);

// GUI
const pane = new Pane({ title: "Springs" });

const scenarioFolder = pane.addFolder({ title: "Goal" });
scenarioFolder.addBinding(settings, "scenario", {
  options: {
    "retarget: jumps": "retarget",
    "track: noisy signal": "track",
    "moving: constant speed": "moving",
  },
});
scenarioFolder.addBinding(settings, "interval", { min: 0, max: 4, step: 0.1 });
scenarioFolder.addBinding(settings, "speed", { min: 0.1, max: 2 });
scenarioFolder.addBinding(settings, "noise", { min: 0, max: 0.2 });
scenarioFolder.addBinding(settings, "kick", { min: -10, max: 10 });
scenarioFolder.addButton({ title: "Kick" }).on("click", kick);
scenarioFolder.addButton({ title: "Reset" }).on("click", reset);

const timeFolder = pane.addFolder({ title: "Time", expanded: false });
timeFolder.addBinding(settings, "fps", { min: 5, max: 240, step: 1 });
timeFolder.addBinding(settings, "variableDt");
timeFolder.addBinding(settings, "timeScale", { min: 0.1, max: 2 });
timeFolder.addBinding(settings, "window", { min: 1, max: 10, step: 0.5 });
timeFolder.addBinding(settings, "showVelocity");
timeFolder.addBinding(settings, "paused");

const easingFolder = pane.addFolder({ title: "Easing", expanded: false });
easingFolder.addBinding(settings, "easeName", {
  options: Object.fromEntries(EASE_NAMES.map((name) => [name, name])),
});
easingFolder.addBinding(settings, "easeDuration", { min: 0.1, max: 2 });

const dampFolder = pane.addFolder({ title: "Damp", expanded: false });
dampFolder.addBinding(settings, "halfLife", { min: 0.01, max: 1 });

const smoothDampFolder = pane.addFolder({
  title: "Smooth damp",
  expanded: false,
});
smoothDampFolder.addBinding(settings, "smoothTime", { min: 0.01, max: 1 });
smoothDampFolder.addBinding(settings, "maxSpeed", { min: 0.1, max: 10 });

const springFolder = pane.addFolder({ title: "Spring", expanded: false });
springFolder.addBinding(settings, "duration", { min: 0.1, max: 2 });
springFolder.addBinding(settings, "bounce", { min: -0.9, max: 0.9 });
const format = (value) => value.toFixed(3);
for (const key of Object.keys(readout)) {
  springFolder.addBinding(readout, key, { readonly: true, format });
}

const lanesFolder = pane.addFolder({ title: "Lanes" });
for (const { id } of lanes) lanesFolder.addBinding(visible, id);

// Only the spring settings shape the config. Monitors also emit a change on
// every poll.
const SPRING_KEYS = new Set(["duration", "bounce"]);
pane.on("change", ({ target }) => {
  if (target.key === "scenario") reset();
  if (SPRING_KEYS.has(target.key)) configure();
});

// Loop
const stepDuration = () =>
  (settings.variableDt ? 0.5 + Math.random() : 1) / settings.fps;

configure();
reset();

let last = performance.now();
let accumulator = 0;
let nextStep = stepDuration();
const frame = (now) => {
  const elapsed = Math.min((now - last) / 1000, 0.25);
  last = now;
  if (!settings.paused) {
    accumulator += elapsed * settings.timeScale;
    while (accumulator >= nextStep) {
      accumulator -= nextStep;
      simulate(nextStep);
      nextStep = stepDuration();
    }
  }
  draw();
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
