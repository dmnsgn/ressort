import { vec2, vec3 } from "pex-math";

import {
  ZERO,
  advance,
  advanceVec2,
  advanceVec3,
  quatDisplacement,
  applyQuatDisplacement,
} from "./advance.js";
import { MIN_SMOOTH_TIME, fromSmoothTime } from "./config.js";
import { createTransition, transition } from "./transition.js";

const TEMP_STEP = createTransition();

// Lowe's ω = 2 / smoothTime with the exact exponential rather than his
// polynomial approximation, 9% off at ω·dt = 2.
const criticalStep = (smoothTime, dt) =>
  transition(TEMP_STEP, fromSmoothTime(smoothTime), dt);

/**
 * Critically damped spring towards `target` that never overshoots it, with
 * Unity's signature.
 *
 * @param {number} current
 * @param {number} target
 * @param {import("../types.js").SpringState} state Updated in place.
 * @param {number} smoothTime In seconds. See `fromSmoothTime`.
 * @param {number} dt In seconds.
 * @param {number} [maxSpeed=Infinity] In units per second.
 * @returns {number} The new value.
 * @see Lowe, T. (2004). Critically damped ease-in/ease-out smoothing. Game Programming Gems 4, §1.10. ISBN 978-1584502951.
 * @see https://github.com/Unity-Technologies/UnityCsReference/blob/225b0fbdb57cc17d094e8056b71f8314aba56f73/Runtime/Export/Math/Mathf.cs#L276-L307
 * @see https://theorangeduck.com/page/spring-roll-call#critical
 */
function smoothDamp(
  current,
  target,
  state,
  smoothTime,
  dt,
  maxSpeed = Infinity,
) {
  if (dt <= 0) return current;

  // Clamping the distance handled per step bounds the speed towards far goals.
  const maxChange = maxSpeed * Math.max(MIN_SMOOTH_TIME, smoothTime);
  const change = Math.max(-maxChange, Math.min(current - target, maxChange));
  let output = advance(
    current,
    current - change,
    state,
    criticalStep(smoothTime, dt),
  );

  // Unity's boolean test snaps a value sitting on the target only when its
  // velocity is negative. The product, as in the vector version, is symmetric.
  if ((target - current) * (output - target) > 0) {
    output = target;
    state.velocity = 0;
  }
  return output;
}

const VEC2 = {
  vec: vec2,
  advanceVec: advanceVec2,
  direction: vec2.create(),
  goal: vec2.create(),
};
const VEC3 = {
  vec: vec3,
  advanceVec: advanceVec3,
  direction: vec3.create(),
  goal: vec3.create(),
};

function smoothDampAxes(
  { vec, advanceVec, direction, goal },
  current,
  target,
  velocity,
  smoothTime,
  dt,
  maxSpeed,
) {
  if (dt <= 0) return current;

  vec.sub(vec.set(direction, target), current);

  // vec.limit ignores a zero length, which must stop the motion here.
  const change = vec.sub(vec.set(goal, current), target);
  const maxChange = maxSpeed * Math.max(MIN_SMOOTH_TIME, smoothTime);
  const length = vec.length(change);
  if (length > maxChange) vec.scale(change, maxChange / length);
  vec.add(vec.scale(change, -1), current);

  advanceVec(current, goal, velocity, criticalStep(smoothTime, dt));

  if (vec.dot(vec.sub(vec.set(goal, current), target), direction) > 0) {
    vec.set(current, target);
    vec.set(velocity, ZERO);
  }
  return current;
}

/**
 * 2D vector `smoothDamp`: `maxSpeed` limits the magnitude of the velocity.
 *
 * @param {import("pex-math").Vec2} current Updated in place.
 * @param {import("pex-math").Vec2} target
 * @param {import("pex-math").Vec2} velocity Updated in place.
 * @param {number} smoothTime In seconds. See `fromSmoothTime`.
 * @param {number} dt In seconds.
 * @param {number} [maxSpeed=Infinity] In units per second.
 * @returns {import("pex-math").Vec2} `current`.
 * @see https://github.com/Unity-Technologies/UnityCsReference/blob/225b0fbdb57cc17d094e8056b71f8314aba56f73/Runtime/Export/Math/Vector2.cs#L447-L502
 */
function smoothDampVec2(
  current,
  target,
  velocity,
  smoothTime,
  dt,
  maxSpeed = Infinity,
) {
  return smoothDampAxes(
    VEC2,
    current,
    target,
    velocity,
    smoothTime,
    dt,
    maxSpeed,
  );
}

/**
 * Vector `smoothDamp`: `maxSpeed` limits the magnitude of the velocity.
 *
 * @param {import("pex-math").Vec3} current Updated in place.
 * @param {import("pex-math").Vec3} target
 * @param {import("pex-math").Vec3} velocity Updated in place.
 * @param {number} smoothTime In seconds. See `fromSmoothTime`.
 * @param {number} dt In seconds.
 * @param {number} [maxSpeed=Infinity] In units per second.
 * @returns {import("pex-math").Vec3} `current`.
 * @see https://github.com/Unity-Technologies/UnityCsReference/blob/225b0fbdb57cc17d094e8056b71f8314aba56f73/Runtime/Export/Math/Vector3.cs#L231-L301
 */
function smoothDampVec3(
  current,
  target,
  velocity,
  smoothTime,
  dt,
  maxSpeed = Infinity,
) {
  return smoothDampAxes(
    VEC3,
    current,
    target,
    velocity,
    smoothTime,
    dt,
    maxSpeed,
  );
}

const TEMP_DISPLACEMENT = vec3.create();

/**
 * Quaternion `smoothDamp`: damps the scaled angle-axis rotation from `target`
 * to `current`.
 *
 * @param {import("pex-math").Quat} current Updated in place.
 * @param {import("pex-math").Quat} target
 * @param {import("pex-math").Vec3} angularVelocity Scaled axis in radians per
 *   second, updated in place.
 * @param {number} smoothTime In seconds. See `fromSmoothTime`.
 * @param {number} dt In seconds.
 * @param {number} [maxSpeed=Infinity] In radians per second.
 * @returns {number} The remaining angle in radians.
 * @see https://theorangeduck.com/page/spring-roll-call#quaternionspring
 */
function smoothDampQuat(
  current,
  target,
  angularVelocity,
  smoothTime,
  dt,
  maxSpeed = Infinity,
) {
  const angle = quatDisplacement(TEMP_DISPLACEMENT, current, target);
  if (dt <= 0) return angle;
  smoothDampVec3(
    TEMP_DISPLACEMENT,
    ZERO,
    angularVelocity,
    smoothTime,
    dt,
    maxSpeed,
  );
  return applyQuatDisplacement(current, target, TEMP_DISPLACEMENT);
}

export { smoothDamp, smoothDampVec2, smoothDampVec3, smoothDampQuat };
