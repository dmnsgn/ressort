# ressort

[![npm version](https://img.shields.io/npm/v/ressort)](https://www.npmjs.com/package/ressort)
[![stability-stable](https://img.shields.io/badge/stability-stable-green.svg)](https://www.npmjs.com/package/ressort)
[![npm minzipped size](https://img.shields.io/bundlephobia/minzip/ressort)](https://bundlephobia.com/package/ressort)
[![dependencies](https://img.shields.io/librariesio/release/npm/ressort)](https://github.com/dmnsgn/ressort/blob/main/package.json)
[![types](https://img.shields.io/npm/types/ressort)](https://github.com/microsoft/TypeScript)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-fa6673.svg)](https://conventionalcommits.org)
[![styled with prettier](https://img.shields.io/badge/styled_with-Prettier-f8bc45.svg?logo=prettier)](https://github.com/prettier/prettier)
[![linted with eslint](https://img.shields.io/badge/linted_with-ES_Lint-4B32C3.svg?logo=eslint)](https://github.com/eslint/eslint)
[![license](https://img.shields.io/github/license/dmnsgn/ressort)](https://github.com/dmnsgn/ressort/blob/main/LICENSE.md)

Damped springs solved exactly: frame rate independent steppers for numbers, vectors and quaternions, and springs as easing functions.

_Ressort_ is French for spring and resilience.

[![paypal](https://img.shields.io/badge/donate-paypal-informational?logo=paypal)](https://paypal.me/dmnsgn)
[![coinbase](https://img.shields.io/badge/donate-coinbase-informational?logo=coinbase)](https://commerce.coinbase.com/checkout/56cbdf28-e323-48d8-9c98-7019e72c97f3)
[![twitter](https://img.shields.io/twitter/follow/dmnsgn?style=social)](https://twitter.com/dmnsgn)
[![bluesky](https://img.shields.io/badge/-blue?logo=bluesky&label=Follow%20%40dmnsgn.me&style=social)](https://bsky.app/profile/dmnsgn.me)

[![ressort screenshot](https://raw.githubusercontent.com/dmnsgn/ressort/main/screenshot.gif)](https://dmnsgn.github.io/ressort/)

## Installation

```bash
npm install ressort
```

## Features

- **Exact steppers**: `advance`, `advanceVec2`, `advanceVec3` and `advanceQuat` give the same motion at any frame rate, for any damping, towards still or moving goals.
- **Springs as easings**: `ease` turns a spring into an ordinary easing function and its settling duration, with an optional initial velocity.
- **Familiar parameters**: physical mass, stiffness and damping (anime.js, Motion), perceptual duration and bounce (SwiftUI), or smooth time (Unity).
- **Smooth damp**: Unity's `SmoothDamp` signature for numbers, vectors and quaternions, with `maxSpeed` and no overshoot.
- **Exponential damping**: `damp` with a half-life, for values without momentum.
- **Shared steps**: one `transition` per spring and `dt`, reused by every value it steps. Vectors and quaternions update in place.

Demos: [overview](https://dmnsgn.github.io/ressort/), [frame rate](https://dmnsgn.github.io/ressort/?id=frame-rate), [easing editor](https://dmnsgn.github.io/ressort/?id=editor) with CSS `linear()` export, [steppers](https://dmnsgn.github.io/ressort/?id=steppers).

## Usage

Camera following a moving subject:

```js
import {
  advanceVec3,
  createTransition,
  fromSmoothTime,
  transition,
} from "ressort";

const config = fromSmoothTime(0.25);
const step = createTransition();
const velocity = [0, 0, 0];

// Every frame
transition(step, config, dt);
advanceVec3(position, subject, velocity, step, subjectVelocity);
```

Bouncy panel released by a fling:

```js
import { advance, createTransition, fromPerceptual, transition } from "ressort";

const config = fromPerceptual({ duration: 0.5, bounce: 0.2 });
const step = createTransition();
const state = { velocity: releaseVelocity };

// Every frame
transition(step, config, dt);
x = advance(x, open ? 1 : 0, state, step);
```

Spring in a timeline:

```js
import { ease, fromPerceptual } from "ressort";

const spring = ease(fromPerceptual({ duration: 0.4, bounce: 0.3 }));
value = from + (to - from) * spring.ease(elapsed / spring.duration);
```

## API

<!-- api-start -->

Auto-generated API content.

<!-- api-end -->

## References

- Holden, D. (2021). _Spring-It-On: the game developer's spring-roll-call_. [theorangeduck.com](https://theorangeduck.com/page/spring-roll-call)
- Juckett, R. (2012). _Damped springs_. [ryanjuckett.com](https://www.ryanjuckett.com/damped-springs/)
- Lowe, T. (2004). _Critically damped ease-in/ease-out smoothing_. Game Programming Gems 4, §1.10. ISBN 978-1584502951. Verifiable through Unity's [Mathf.cs](https://github.com/Unity-Technologies/UnityCsReference/blob/225b0fbdb57cc17d094e8056b71f8314aba56f73/Runtime/Export/Math/Mathf.cs#L276-L307).
- Apple (2023). _Animate with springs_, WWDC23. [developer.apple.com](https://developer.apple.com/videos/play/wwdc2023/10158/)
- Grajeda, K. (2024). _Effortless UI spring animations: a two-parameter approach_. [kvin.me](https://www.kvin.me/posts/effortless-ui-spring-animations)
- Driscoll, R. (2016). _Frame rate independent damping using lerp_. [rorydriscoll.com](https://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/)
- Wikipedia. _Harmonic oscillator: damped harmonic oscillator_. [en.wikipedia.org](https://en.wikipedia.org/wiki/Harmonic_oscillator#Damped_harmonic_oscillator)

## License

MIT. See [license file](https://github.com/dmnsgn/ressort/blob/main/LICENSE.md).
