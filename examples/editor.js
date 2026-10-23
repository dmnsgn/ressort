import inverseLerp from "inverse-lerp";
import { eases } from "pex-math";
import * as ressort from "ressort";
import { Pane } from "tweakpane";

import { COLORS, PALETTE, createCanvas, highlight } from "./utils.js";

document.querySelector("main").innerHTML = /* html */ `
  <p class="Lead">
    <strong>Springs as easing curves.</strong>
    Pick how long and how bouncy, or fit a spring to an ease you already use,
    then copy it as JS or as CSS <code class="Code">linear()</code>.
  </p>
  <section class="Panel">
    <h2 class="Panel-title">
      Drag the curve: up and down sets the bounce, left and right the duration.
    </h2>
    <canvas class="Panel-canvas Panel-canvas--curve"></canvas>
  </section>
  <section class="Panel">
    <h2 class="Panel-title">Preview</h2>
    <div class="Preview"></div>
  </section>
  <section class="Panel">
    <h2 class="Panel-title">Export</h2>
    <div class="Export"></div>
  </section>
`;

const curve = createCanvas(document.querySelector(".Panel-canvas--curve"));
const previewElement = document.querySelector(".Preview");
const exportElement = document.querySelector(".Export");

// Step eases are factories, not curves.
const EASE_NAMES = Object.keys(eases).filter(
  (name) => !name.startsWith("step"),
);
// SwiftUI's named springs.
const PRESETS = {
  smooth: { duration: 0.5, bounce: 0 },
  snappy: { duration: 0.5, bounce: 0.15 },
  bouncy: { duration: 0.5, bounce: 0.3 },
};
const LOOP_PAUSE = 0.6;
const FIT_SAMPLES = 48;
const PADDING = { left: 32, right: 24, top: 16, bottom: 24 };

const settings = {
  duration: 0.5,
  bounce: 0.3,
  velocity: 0,

  easeName: "backOut",
  easeDuration: 0.6,
};

const readout = {
  settles: "",
  overshoot: "",
  physical: "",
  fitError: "",
};

// Derived from the settings: rebuilt on change.
let config;
let spring;
let linear;

const format = (value, digits = 3) => Number(value.toFixed(digits)).toString();

// CSS linear()
// Keeps the samples needed for the polyline to stay within `tolerance` of the
// curve: Ramer–Douglas–Peucker on the vertical error.
function simplify(points, tolerance) {
  const keep = new Set([0, points.length - 1]);
  const split = (first, last) => {
    const [x0, y0] = points[first];
    const [x1, y1] = points[last];
    let index = -1;
    let max = tolerance;
    for (let i = first + 1; i < last; i++) {
      const [x, y] = points[i];
      const error = Math.abs(y - (y0 + (y1 - y0) * inverseLerp(x0, x1, x)));
      if (error > max) {
        max = error;
        index = i;
      }
    }
    if (index === -1) return;
    keep.add(index);
    split(first, index);
    split(index, last);
  };
  split(0, points.length - 1);
  return [...keep].sort((a, b) => a - b).map((i) => points[i]);
}

function toLinear(ease, samples = 240, tolerance = 1e-3) {
  const points = Array.from({ length: samples + 1 }, (_, i) => [
    i / samples,
    ease(i / samples),
  ]);
  const stops = simplify(points, tolerance);
  return `linear(${stops
    .map(([t, y], i) =>
      i === 0 || i === stops.length - 1
        ? format(y, 4)
        : `${format(y, 4)} ${format(t * 100, 2)}%`,
    )
    .join(", ")})`;
}

// Spring
function configure() {
  config = ressort.fromPerceptual(settings);
  spring = ressort.ease(config, { velocity: settings.velocity });
  linear = toLinear(spring.ease);

  const peak = Math.max(
    ...Array.from({ length: 401 }, (_, i) => spring.ease(i / 400)),
  );
  const { stiffness, damping } = ressort.toPhysical(config);
  Object.assign(readout, {
    settles: `${format(spring.duration, 2)} s`,
    overshoot: peak > 1.001 ? `${format((peak - 1) * 100, 1)}%` : "none",
    physical: `mass 1, stiffness ${format(stiffness, 1)}, damping ${format(damping, 2)}`,
  });
  writeExport();
}

