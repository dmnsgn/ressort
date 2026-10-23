import inverseLerp from "inverse-lerp";
import * as ressort from "ressort";
import { Pane } from "tweakpane";

import { COLORS, PALETTE, createCanvas } from "./utils.js";

document.querySelector("main").innerHTML = /* html */ `
  <p class="Lead">
    <strong>Same motion at any frame rate.</strong>
    ressort solves the spring exactly over each frame, so 10 fps lands on the
    same curve as 120 fps. The usual per-frame update drifts as frames get
    longer, and blows up when they get too long.
  </p>
  <section class="Panel">
    <h2 class="Panel-title">
      A spring from 0 to 1, sampled once per frame. Dots are frames.
    </h2>
    <canvas class="Panel-canvas Panel-canvas--plot"></canvas>
  </section>
  <ul class="Legend">
    <li style="color: ${PALETTE.fg.muted}">
      <strong class="Legend-name">True curve</strong> of the spring, solved
      continuously.
    </li>
    <li style="color: ${COLORS.spring}">
      <strong class="Legend-name">Exact</strong> steps land on the curve
      whatever the frame rate.
      <code class="Code Legend-code">transition(step, config, dt); x = advance(x, goal, state, step);</code>
    </li>
    <li style="color: ${COLORS.euler}">
      <strong class="Legend-name">Euler</strong> steps drift off the curve as
      frames get longer, then blow up.
      <code class="Code Legend-code">velocity += acceleration * dt; x += velocity * dt;</code>
    </li>
  </ul>
`;

const plot = createCanvas(document.querySelector(".Panel-canvas--plot"));

const SPRING = ressort.fromPerceptual({ duration: 0.5, bounce: 0.3 });
const GOAL = 1;
const WINDOW = 1.2;
const LOOP_PAUSE = 0.6;
const Y_RANGE = [-0.4, 1.8];
const PADDING = { left: 32, right: 24, top: 12, bottom: 24 };

// Simulations
// Both run from rest at 0 towards GOAL, one step per frame, and return the
// [time, position] of every frame.
function simulateExact(dt) {
  const step = ressort.createTransition();
  ressort.transition(step, SPRING, dt);
  const state = { velocity: 0 };
  let x = 0;
  const frames = [[0, x]];
  for (let i = 1; i * dt <= WINDOW; i++) {
    x = ressort.advance(x, GOAL, state, step);
    frames.push([i * dt, x]);
  }
  return frames;
}

// The update most code writes: integrate the spring force with Euler.
function simulateEuler(dt) {
  const { omega, zeta } = SPRING;
  let x = 0;
  let velocity = 0;
  const frames = [[0, x]];
  for (let i = 1; i * dt <= WINDOW; i++) {
    const acceleration =
      -omega * omega * (x - GOAL) - 2 * zeta * omega * velocity;
    velocity += acceleration * dt;
    x += velocity * dt;
    frames.push([i * dt, x]);
  }
  return frames;
}

// A very fine exact run is the continuous curve.
const truth = simulateExact(1 / 1000);

// Frame rate
// Sweeps down and back up until the first input, so the page tells its story
// untouched.
const SWEEP = { min: 8, max: 60, period: 12 };
let sweeping = true;
const settings = { fps: SWEEP.max };
const readout = { dt: "" };

const sweptFps = (time) => {
  const phase = 0.5 + 0.5 * Math.cos((2 * Math.PI * time) / SWEEP.period);
  // Geometric: low frame rates, where things break, get as much time as high.
  return Math.round(SWEEP.min * (SWEEP.max / SWEEP.min) ** phase);
};

const pane = new Pane({ title: "Frame rate" });
pane.addBinding(settings, "fps", { min: 4, max: 120, step: 1 });
pane.addBinding(readout, "dt", { readonly: true });

// The sweep's refreshes and monitor polls would otherwise read as edits.
let syncing = false;
pane.on("change", ({ target }) => {
  if (!syncing && target.key === "fps") sweeping = false;
});

// Drawing
const DOTS = [
  { simulate: simulateExact, color: COLORS.spring },
  { simulate: simulateEuler, color: COLORS.euler },
];

function draw(time) {
  const { width, height } = plot.resize();
  const { context, strokePath } = plot;
  const left = PADDING.left;
  const right = width - PADDING.right;
  const top = PADDING.top;
  const bottom = height - PADDING.bottom;
  const toX = (t) => left + (t / WINDOW) * (right - left);
  const toY = (x) => bottom - inverseLerp(...Y_RANGE, x) * (bottom - top);
  const toScreen = ([t, x]) => [toX(t), toY(x)];

  context.fillStyle = PALETTE.fg.muted;
  for (const level of [0, GOAL]) {
    strokePath(
      [
        [left, toY(level)],
        [right, toY(level)],
      ],
      PALETTE.bg.line,
    );
    context.fillText(String(level), 8, toY(level) + 4);
  }
  for (let t = 0; t <= WINDOW + 1e-9; t += 0.2) {
    context.fillText(`${t.toFixed(1)}s`, toX(t) - 10, bottom + 16);
  }

  context.save();
  context.beginPath();
  context.rect(left, top, right - left, bottom - top);
  context.clip();

  strokePath(truth.map(toScreen), PALETTE.fg.muted, 2);

  // Each frame holds its value until the next one, as on screen.
  const playhead = time % (WINDOW + LOOP_PAUSE);
  const dt = 1 / settings.fps;
  let blownUp = false;
  for (const { simulate, color } of DOTS) {
    const frames = simulate(dt);
    blownUp ||= frames.some(([, x]) => x < Y_RANGE[0] || x > Y_RANGE[1]);
    const points = frames.map(toScreen);
    strokePath(points, `${color}88`);
    context.fillStyle = color;
    for (const [x, y] of points) context.fillRect(x - 2, y - 2, 4, 4);

    const [t, x] =
      frames[Math.min(Math.floor(playhead / dt), frames.length - 1)];
    context.beginPath();
    context.arc(toX(t), toY(x), 6, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  if (blownUp) {
    context.fillStyle = COLORS.euler;
    context.fillText("Euler blew up: off the chart", left + 8, top + 12);
  }

  strokePath(
    [
      [toX(Math.min(playhead, WINDOW)), top],
      [toX(Math.min(playhead, WINDOW)), bottom],
    ],
    `${PALETTE.fg.default}33`,
  );
}

// Loop
const start = performance.now();
const frame = (now) => {
  const time = Math.max(now - start, 0) / 1000;
  if (sweeping) {
    settings.fps = sweptFps(time);
    syncing = true;
    pane.refresh();
    syncing = false;
  }
  readout.dt = `${Math.round(1000 / settings.fps)} ms`;
  draw(time);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
