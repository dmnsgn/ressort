import { describe, test } from "node:test";
import assert from "node:assert/strict";

import * as ressort from "../index.js";

const close = (actual, expected, epsilon = 1e-6, label = "") =>
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `${label} expected ${expected}, got ${actual}`,
  );

const closeVec = (actual, expected, epsilon = 1e-6) =>
  expected.forEach((value, i) => close(actual[i], value, epsilon, `[${i}]`));

const axisAngle = ([x, y, z], angle) => {
  const s = Math.sin(angle / 2);
  return [x * s, y * s, z * s, Math.cos(angle / 2)];
};

const UNDER = { omega: 9, zeta: 0.3 };
const CRITICAL = { omega: 9, zeta: 1 };
const OVER = { omega: 9, zeta: 2.5 };
const REGIMES = { under: UNDER, critical: CRITICAL, over: OVER };

// Reference integration of ẍ = −ω²(x − g) − 2ζω(ẋ − q), g moving at q.
function rk4({ omega, zeta }, x, v, goal, goalVelocity, duration) {
  const steps = 20000;
  const h = duration / steps;
  const acceleration = (t, x, v) =>
    -omega * omega * (x - goal - goalVelocity * t) -
    2 * zeta * omega * (v - goalVelocity);
  for (let i = 0; i < steps; i++) {
    const t = i * h;
    const k1x = v;
    const k1v = acceleration(t, x, v);
    const k2x = v + (h / 2) * k1v;
    const k2v = acceleration(t + h / 2, x + (h / 2) * k1x, k2x);
    const k3x = v + (h / 2) * k2v;
    const k3v = acceleration(t + h / 2, x + (h / 2) * k2x, k3x);
    const k4x = v + h * k3v;
    const k4v = acceleration(t + h, x + h * k3x, k4x);
    x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
  }
  return [x, v];
}

// Whole frames only, so different rates cover the same duration.
function simulate(config, hz, duration, goalVelocity = 0) {
  const step = ressort.createTransition();
  const state = { velocity: 1.5 };
  let goal = 2;
  let value = -1;
  for (let i = 0; i < Math.round(duration * hz); i++) {
    ressort.transition(step, config, 1 / hz);
    value = ressort.advance(value, goal, state, step, goalVelocity);
    goal += goalVelocity / hz;
  }
  return [value, state.velocity];
}

describe("config", () => {
  test("physical round trip", () => {
    const physical = { mass: 2, stiffness: 170, damping: 26 };
    const config = ressort.fromPhysical(physical);
    const back = ressort.toPhysical(config, 2);
    for (const key of Object.keys(physical)) close(back[key], physical[key]);
    close(ressort.fromPhysical({ stiffness: 100, damping: 20 }).zeta, 1);
    assert.equal(ressort.toPhysical(config).mass, 1);
  });

  test("perceptual round trip on both sides of critical", () => {
    for (const bounce of [-0.6, 0, 0.4]) {
      const perceptual = ressort.toPerceptual(
        ressort.fromPerceptual({ duration: 0.5, bounce }),
      );
      close(perceptual.duration, 0.5);
      close(perceptual.bounce, bounce);
    }
    assert.equal(ressort.fromPerceptual({ duration: 1 }).zeta, 1);
  });

  test("smooth time is critical and never divides by zero", () => {
    assert.deepEqual(ressort.fromSmoothTime(0.5), { omega: 4, zeta: 1 });
    assert.ok(Number.isFinite(ressort.fromSmoothTime(0).omega));
  });
});

