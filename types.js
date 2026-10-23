/**
 * Normalized spring: every parametrisation converts to it.
 *
 * @typedef {object} SpringConfig
 * @property {number} omega Natural frequency ω in radians per second.
 * @property {number} zeta Damping ratio ζ: < 1 bounces, 1 is critical, > 1
 *   creeps.
 */

/**
 * @typedef {object} PhysicalSpring
 * @property {number} mass
 * @property {number} stiffness Force per unit of displacement. Greater than 0:
 *   without it, nothing pulls towards the goal.
 * @property {number} damping Force per unit of velocity.
 */

/**
 * @typedef {object} PerceptualSpring
 * @property {number} duration Period of the undamped spring in seconds.
 * @property {number} bounce In (−1, 1]: 0 is critical, > 0 bounces, < 0 creeps.
 */

/**
 * Exact map from displacement and velocity to their values `dt` later:
 *
 * - `e₁ = pp·e₀ + pv·v₀`
 * - `v₁ = vp·e₀ + vv·v₀`
 *
 * Shared by every value stepped with the same config and `dt`.
 *
 * @typedef {object} SpringTransition
 * @property {number} dt Step in seconds.
 * @property {number} pp
 * @property {number} pv
 * @property {number} vp
 * @property {number} vv
 */

/**
 * Velocity carried between scalar steps.
 *
 * @typedef {object} SpringState
 * @property {number} velocity In units per second.
 */

/**
 * @typedef {object} SpringEaseOptions
 * @property {number} [velocity=0] Initial velocity towards the goal, in
 *   distances per second.
 * @property {number} [restThreshold=1e-3] Displacement, relative to the
 *   distance, under which the spring counts as settled.
 */

/**
 * Spring as an easing function over its settling time.
 *
 * @typedef {object} SpringEase
 * @property {function(number): number} ease Progress from 0 to 1 at normalized
 *   time `t`. Exactly 1 from `t = 1`.
 * @property {number} duration Settling time in seconds.
 */

export {};
