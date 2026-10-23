const MIN_SMOOTH_TIME = 1e-4;

/**
 * Spring from mass, stiffness and damping.
 *
 * @param {object} options
 * @param {number} [options.mass=1]
 * @param {number} options.stiffness Greater than 0.
 * @param {number} options.damping
 * @returns {import("../types.js").SpringConfig}
 * @see https://en.wikipedia.org/wiki/Harmonic_oscillator#Damped_harmonic_oscillator
 */
function fromPhysical({ mass = 1, stiffness, damping }) {
  return {
    omega: Math.sqrt(stiffness / mass),
    zeta: damping / (2 * Math.sqrt(stiffness * mass)),
  };
}

/**
 * Mass, stiffness and damping of a spring.
 *
 * @param {import("../types.js").SpringConfig} config
 * @param {number} [mass=1]
 * @returns {import("../types.js").PhysicalSpring}
 */
function toPhysical({ omega, zeta }, mass = 1) {
  return {
    mass,
    stiffness: omega * omega * mass,
    damping: 2 * zeta * omega * mass,
  };
}

/**
 * Spring from Apple's perceptual duration and bounce, as in SwiftUI.
 *
 * @param {object} options
 * @param {number} options.duration Period of the undamped spring in seconds.
 * @param {number} [options.bounce=0] In (−1, 1]: 0 is critical, > 0 bounces, <
 *   0 creeps.
 * @returns {import("../types.js").SpringConfig}
 * @see https://developer.apple.com/videos/play/wwdc2023/10158/
 * @see https://www.kvin.me/posts/effortless-ui-spring-animations
 */
function fromPerceptual({ duration, bounce = 0 }) {
  return {
    omega: (2 * Math.PI) / duration,
    zeta: bounce >= 0 ? 1 - bounce : 1 / (1 + bounce),
  };
}

/**
 * Perceptual duration and bounce of a spring.
 *
 * @param {import("../types.js").SpringConfig} config
 * @returns {import("../types.js").PerceptualSpring}
 */
function toPerceptual({ omega, zeta }) {
  return {
    duration: (2 * Math.PI) / omega,
    bounce: zeta <= 1 ? 1 - zeta : 1 / zeta - 1,
  };
}

/**
 * Critically damped spring from Lowe's and Unity's smooth time.
 *
 * From rest, it covers 59% of the distance in `smoothTime` and 95% in 2.37 ×
 * `smoothTime`.
 *
 * @param {number} smoothTime In seconds.
 * @returns {import("../types.js").SpringConfig}
 * @see Lowe, T. (2004). Critically damped ease-in/ease-out smoothing. Game Programming Gems 4, §1.10. ISBN 978-1584502951.
 */
function fromSmoothTime(smoothTime) {
  return { omega: 2 / Math.max(MIN_SMOOTH_TIME, smoothTime), zeta: 1 };
}

export {
  MIN_SMOOTH_TIME,
  fromPhysical,
  toPhysical,
  fromPerceptual,
  toPerceptual,
  fromSmoothTime,
};