describe("transition", () => {
  for (const [name, config] of Object.entries(REGIMES)) {
    test(`${name} matches RK4 with a moving goal`, () => {
      const step = ressort.transition(ressort.createTransition(), config, 0.4);
      const state = { velocity: 3 };
      const value = ressort.advance(-1, 2, state, step, 1.5);
      const [x, v] = rk4(config, -1, 3, 2, 1.5, 0.4);
      close(value, x, 1e-9);
      close(state.velocity, v, 1e-9);
    });

    test(`${name} is frame rate independent`, () => {
      const [a, va] = simulate(config, 24, 0.5, 2);
      const [b, vb] = simulate(config, 240, 0.5, 2);
      close(a, b, 1e-9);
      close(va, vb, 1e-9);
    });
  }

  test("the critical band joins both sides continuously", () => {
    const step = ressort.createTransition();
    const critical = { ...ressort.transition(step, CRITICAL, 0.3) };
    for (const zeta of [1 - 2e-4, 1 + 2e-4]) {
      ressort.transition(step, { omega: 9, zeta }, 0.3);
      for (const key of ["pp", "pv", "vp", "vv"]) {
        close(step[key], critical[key], 1e-3, key);
      }
    }
  });

  test("no time is the identity and negative time is no time", () => {
    const step = ressort.createTransition();
    for (const dt of [0, -1]) {
      ressort.transition(step, UNDER, dt);
      // Up to signed zeros.
      for (const [key, value] of Object.entries(ressort.createTransition())) {
        close(step[key], value, 1e-15, key);
      }
    }
  });

  test("no stiffness drifts at constant velocity", () => {
    const step = ressort.transition(
      ressort.createTransition(),
      { omega: 0, zeta: 0.5 },
      2,
    );
    const state = { velocity: 3 };
    assert.equal(ressort.advance(1, 10, state, step), 7);
    assert.equal(state.velocity, 3);
  });
});

describe("advance", () => {
  test("a moving goal is tracked exactly once caught up", () => {
    const step = ressort.transition(ressort.createTransition(), UNDER, 1 / 30);
    const state = { velocity: 2 };
    let goal = 5;
    let value = 5;
    for (let i = 0; i < 30; i++) {
      value = ressort.advance(value, goal, state, step, 2);
      goal += 2 / 30;
    }
    close(value, goal, 1e-9);
    close(state.velocity, 2, 1e-9);
  });

  test("vector matches the scalar per axis", () => {
    const step = ressort.transition(ressort.createTransition(), OVER, 1 / 60);
    const current = [0, 1, -2];
    const velocity = [0.5, 0, -1];
    const goal = [3, -1, 0];
    const goalVelocity = [1, 2, -3];
    const scalars = current.map((value, i) => {
      const state = { velocity: velocity[i] };
      value = ressort.advance(value, goal[i], state, step, goalVelocity[i]);
      return [value, state.velocity];
    });
    const current2 = current.slice(0, 2);
    const velocity2 = velocity.slice(0, 2);
    ressort.advanceVec2(current2, goal, velocity2, step, goalVelocity);
    ressort.advanceVec3(current, goal, velocity, step, goalVelocity);
    scalars.forEach(([value, v], i) => {
      close(current[i], value, 1e-12);
      close(velocity[i], v, 1e-12);
    });
    assert.deepEqual(current2, current.slice(0, 2));
    assert.deepEqual(velocity2, velocity.slice(0, 2));

    const still2 = [1, 0];
    ressort.advanceVec2(still2, [0, 0], [0, 0], step);
    assert.ok(still2[0] < 1);

    const still = [1, 0, 0];
    ressort.advanceVec3(still, [0, 0, 0], [0, 0, 0], step);
    assert.ok(still[0] < 1);
  });

  test("quaternion matches the scalar on the angle around a fixed axis", () => {
    const step = ressort.transition(ressort.createTransition(), UNDER, 1 / 60);
    const current = axisAngle([0, 0, 1], 1.2);
    const goal = [0, 0, 0, 1];
    const angularVelocity = [0, 0, 0];
    const state = { velocity: 0 };
    let angle = 1.2;
    for (let i = 0; i < 40; i++) {
      const remaining = ressort.advanceQuat(
        current,
        goal,
        angularVelocity,
        step,
      );
      angle = ressort.advance(angle, 0, state, step);
      close(remaining, Math.abs(angle), 1e-12);
    }
    // Underdamped: the angle crosses zero, so compare signed rotations.
    closeVec(current, axisAngle([0, 0, 1], angle), 1e-12);
    close(angularVelocity[2], state.velocity, 1e-12);
  });

  test("quaternion on its goal stays exactly on it", () => {
    const step = ressort.transition(ressort.createTransition(), UNDER, 1 / 60);
    const goal = axisAngle([0, 1, 0], 0.7);
    const current = [...goal];
    ressort.advanceQuat(current, goal, [0, 0, 0], step);
    assert.deepEqual(current, goal);
  });
});

