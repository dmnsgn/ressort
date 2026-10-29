import { quat, vec3 } from "pex-math";

const ZERO = [0, 0, 0];

/**
 * Steps a value towards `goal` with a spring.
 *
 * @param {number} current
 * @param {number} goal Goal at the start of the step. The caller advances a
 *   moving goal by `goalVelocity * dt`.
 * @param {import("../types.js").SpringState} state Updated in place.
 * @param {import("../types.js").SpringTransition} step
 * @param {number} [goalVelocity=0] Goal velocity over the step.
 * @returns {number} The new value.
 * @see https://theorangeduck.com/page/spring-roll-call#springdamper
 */
function advance(current, goal, state, step, goalVelocity = 0) {
  // A goal moving at a constant velocity is a still goal in its own frame of
  // reference: e = x − (g + q·t) follows the static spring, for any ζ.
  const displacement = current - goal;
  const relativeVelocity = state.velocity - goalVelocity;
  state.velocity =
    goalVelocity + step.vp * displacement + step.vv * relativeVelocity;
  return (
    goal +
    goalVelocity * step.dt +
    step.pp * displacement +
    step.pv * relativeVelocity
  );
}

const TEMP_STATE = { velocity: 0 };

function advanceAxes(size, current, goal, velocity, step, goalVelocity) {
  for (let i = 0; i < size; i++) {
    TEMP_STATE.velocity = velocity[i];
    current[i] = advance(
      current[i],
      goal[i],
      TEMP_STATE,
      step,
      goalVelocity[i],
    );
    velocity[i] = TEMP_STATE.velocity;
  }
  return current;
}

/**
 * 2D vector `advance`.
 *
 * @param {import("pex-math").Vec2} current Updated in place.
 * @param {import("pex-math").Vec2} goal Goal at the start of the step.
 * @param {import("pex-math").Vec2} velocity Updated in place.
 * @param {import("../types.js").SpringTransition} step
 * @param {import("pex-math").Vec2} [goalVelocity=[0, 0]]
 * @returns {import("pex-math").Vec2} `current`.
 */
function advanceVec2(current, goal, velocity, step, goalVelocity = ZERO) {
  return advanceAxes(2, current, goal, velocity, step, goalVelocity);
}

/**
 * Vector `advance`.
 *
 * @param {import("pex-math").Vec3} current Updated in place.
 * @param {import("pex-math").Vec3} goal Goal at the start of the step.
 * @param {import("pex-math").Vec3} velocity Updated in place.
 * @param {import("../types.js").SpringTransition} step
 * @param {import("pex-math").Vec3} [goalVelocity=[0, 0, 0]]
 * @returns {import("pex-math").Vec3} `current`.
 */
function advanceVec3(current, goal, velocity, step, goalVelocity = ZERO) {
  return advanceAxes(3, current, goal, velocity, step, goalVelocity);
}

const TEMP_QUAT = quat.create();
const TEMP_INVERSE = quat.create();
const TEMP_AXIS = vec3.create();

/**
 * Writes the rotation from `goal` to `current`, in world space, as a scaled
 * angle-axis vector along the shortest path.
 *
 * @private
 * @param {import("pex-math").Vec3} out
 * @param {import("pex-math").Quat} current
 * @param {import("pex-math").Quat} goal
 * @returns {number} The angle in radians.
 */
function quatDisplacement(out, current, goal) {
  const q = quat.mult(
    quat.set(TEMP_QUAT, current),
    quat.conjugate(quat.set(TEMP_INVERSE, goal)),
  );
  const x = q[0];
  const y = q[1];
  const z = q[2];
  const w = q[3];
  // q and -q are the same rotation.
  const sign = w < 0 ? -1 : 1;
  const sin = Math.sqrt(x * x + y * y + z * z);
  // atan2 stays accurate near identity, where acos(w) can't resolve tiny angles.
  const angle = 2 * Math.atan2(sin, sign * w);
  // angle / sin tends to 2 at identity.
  const scale = sin > 0 ? (sign * angle) / sin : 2;
  out[0] = x * scale;
  out[1] = y * scale;
  out[2] = z * scale;
  return angle;
}

/**
 * Sets `current` to `goal` rotated by the scaled angle-axis `displacement`.
 *
 * @private
 * @param {import("pex-math").Quat} current Updated in place.
 * @param {import("pex-math").Quat} goal
 * @param {import("pex-math").Vec3} displacement
 * @returns {number} The remaining angle in radians.
 */
function applyQuatDisplacement(current, goal, displacement) {
  const angle = vec3.length(displacement);
  // Copied rather than recomposed: normalize would perturb a settled rotation.
  if (angle === 0) {
    quat.set(current, goal);
  } else {
    const axis = vec3.scale(vec3.set(TEMP_AXIS, displacement), 1 / angle);
    quat.normalize(quat.mult(quat.fromAxisAngle(current, axis, angle), goal));
  }
  return angle;
}

const TEMP_DISPLACEMENT = vec3.create();

/**
 * Quaternion `advance`: springs the scaled angle-axis rotation from `goal` to
 * `current`.
 *
 * @param {import("pex-math").Quat} current Updated in place.
 * @param {import("pex-math").Quat} goal
 * @param {import("pex-math").Vec3} angularVelocity Scaled axis in radians per
 *   second, updated in place.
 * @param {import("../types.js").SpringTransition} step
 * @returns {number} The remaining angle in radians.
 * @see https://theorangeduck.com/page/spring-roll-call#quaternionspring
 */
function advanceQuat(current, goal, angularVelocity, step) {
  quatDisplacement(TEMP_DISPLACEMENT, current, goal);
  advanceVec3(TEMP_DISPLACEMENT, ZERO, angularVelocity, step);
  return applyQuatDisplacement(current, goal, TEMP_DISPLACEMENT);
}

export {
  ZERO,
  advance,
  advanceVec2,
  advanceVec3,
  advanceQuat,
  quatDisplacement,
  applyQuatDisplacement,
};