// Export
const codeBlocks = Object.fromEntries(
  [
    ["js", "JS"],
    ["css", "CSS"],
  ].map(([key, title]) => {
    const figure = document.createElement("figure");
    const caption = document.createElement("figcaption");
    const button = document.createElement("button");
    const pre = document.createElement("pre");
    figure.className = "CodeBlock";
    caption.className = "CodeBlock-caption";
    button.className = "Button";
    pre.className = "CodeBlock-code";
    caption.textContent = title;
    button.textContent = "Copy";
    button.addEventListener("click", () =>
      navigator.clipboard.writeText(pre.textContent),
    );
    caption.append(button);
    figure.append(caption, pre);
    exportElement.append(figure);
    return [key, pre];
  }),
);

function writeExport() {
  const parameters = `{ duration: ${format(settings.duration)}, bounce: ${format(settings.bounce)} }`;
  const options = settings.velocity
    ? `, { velocity: ${format(settings.velocity)} }`
    : "";
  codeBlocks.js.textContent = `import { ease, fromPerceptual } from "ressort";

const spring = ease(fromPerceptual(${parameters})${options});
value = from + (to - from) * spring.ease(elapsed / spring.duration);`;
  codeBlocks.css.textContent = `transition: transform ${Math.round(spring.duration * 1000)}ms ${linear};`;
  for (const [language, pre] of Object.entries(codeBlocks)) {
    highlight(pre, language);
  }
}

// Fit
// The shape of a normalized spring curve only depends on ζ and the velocity
// relative to ω. Fit both at ω = 1, then pick ω so the spring settles in the
// duration of the ease.
function fitError(bounce, velocity, target) {
  const { ease } = ressort.ease(
    ressort.fromPerceptual({ duration: 2 * Math.PI, bounce }),
    { velocity },
  );
  let sum = 0;
  for (let i = 0; i <= FIT_SAMPLES; i++) {
    sum += (ease(i / FIT_SAMPLES) - target[i]) ** 2;
  }
  return Math.sqrt(sum / (FIT_SAMPLES + 1));
}

function fit() {
  const ease = eases[settings.easeName];
  const target = Array.from({ length: FIT_SAMPLES + 1 }, (_, i) =>
    ease(i / FIT_SAMPLES),
  );

  let best = { bounce: 0, velocity: 0, error: Infinity };
  const search = (bounces, velocities) => {
    for (const bounce of bounces) {
      for (const velocity of velocities) {
        const error = fitError(bounce, velocity, target);
        if (error < best.error) best = { bounce, velocity, error };
      }
    }
  };
  const range = (from, to, step, min = -Infinity, max = Infinity) =>
    Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) =>
      Math.min(Math.max(from + i * step, min), max),
    );
  // Coarse grid, then two finer passes around the best match.
  search(range(-0.9, 0.9, 0.05), range(-1, 6, 0.25));
  for (const [bounceStep, velocityStep] of [
    [0.01, 0.05],
    [0.002, 0.01],
  ]) {
    const { bounce, velocity } = best;
    search(
      range(
        bounce - 5 * bounceStep,
        bounce + 5 * bounceStep,
        bounceStep,
        -0.9,
        0.9,
      ),
      range(
        velocity - 5 * velocityStep,
        velocity + 5 * velocityStep,
        velocityStep,
      ),
    );
  }

  const shape = ressort.fromPerceptual({
    duration: 2 * Math.PI,
    bounce: best.bounce,
  });
  const omega =
    ressort.settlingTime(shape, best.velocity) / settings.easeDuration;
  Object.assign(settings, {
    duration: (2 * Math.PI) / omega,
    bounce: best.bounce,
    velocity: best.velocity * omega,
  });
  change();
  readout.fitError = `${format(best.error * 100, 1)}% RMS`;
}

