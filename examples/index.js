import inverseLerp from "inverse-lerp";
import { vec2 } from "pex-math";
import * as ressort from "ressort";

import { COLORS, PALETTE, createCanvas } from "./utils.js";

document.querySelector("main").innerHTML = /* html */ `
  <p class="Lead">
    <strong>Springs that can change their mind.</strong>
    Retarget mid-motion without a jolt, at any frame rate. Step them every
    frame, or bake them into an easing curve and CSS
    <code class="Code">linear()</code>.
  </p>
  <section class="Panel">
    <h2 class="Panel-title">
      Both dots chase the same goal, which moves before they arrive. Click or
      drag to move it yourself.
    </h2>
    <canvas class="Panel-canvas Panel-canvas--field"></canvas>
  </section>
  <section class="Panel">
    <h2 class="Panel-title">Speed · ticks mark a new goal</h2>
    <canvas class="Panel-canvas Panel-canvas--speed"></canvas>
  </section>
  <ul class="Legend">
    <li style="color: ${COLORS.easing}">
      <strong class="Legend-name">Easing</strong> runs the same spring as a
      curve, but restarts from rest on every new goal: the path has corners and
      the speed drops to zero.
      <code class="Code Legend-code">vec2.lerp(position, goal, spring.ease(elapsed / spring.duration))</code>
    </li>
    <li style="color: ${COLORS.spring}">
      <strong class="Legend-name">Spring</strong> keeps its speed: the path
      bends and the speed never jumps.
      <code class="Code Legend-code">advanceVec2(position, goal, velocity, step)</code>
    </li>
  </ul>
`;

const field = createCanvas(document.querySelector(".Panel-canvas--field"));
const speedStrip = createCanvas(document.querySelector(".Panel-canvas--speed"));

const DURATION = 1.8;
const SPRING = ressort.fromPerceptual({ duration: DURATION, bounce: 0.45 });
// The easing is the spring itself: from rest both move identically, only
// retargeting tells them apart.
const SPRING_EASE = ressort.ease(SPRING);
// A third of a period in, the spring is near full speed: a new goal there
// bends its path the most.
const RETARGET_INTERVAL = DURATION / 3;
const IDLE_DELAY = 2;
const TRAIL = 2;
const HISTORY = 4;
const PADDING = 24;

// Goal
// Golden angle steps: every jump turns sharply and none repeats soon.
const autoGoal = (index) => {
  const angle = index * 2.39996;
  const radius = 0.2 + 0.2 * ((index * 0.618) % 1);
  return [0.5 + radius * Math.cos(angle), 0.5 + radius * Math.sin(angle)];
};

const goal = [0.5, 0.5];
const clock = { time: 0, nextRetarget: 0, goalIndex: 0, lastInput: -Infinity };
const retargets = [];

function setGoal(position) {
  vec2.set(goal, position);
  retargets.push(clock.time);
}

// Easing: knows where it started and where it goes, nothing else.
const easing = {
  position: [0.5, 0.5],
  from: [0.5, 0.5],
  to: [0.5, 0.5],
  elapsed: Infinity,
  speed: 0,
};

function updateEasing(dt) {
  if (!vec2.equals(easing.to, goal)) {
    vec2.set(easing.from, easing.position);
    vec2.set(easing.to, goal);
    easing.elapsed = 0;
  }
  easing.elapsed += dt;
  const t = Math.min(easing.elapsed / SPRING_EASE.duration, 1);
  const previous = vec2.copy(easing.position);
  vec2.lerp(
    vec2.set(easing.position, easing.from),
    easing.to,
    SPRING_EASE.ease(t),
  );
  easing.speed = dt > 0 ? vec2.distance(previous, easing.position) / dt : 0;
}

// Spring: carries its velocity from one goal to the next.
const spring = {
  position: [0.5, 0.5],
  velocity: [0, 0],
  speed: 0,
};
const step = ressort.createTransition();

function updateSpring(dt) {
  ressort.transition(step, SPRING, dt);
  ressort.advanceVec2(spring.position, goal, spring.velocity, step);
  spring.speed = vec2.length(spring.velocity);
}

// History
const samples = [];