describe("ease", () => {
  test("critical settling time from rest", () => {
    // (1 + x)·e^(−x) = 0.05 at x ≈ 4.7439.
    close(
      ressort.settlingTime(CRITICAL, 0, 0.05) * CRITICAL.omega,
      4.7439,
      1e-4,
    );
  });

  test("settling time holds for every regime and initial velocity", () => {
    const step = ressort.createTransition();
    for (const config of Object.values(REGIMES)) {
      for (const velocity of [0, 4, -4]) {
        const duration = ressort.settlingTime(config, velocity);
        const at = (t) => {
          ressort.transition(step, config, t);
          return Math.abs(step.pp - step.pv * velocity);
        };
        close(at(duration), 1e-3, 1e-9);
        for (let i = 1; i <= 20; i++)
          assert.ok(at(duration * (1 + i / 4)) <= 1e-3);
      }
    }
  });

  test("a spring that never settles has no duration", () => {
    assert.equal(ressort.settlingTime({ omega: 9, zeta: 0 }), Infinity);
    assert.equal(ressort.settlingTime({ omega: 0, zeta: 1 }), Infinity);
    assert.equal(ressort.settlingTime(UNDER, 0, 0), Infinity);
    assert.equal(ressort.settlingTime(UNDER, 0, -1), Infinity);
    assert.throws(() => ressort.ease({ omega: 9, zeta: 0 }), RangeError);
  });

  test("finds the last crossing when the damping is low", () => {
    const config = { omega: 10, zeta: 0.003 };
    const duration = ressort.settlingTime(config);
    const step = ressort.createTransition();
    const at = (t) => Math.abs(ressort.transition(step, config, t).pp);
    close(at(duration), 1e-3, 1e-9);
    // 200 samples per period over 20 periods.
    const period = (2 * Math.PI) / config.omega;
    for (let i = 1; i <= 4000; i++) {
      assert.ok(at(duration + (i * period) / 200) <= 1e-3);
    }
  });

  test("large damping ratios settle on the slow root", () => {
    // From rest the slow root dominates: e^(−t·ω/2ζ) = 1e-3.
    const zeta = 1e8;
    close(
      ressort.settlingTime({ omega: 1, zeta }) / (2 * zeta * Math.log(1e3)),
      1,
      1e-6,
    );
  });

  test("a threshold above the motion settles at once", () => {
    for (const config of Object.values(REGIMES)) {
      assert.equal(ressort.settlingTime(config, 0, 2), 0);
    }
  });

  test("goes from 0 to exactly 1 and overshoots when underdamped", () => {
    const { ease, duration } = ressort.ease(UNDER);
    close(duration, ressort.settlingTime(UNDER));
    assert.equal(ease(0), 0);
    assert.equal(ease(1), 1);
    assert.equal(ease(2), 1);
    const peak = Math.max(
      ...Array.from({ length: 100 }, (_, i) => ease(i / 100)),
    );
    assert.ok(peak > 1);
  });

  test("an initial velocity starts the curve with that slope", () => {
    const { ease, duration } = ressort.ease(CRITICAL, { velocity: 6 });
    const t = 1e-7;
    close(ease(t) / (t * duration), 6, 1e-4);
  });
});