// Preview
// The same curve run twice: by ressort in JS, and by the browser as a CSS
// transition with the exported linear().
const rows = [
  { id: "spring", label: "ease() in JS", color: COLORS.spring },
  { id: "css", label: "CSS transition with linear()", color: COLORS.css },
].map((row) => {
  const element = document.createElement("div");
  const label = document.createElement("div");
  const rail = document.createElement("div");
  const box = document.createElement("div");
  element.className = "Preview-row";
  rail.className = "Preview-rail";
  box.className = "Preview-box";
  label.textContent = row.label;
  label.style.color = box.style.background = row.color;
  rail.append(box);
  element.append(label, rail);
  previewElement.append(element);
  return { ...row, box };
});
const [jsRow, cssRow] = rows;

const preview = { time: 0, start: 0, goal: 0 };

function play() {
  preview.start = preview.time;
  preview.goal = 1 - preview.goal;
  cssRow.box.style.transition = `left ${Math.round(spring.duration * 1000)}ms ${linear}`;
  cssRow.box.style.left = `${preview.goal * 100}%`;
}

function replay() {
  preview.goal = 0;
  cssRow.box.style.transition = "none";
  cssRow.box.style.left = "0%";
  // Commits the reset position before the transition starts.
  cssRow.box.getBoundingClientRect();
  play();
}

function updatePreview() {
  const elapsed = preview.time - preview.start;
  if (elapsed > spring.duration + LOOP_PAUSE) play();
  const progress = spring.ease(Math.min(elapsed / spring.duration, 1));
  const position = preview.goal ? progress : 1 - progress;
  jsRow.box.style.left = `${position * 100}%`;
}

// Curve
// Frozen while dragging, so the scale doesn't move under the pointer.
let span = 1;
const fitSpan = () => {
  span = Math.min(Math.max(spring.duration, settings.easeDuration) * 1.15, 6);
};

function plotRect() {
  const { clientWidth: width, clientHeight: height } = curve.canvas;
  return {
    left: PADDING.left,
    right: width - PADDING.right,
    top: PADDING.top,
    bottom: height - PADDING.bottom,
  };
}

function drawCurve() {
  curve.resize();
  const { context, strokePath } = curve;
  const { left, right, top, bottom } = plotRect();

  const sample = (ease, duration) =>
    Array.from({ length: 401 }, (_, i) => {
      const t = (i / 400) * span;
      return [t, ease(Math.min(t / duration, 1))];
    });
  const springPoints = sample(spring.ease, spring.duration);
  const referencePoints = sample(
    eases[settings.easeName],
    settings.easeDuration,
  );
  const values = [...springPoints, ...referencePoints].map(([, y]) => y);
  const low = Math.min(-0.1, ...values) - 0.05;
  const high = Math.max(1.1, ...values) + 0.05;
  const toX = (t) => left + (t / span) * (right - left);
  const toY = (y) => bottom - inverseLerp(low, high, y) * (bottom - top);
  const toScreen = ([t, y]) => [toX(t), toY(y)];

  context.fillStyle = PALETTE.fg.muted;
  for (const level of [0, 1]) {
    strokePath(
      [
        [left, toY(level)],
        [right, toY(level)],
      ],
      PALETTE.bg.line,
    );
    context.fillText(String(level), 8, toY(level) + 4);
  }
  const tick = span > 2 ? 0.5 : 0.25;
  for (let t = 0; t <= span; t += tick) {
    context.fillText(`${format(t, 2)}s`, toX(t) - 10, bottom + 16);
  }

  strokePath(referencePoints.map(toScreen), PALETTE.fg.muted, 1.5, [6, 4]);
  context.fillText(
    `eases.${settings.easeName}`,
    toX(settings.easeDuration) + 6,
    toY(1) - 6,
  );

  strokePath(springPoints.map(toScreen), COLORS.spring, 3);
  context.fillStyle = COLORS.spring;

  // Annotations on the curve itself: what the numbers mean, where they are.
  const peak = springPoints.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (peak[1] > 1.001) {
    const [x, y] = toScreen(peak);
    context.beginPath();
    context.arc(x, y, 4, 0, Math.PI * 2);
    context.fill();
    context.fillText(`+${readout.overshoot} overshoot`, x + 8, y - 6);
  }
  const settleX = toX(spring.duration);
  strokePath(
    [
      [settleX, toY(1) - 10],
      [settleX, toY(1) + 10],
    ],
    COLORS.spring,
    2,
  );
  context.fillText(`settles in ${readout.settles}`, settleX + 6, toY(1) + 18);

  const elapsed = preview.time - preview.start;
  if (elapsed < span) {
    strokePath(
      [
        [toX(elapsed), top],
        [toX(elapsed), bottom],
      ],
      `${PALETTE.fg.default}33`,
    );
  }
}