function record() {
  samples.push({
    time: clock.time,
    easing: vec2.copy(easing.position),
    spring: vec2.copy(spring.position),
    easingSpeed: easing.speed,
    springSpeed: spring.speed,
  });
  const oldest = clock.time - HISTORY;
  while (samples[0].time < oldest) samples.shift();
  while (retargets.length && retargets[0] < oldest) retargets.shift();
}

// Drawing
const DOTS = [
  { key: "easing", color: COLORS.easing },
  { key: "spring", color: COLORS.spring },
];

const fieldRect = () => {
  const { clientWidth: width, clientHeight: height } = field.canvas;
  return {
    toScreen: ([x, y]) => [
      PADDING + x * (width - 2 * PADDING),
      PADDING + y * (height - 2 * PADDING),
    ],
    toWorld: (x, y) => [
      inverseLerp(PADDING, width - PADDING, x),
      inverseLerp(PADDING, height - PADDING, y),
    ],
  };
};

function drawField() {
  field.resize();
  const { context, strokePath } = field;
  const { toScreen } = fieldRect();

  const [goalX, goalY] = toScreen(goal);
  context.beginPath();
  context.arc(goalX, goalY, 10, 0, Math.PI * 2);
  context.strokeStyle = PALETTE.fg.muted;
  context.setLineDash([3, 3]);
  context.stroke();
  context.setLineDash([]);

  // Trails fade with age: corners stay visible for a moment after they happen.
  const trail = samples.filter(({ time }) => time >= clock.time - TRAIL);
  for (const { key, color } of DOTS) {
    for (let i = 1; i < trail.length; i++) {
      context.globalAlpha = 1 - (clock.time - trail[i].time) / TRAIL;
      strokePath(
        [toScreen(trail[i - 1][key]), toScreen(trail[i][key])],
        color,
        3,
      );
    }
    context.globalAlpha = 1;

    const [x, y] = toScreen((key === "easing" ? easing : spring).position);
    context.beginPath();
    context.arc(x, y, 7, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  }
}

function drawSpeed() {
  const { width, height } = speedStrip.resize();
  const { strokePath } = speedStrip;
  const bottom = height - 4;
  const toX = (time) => width - ((clock.time - time) / HISTORY) * width;
  const maxSpeed = Math.max(
    1,
    ...samples.flatMap((s) => [s.easingSpeed, s.springSpeed]),
  );
  const toY = (speed) => bottom - (speed / maxSpeed) * (bottom - 8);

  strokePath(
    [
      [0, bottom],
      [width, bottom],
    ],
    PALETTE.bg.line,
  );
  for (const time of retargets) {
    strokePath(
      [
        [toX(time), 0],
        [toX(time), bottom],
      ],
      PALETTE.fg.muted,
      1,
      [2, 3],
    );
  }
  for (const { key, color } of DOTS) {
    strokePath(
      samples.map((s) => [toX(s.time), toY(s[`${key}Speed`])]),
      color,
      2,
    );
  }
}

// Input
const pointerGoal = (event) => {
  const [x, y] = fieldRect().toWorld(event.offsetX, event.offsetY);
  return [Math.min(Math.max(x, 0), 1), Math.min(Math.max(y, 0), 1)];
};

field.canvas.addEventListener("pointerdown", (event) => {
  field.canvas.setPointerCapture(event.pointerId);
  setGoal(pointerGoal(event));
  clock.lastInput = clock.time;
});
field.canvas.addEventListener("pointermove", (event) => {
  if (!field.canvas.hasPointerCapture(event.pointerId)) return;
  vec2.set(goal, pointerGoal(event));
  clock.lastInput = clock.time;
});

// Loop
let last = performance.now();
const frame = (now) => {
  const dt = Math.min(Math.max(now - last, 0) / 1000, 0.1);
  last = now;
  clock.time += dt;

  const idle = clock.time - clock.lastInput > IDLE_DELAY;
  if (idle && clock.time >= clock.nextRetarget) {
    setGoal(autoGoal(clock.goalIndex++));
    clock.nextRetarget = clock.time + RETARGET_INTERVAL;
  }

  updateEasing(dt);
  updateSpring(dt);
  record();

  drawField();
  drawSpeed();
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
