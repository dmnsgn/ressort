/**
 * Fraction of the distance left after `dt` with exponential damping.
 *
 * @param {number} halfLife Time to cover half the remaining distance, in
 *   seconds. 0 or less leaves nothing.
 * @param {number} dt In seconds. 0 or less leaves everything, whatever the
 *   half-life.
 * @returns {number}
 * @see https://theorangeduck.com/page/spring-roll-call#exactdamper
 */
function halfLifeDecay(halfLife, dt) {
  if (!(dt > 0)) return 1;
  return halfLife > 0 ? 2 ** (-dt / halfLife) : 0;
}

/**
 * Exponential damping towards `target`: no velocity, no overshoot.
 *
 * @param {number} current
 * @param {number} target
 * @param {number} halfLife Time to cover half the remaining distance, in
 *   seconds.
 * @param {number} dt In seconds.
 * @returns {number} The new value.
 * @see https://theorangeduck.com/page/spring-roll-call#exactdamper
 * @see https://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/
 */
function damp(current, target, halfLife, dt) {
  const decay = halfLifeDecay(halfLife, dt);
  // target + (current − target) can round away from current.
  return decay === 1 ? current : target + (current - target) * decay;
}

export { halfLifeDecay, damp };
