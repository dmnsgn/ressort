// Inside this band the under/over forms divide by a vanishing root separation.
const CRITICAL_BAND = 1e-4;

/**
 * Identity transition, to be filled by `transition`.
 *
 * @returns {import("../types.js").SpringTransition}
 */
function createTransition() {
  return { dt: 0, pp: 1, pv: 0, vp: 0, vv: 1 };
}

// Every field up front: one shape whatever the regime.
const createRoots = () => ({
  regime: "drift",
  alpha: 0,
  beta: 0,
  z1: 0,
  z2: 0,
});

const ROOTS = createRoots();

/**
 * Writes the regime of a spring and the roots of `s² + 2ζω·s + ω² = 0`: `−α ±
 * iβ` when underdamped, `z₁ < z₂` when overdamped.
 *
 * @ignore
 * @param {object} out
 * @param {import("../types.js").SpringConfig} config
 * @returns {object} `out`.
 */
function roots(out, { omega, zeta }) {
  if (!(omega > 0)) {
    out.regime = "drift";
  } else if (Math.abs(zeta - 1) < CRITICAL_BAND) {
    out.regime = "critical";
  } else if (zeta < 1) {
    out.regime = "underdamped";
    out.alpha = zeta * omega;
    out.beta = omega * Math.sqrt(1 - zeta * zeta);
  } else {
    out.regime = "overdamped";
    const root = omega * Math.sqrt(zeta * zeta - 1);
    out.z1 = -zeta * omega - root;
    // z₁·z₂ = ω². −ζω + root cancels out for large ζ.
    out.z2 = (omega * omega) / out.z1;
  }
  return out;
}

/**
 * Exact transition of a spring over `dt`, for any damping ratio.
 *
 * @param {import("../types.js").SpringTransition} out
 * @param {import("../types.js").SpringConfig} config
 * @param {number} dt Step in seconds. 0 or less leaves the state unchanged.
 * @returns {import("../types.js").SpringTransition}
 * @see https://www.ryanjuckett.com/damped-springs/
 */
function transition(out, config, dt) {
  dt = Math.max(0, dt);
  out.dt = dt;

  const { omega } = config;
  const { regime, alpha, beta, z1, z2 } = roots(ROOTS, config);
  // No stiffness: the value drifts at its velocity.
  switch (regime) {
    case "drift": {
      out.pp = 1;
      out.pv = dt;
      out.vp = 0;
      out.vv = 1;

      break;
    }
    case "critical": {
      const decay = Math.exp(-omega * dt);
      out.pp = decay * (1 + omega * dt);
      out.pv = dt * decay;
      out.vp = -omega * omega * dt * decay;
      out.vv = decay * (1 - omega * dt);

      break;
    }
    case "underdamped": {
      const decay = Math.exp(-alpha * dt);
      const cos = Math.cos(beta * dt);
      const sin = Math.sin(beta * dt);
      out.pp = decay * (cos + (alpha / beta) * sin);
      out.pv = (decay * sin) / beta;
      out.vp = (-decay * omega * omega * sin) / beta;
      out.vv = decay * (cos - (alpha / beta) * sin);

      break;
    }
    default: {
      const e1 = Math.exp(z1 * dt);
      const e2 = Math.exp(z2 * dt);
      const separation = z2 - z1;
      out.pp = (z2 * e1 - z1 * e2) / separation;
      out.pv = (e2 - e1) / separation;
      out.vp = (z1 * z2 * (e1 - e2)) / separation;
      out.vv = (z2 * e2 - z1 * e1) / separation;
    }
  }
  return out;
}

export { CRITICAL_BAND, createRoots, roots, createTransition, transition };