describe("smoothDamp", () => {
  const run = (fn, hz, duration = 1) => {
    let value = 0;
    const state = { velocity: 0 };
    for (let i = 0; i < Math.round(duration * hz); i++) {
      value = fn(value, state, 1 / hz);
    }
    return value;
  };

  test("is the critical spring of fromSmoothTime", () => {
    const step = ressort.transition(
      ressort.createTransition(),
      ressort.fromSmoothTime(0.3),
      1 / 60,
    );
    const a = { velocity: 0.5 };
    const b = { velocity: 0.5 };
    close(
      ressort.smoothDamp(0, 10, a, 0.3, 1 / 60),
      ressort.advance(0, 10, b, step),
      1e-12,
    );
    close(a.velocity, b.velocity, 1e-12);
  });

  test("is frame rate independent", () => {
    const step = (value, state, dt) =>
      ressort.smoothDamp(value, 10, state, 0.3, dt);
    close(run(step, 30, 0.5), run(step, 144, 0.5), 1e-9);
  });

  test("never overshoots from below, above or with an incoming velocity", () => {
    for (const [from, target] of [
      [0, 1],
      [10, 2],
    ]) {
      let value = from;
      const state = { velocity: 0 };
      for (let i = 0; i < 300; i++) {
        value = ressort.smoothDamp(value, target, state, 0.2, 1 / 60);
        assert.ok((value - target) * (from - target) >= 0);
      }
      close(value, target, 1e-4);
    }

    const fast = { velocity: 100 };
    assert.equal(ressort.smoothDamp(0, 1, fast, 1, 0.1), 1);
    assert.equal(fast.velocity, 0);

    const current = [0, 0, 0];
    const velocity = [100, 0, 0];
    ressort.smoothDampVec3(current, [1, 0, 0], velocity, 1, 0.1);
    assert.deepEqual(current, [1, 0, 0]);
    assert.deepEqual(velocity, [0, 0, 0]);
  });

  test("maxSpeed bounds the speed, on the magnitude for vectors", () => {
    assert.ok(
      ressort.smoothDamp(0, 100, { velocity: 0 }, 0.1, 1 / 60, 1) <=
        1 / 60 + 1e-9,
    );
    const current = [0, 0, 0];
    ressort.smoothDampVec3(current, [100, 100, 0], [0, 0, 0], 0.1, 1 / 60, 1);
    assert.ok(Math.hypot(...current) <= 1 / 60 + 1e-9);
    close(current[0], current[1]);
  });

  test("2D vector matches the 3D vector in a plane", () => {
    const current2 = [0, 1];
    const velocity2 = [2, -1];
    const current3 = [0, 1, 0];
    const velocity3 = [2, -1, 0];
    for (let i = 0; i < 60; i++) {
      ressort.smoothDampVec2(current2, [3, -2], velocity2, 0.2, 1 / 60, 8);
      ressort.smoothDampVec3(current3, [3, -2, 0], velocity3, 0.2, 1 / 60, 8);
      assert.deepEqual(current2, current3.slice(0, 2));
      assert.deepEqual(velocity2, velocity3.slice(0, 2));
    }
    assert.equal(
      ressort.smoothDampVec2(current2, [0, 0], [0, 0], 0.2, 0),
      current2,
    );
  });

  test("zero maxSpeed stops scalars and vectors alike", () => {
    assert.equal(ressort.smoothDamp(0, 10, { velocity: 0 }, 0.3, 1 / 60, 0), 0);
    const current = [0, 0, 0];
    ressort.smoothDampVec3(current, [10, 0, 0], [0, 0, 0], 0.3, 1 / 60, 0);
    assert.deepEqual(current, [0, 0, 0]);
  });

  test("vector matches the scalar per axis", () => {
    const current = [0, 0, 0];
    const velocity = [0, 0, 0];
    let scalar = 0;
    const state = { velocity: 0 };
    for (let i = 0; i < 20; i++) {
      ressort.smoothDampVec3(current, [3, 0, 0], velocity, 0.3, 1 / 60);
      scalar = ressort.smoothDamp(scalar, 3, state, 0.3, 1 / 60);
    }
    close(current[0], scalar, 1e-12);
    close(velocity[0], state.velocity, 1e-12);
  });

  test("no time, no change", () => {
    const state = { velocity: 3 };
    assert.equal(ressort.smoothDamp(1, 5, state, 0.2, 0), 1);
    assert.equal(ressort.smoothDamp(1, 5, state, 0.2, -1), 1);
    assert.equal(state.velocity, 3);

    const current = [1, 2, 3];
    const velocity = [1, 1, 1];
    ressort.smoothDampVec3(current, [0, 0, 0], velocity, 0.2, 0);
    assert.deepEqual(
      [current, velocity],
      [
        [1, 2, 3],
        [1, 1, 1],
      ],
    );
  });

  test("zero smooth time snaps without NaN", () => {
    for (const smoothTime of [0, -1]) {
      const state = { velocity: 0 };
      close(ressort.smoothDamp(0, 1, state, smoothTime, 1 / 60), 1, 1e-9);
      assert.ok(Number.isFinite(state.velocity));
    }
  });
});