// Dragging is relative: right is longer, up is bouncier.
let drag = null;
curve.canvas.addEventListener("pointerdown", (event) => {
  curve.canvas.setPointerCapture(event.pointerId);
  drag = { x: event.offsetX, y: event.offsetY, ...settings };
});
curve.canvas.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const { left, right, top, bottom } = plotRect();
  const secondsPerPixel = span / (right - left);
  const bouncePerPixel = 1.5 / (bottom - top);
  settings.duration = Math.min(
    Math.max(drag.duration + (event.offsetX - drag.x) * secondsPerPixel, 0.1),
    2,
  );
  settings.bounce = Math.min(
    Math.max(drag.bounce - (event.offsetY - drag.y) * bouncePerPixel, -0.9),
    0.9,
  );
  configure();
  sync();
});
const release = () => {
  if (!drag) return;
  drag = null;
  readout.fitError = "";
  fitSpan();
  replay();
};
curve.canvas.addEventListener("pointerup", release);
curve.canvas.addEventListener("pointercancel", release);

// GUI
const pane = new Pane({ title: "Spring" });

const presetsFolder = pane.addFolder({ title: "Presets" });
for (const [name, preset] of Object.entries(PRESETS)) {
  presetsFolder.addButton({ title: name }).on("click", () => {
    Object.assign(settings, preset, { velocity: 0 });
    change();
  });
}

const springFolder = pane.addFolder({ title: "Parameters" });
springFolder.addBinding(settings, "duration", { min: 0.1, max: 2 });
springFolder.addBinding(settings, "bounce", { min: -0.9, max: 0.9 });
springFolder.addBinding(settings, "velocity", { min: -20, max: 40 });
for (const key of ["settles", "overshoot", "physical"]) {
  springFolder.addBinding(readout, key, { readonly: true });
}

const fitFolder = pane.addFolder({ title: "Fit to an ease" });
fitFolder.addBinding(settings, "easeName", {
  label: "ease",
  options: Object.fromEntries(EASE_NAMES.map((name) => [name, name])),
});
fitFolder.addBinding(settings, "easeDuration", {
  label: "duration",
  min: 0.1,
  max: 3,
});
fitFolder.addButton({ title: "Fit spring to ease" }).on("click", fit);
fitFolder.addBinding(readout, "fitError", { label: "error", readonly: true });

// Programmatic refreshes would otherwise read as edits.
let syncing = false;
const sync = () => {
  syncing = true;
  pane.refresh();
  syncing = false;
};

function change() {
  configure();
  fitSpan();
  sync();
  replay();
}

pane.on("change", ({ target, last }) => {
  // Monitors emit a change on every poll.
  if (syncing || target.key in readout) return;
  if (target.key !== "easeName" && target.key !== "easeDuration") {
    readout.fitError = "";
  }
  configure();
  fitSpan();
  sync();
  // Restarting on every slider move would never let the preview play.
  if (last) replay();
});

// Loop
configure();
fitSpan();
sync();
replay();

let last = performance.now();
const frame = (now) => {
  preview.time += Math.min(Math.max(now - last, 0) / 1000, 0.1);
  last = now;
  updatePreview();
  drawCurve();
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
