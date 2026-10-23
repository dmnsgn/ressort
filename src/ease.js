import { createTransition, roots, transition } from "./transition.js";

const SAMPLES = 1000;
const ITERATIONS = 40;

const TEMP = createTransition();

// Displacement at `time` from displacement 1 and velocity `velocity`.
function displacement(config, velocity, time) {
  transition(TEMP, config, time);
  return TEMP.pp + TEMP.pv * velocity;
}

const ROOTS = {};

// Upper bound of |displacement| from displacement 1, without oscillation.
function envelope(omega, { regime, z1, z2 }, velocity, time) {
  if (regime === "critical") {
    return (1 + Math.abs(velocity + omega) * time) * Math.exp(-omega * time);
  }
  const c2 = (velocity - z1) / (z2 - z1);
  return (
    Math.abs(1 - c2) * Math.exp(z1 * time) + Math.abs(c2) * Math.exp(z2 * time)
  );
}

/**
 * Time after which the displacement stays under `restThreshold`, starting from
 * displacement 1.
 *
 * @param {import("../types.js").SpringConfig} config
 * @param {number} [velocity=0] Initial velocity towards the goal, in distances
 *   per second.
 * @param {number} [restThreshold=1e-3] Relative to the distance.
 * @returns {number} In seconds. Infinity when the spring never settles.
 */
function settlingTime(config, velocity = 0, restThreshold = 1e-3) {
  const { omega, zeta } = config;
  if (!(zeta > 0 && omega > 0 && restThreshold > 0)) return Infinity;
  const v = -velocity;
  const springRoots = roots(ROOTS, config);
  const { regime, alpha, beta } = springRoots;

  // A window bounds the last threshold crossing, a backward scan finds it and
  // bisection refines it.
  let start = 0;
  let end = 1 / omega;
  if (regime === "underdamped") {
    // e^(−αt)·A·cos(βt − φ): the envelope is exact and the last peak of |cos|
    // before it reaches the threshold is still above it. Sampling that half
    // period, rather than every period up to the end, keeps low damping exact.
    const ratio = (v + alpha) / beta;
    const phase = Math.atan2(ratio, 1);
    end = Math.max(0, Math.log(Math.hypot(1, ratio) / restThreshold) / alpha);
    const peak = Math.floor((beta * end - phase) / Math.PI);
    start = Math.max(0, (phase + peak * Math.PI) / beta);
  } else {
    while (envelope(omega, springRoots, v, end) > restThreshold) end *= 2;
  }

  const interval = (end - start) / SAMPLES;
  let index = SAMPLES;
  while (
    index >= 0 &&
    Math.abs(displacement(config, v, start + index * interval)) <= restThreshold
  ) {
    index--;
  }
  if (index < 0) return start;

  let low = start + index * interval;
  let high = low + interval;
  for (let i = 0; i < ITERATIONS; i++) {
    const middle = (low + high) / 2;
    if (Math.abs(displacement(config, v, middle)) > restThreshold) low = middle;
    else high = middle;
  }
  return high;
}

/**
 * Spring from 0 to 1 as an easing function over its settling time.
 *
 * @param {import("../types.js").SpringConfig} config
 * @param {import("../types.js").SpringEaseOptions} [options]
 * @returns {import("../types.js").SpringEase}
 * @throws {RangeError} When the spring never settles: see `settlingTime`.
 */
function ease(config, { velocity = 0, restThreshold = 1e-3 } = {}) {
  const duration = settlingTime(config, velocity, restThreshold);
  if (duration === Infinity) {
    throw new RangeError("The spring never settles: it has no easing.");
  }
  return {
    duration,
    ease: (t) =>
      t >= 1 ? 1 : 1 - displacement(config, -velocity, t * duration),
  };
}

export { settlingTime, ease };