describe("smoothDampQuat", () => {
  test("matches smoothDamp on the angle around a fixed axis", () => {
    const current = axisAngle([0, 1, 0], 1.2);
    const target = [0, 0, 0, 1];
    const velocity = [0, 0, 0];
    const state = { velocity: 0 };
    let angle = 1.2;
    for (let i = 0; i < 20; i++) {
      const remaining = ressort.smoothDampQuat(
        current,
        target,
        velocity,
        0.3,
        1 / 60,
      );
      angle = ressort.smoothDamp(angle, 0, state, 0.3, 1 / 60);
      close(remaining, angle, 1e-12);
    }
    closeVec(current, axisAngle([0, 1, 0], angle), 1e-12);
    close(velocity[1], state.velocity, 1e-12);
  });

  test("takes the shortest path and settles exactly", () => {
    const current = axisAngle([1, 0, 0], 0.5);
    const target = [0, 0, 0, -1];
    const velocity = [0, 0, 0];
    assert.equal(
      ressort.smoothDampQuat(current, target, velocity, 0.2, 0),
      0.5,
    );
    let remaining = Infinity;
    for (let i = 0; i < 2000 && remaining > 0; i++) {
      remaining = ressort.smoothDampQuat(current, target, velocity, 0.2, 1);
    }
    assert.equal(remaining, 0);
    assert.deepEqual(current, target);
  });

  test("keeps angular velocity when the target changes axis", () => {
    const current = [0, 0, 0, 1];
    const velocity = [0, 2, 0];
    ressort.smoothDampQuat(current, axisAngle([1, 0, 0], 1), velocity, 1, 0.01);
    assert.ok(velocity[1] > 1.9);
  });
});

describe("quatDisplacement", () => {
  test("round-trips through applyQuatDisplacement", () => {
    const goal = axisAngle([0, 0, 1], 0.4);
    const current = axisAngle([0.6, 0, 0.8], 2);
    const displacement = [0, 0, 0];
    const angle = ressort.quatDisplacement(displacement, current, goal);
    const copy = [...displacement];
    const result = [0, 0, 0, 1];
    close(ressort.applyQuatDisplacement(result, goal, displacement), angle);
    closeVec(result, current);
    assert.deepEqual(displacement, copy);
  });
});

describe("damp", () => {
  test("is frame rate independent and halves per half-life", () => {
    const run = (hz, duration) => {
      let value = 0;
      for (let i = 0; i < Math.round(duration * hz); i++) {
        value = ressort.damp(value, 1, 0.2, 1 / hz);
      }
      return value;
    };
    close(run(30, 0.2), 0.5);
    close(run(144, 0.5), run(24, 0.5), 1e-9);
  });

  test("no half-life jumps, no time stays", () => {
    assert.equal(ressort.damp(0, 7, 0, 1 / 60), 7);
    assert.equal(ressort.damp(0, 7, -1, 1 / 60), 7);
    assert.equal(ressort.damp(3, 7, 0.5, 0), 3);
    assert.equal(ressort.damp(3, 7, 0.5, -1), 3);
    assert.equal(ressort.halfLifeDecay(0.5, -1), 1);
    assert.equal(ressort.halfLifeDecay(0.5, 0.5), 0.5);
    assert.equal(ressort.halfLifeDecay(0, 1), 0);
    assert.equal(ressort.halfLifeDecay(0, 0), 1);
    assert.equal(ressort.damp(0.1, 0.3, 0.5, 0), 0.1);
  });
});
