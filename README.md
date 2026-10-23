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

## Functions

<dl>
<dt><a href="#advance">advance(current, goal, state, step, [goalVelocity])</a> ⇒ <code>number</code></dt>
<dd><p>Steps a value towards <code>goal</code> with a spring.</p>
</dd>
<dt><a href="#advanceVec2">advanceVec2(current, goal, velocity, step, [goalVelocity])</a> ⇒ <code>module:pex-math~Vec2</code></dt>
<dd><p>2D vector <code>advance</code>.</p>
</dd>
<dt><a href="#advanceVec3">advanceVec3(current, goal, velocity, step, [goalVelocity])</a> ⇒ <code>module:pex-math~Vec3</code></dt>
<dd><p>Vector <code>advance</code>.</p>
</dd>
<dt><a href="#advanceQuat">advanceQuat(current, goal, angularVelocity, step)</a> ⇒ <code>number</code></dt>
<dd><p>Quaternion <code>advance</code>: springs the scaled angle-axis rotation from <code>goal</code> to
<code>current</code>.</p>
</dd>
<dt><a href="#fromPhysical">fromPhysical(options)</a> ⇒ <code><a href="#SpringConfig">SpringConfig</a></code></dt>
<dd><p>Spring from mass, stiffness and damping.</p>
</dd>
<dt><a href="#toPhysical">toPhysical(config, [mass])</a> ⇒ <code><a href="#PhysicalSpring">PhysicalSpring</a></code></dt>
<dd><p>Mass, stiffness and damping of a spring.</p>
</dd>
<dt><a href="#fromPerceptual">fromPerceptual(options)</a> ⇒ <code><a href="#SpringConfig">SpringConfig</a></code></dt>
<dd><p>Spring from Apple&#39;s perceptual duration and bounce, as in SwiftUI.</p>
</dd>
<dt><a href="#toPerceptual">toPerceptual(config)</a> ⇒ <code><a href="#PerceptualSpring">PerceptualSpring</a></code></dt>
<dd><p>Perceptual duration and bounce of a spring.</p>
</dd>
<dt><a href="#fromSmoothTime">fromSmoothTime(smoothTime)</a> ⇒ <code><a href="#SpringConfig">SpringConfig</a></code></dt>
<dd><p>Critically damped spring from Lowe&#39;s and Unity&#39;s smooth time.</p>
<p>From rest, it covers 59% of the distance in <code>smoothTime</code> and 95% in 2.37 ×
<code>smoothTime</code>.</p>
</dd>
<dt><a href="#halfLifeDecay">halfLifeDecay(halfLife, dt)</a> ⇒ <code>number</code></dt>
<dd><p>Fraction of the distance left after <code>dt</code> with exponential damping.</p>
</dd>
<dt><a href="#damp">damp(current, target, halfLife, dt)</a> ⇒ <code>number</code></dt>
<dd><p>Exponential damping towards <code>target</code>: no velocity, no overshoot.</p>
</dd>
<dt><a href="#settlingTime">settlingTime(config, [velocity], [restThreshold])</a> ⇒ <code>number</code></dt>
<dd><p>Time after which the displacement stays under <code>restThreshold</code>, starting from
displacement 1.</p>
</dd>
<dt><a href="#ease">ease(config, [options])</a> ⇒ <code><a href="#SpringEase">SpringEase</a></code></dt>
<dd><p>Spring from 0 to 1 as an easing function over its settling time.</p>
</dd>
<dt><a href="#smoothDamp">smoothDamp(current, target, state, smoothTime, dt, [maxSpeed])</a> ⇒ <code>number</code></dt>
<dd><p>Critically damped spring towards <code>target</code> that never overshoots it, with
Unity&#39;s signature.</p>
</dd>
<dt><a href="#smoothDampVec2">smoothDampVec2(current, target, velocity, smoothTime, dt, [maxSpeed])</a> ⇒ <code>module:pex-math~Vec2</code></dt>
<dd><p>2D vector <code>smoothDamp</code>: <code>maxSpeed</code> limits the magnitude of the velocity.</p>
</dd>
<dt><a href="#smoothDampVec3">smoothDampVec3(current, target, velocity, smoothTime, dt, [maxSpeed])</a> ⇒ <code>module:pex-math~Vec3</code></dt>
<dd><p>Vector <code>smoothDamp</code>: <code>maxSpeed</code> limits the magnitude of the velocity.</p>
</dd>
<dt><a href="#smoothDampQuat">smoothDampQuat(current, target, angularVelocity, smoothTime, dt, [maxSpeed])</a> ⇒ <code>number</code></dt>
<dd><p>Quaternion <code>smoothDamp</code>: damps the scaled angle-axis rotation from <code>target</code>
to <code>current</code>.</p>
</dd>
<dt><a href="#createTransition">createTransition()</a> ⇒ <code><a href="#SpringTransition">SpringTransition</a></code></dt>
<dd><p>Identity transition, to be filled by <code>transition</code>.</p>
</dd>
<dt><a href="#transition">transition(out, config, dt)</a> ⇒ <code><a href="#SpringTransition">SpringTransition</a></code></dt>
<dd><p>Exact transition of a spring over <code>dt</code>, for any damping ratio.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#SpringConfig">SpringConfig</a> : <code>object</code></dt>
<dd><p>Normalized spring: every parametrisation converts to it.</p>
</dd>
<dt><a href="#PhysicalSpring">PhysicalSpring</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#PerceptualSpring">PerceptualSpring</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#SpringTransition">SpringTransition</a> : <code>object</code></dt>
<dd><p>Exact map from displacement and velocity to their values <code>dt</code> later:</p>
<ul>
<li><code>e₁ = pp·e₀ + pv·v₀</code></li>
<li><code>v₁ = vp·e₀ + vv·v₀</code></li>
</ul>
<p>Shared by every value stepped with the same config and <code>dt</code>.</p>
</dd>
<dt><a href="#SpringState">SpringState</a> : <code>object</code></dt>
<dd><p>Velocity carried between scalar steps.</p>
</dd>
<dt><a href="#SpringEaseOptions">SpringEaseOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#SpringEase">SpringEase</a> : <code>object</code></dt>
<dd><p>Spring as an easing function over its settling time.</p>
</dd>
</dl>

<a name="advance"></a>

## advance(current, goal, state, step, [goalVelocity]) ⇒ <code>number</code>

Steps a value towards `goal` with a spring.

**Kind**: global function
**Returns**: <code>number</code> - The new value.
**See**: https://theorangeduck.com/page/spring-roll-call#springdamper

| Param          | Type                                               | Default        | Description                                                                              |
| -------------- | -------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| current        | <code>number</code>                                |                |                                                                                          |
| goal           | <code>number</code>                                |                | Goal at the start of the step. The caller advances a moving goal by `goalVelocity * dt`. |
| state          | [<code>SpringState</code>](#SpringState)           |                | Updated in place.                                                                        |
| step           | [<code>SpringTransition</code>](#SpringTransition) |                |                                                                                          |
| [goalVelocity] | <code>number</code>                                | <code>0</code> | Goal velocity over the step.                                                             |

<a name="advanceVec2"></a>

## advanceVec2(current, goal, velocity, step, [goalVelocity]) ⇒ <code>module:pex-math~Vec2</code>

2D vector `advance`.

**Kind**: global function
**Returns**: <code>module:pex-math~Vec2</code> - `current`.

| Param          | Type                                               | Default             | Description                    |
| -------------- | -------------------------------------------------- | ------------------- | ------------------------------ |
| current        | <code>module:pex-math~Vec2</code>                  |                     | Updated in place.              |
| goal           | <code>module:pex-math~Vec2</code>                  |                     | Goal at the start of the step. |
| velocity       | <code>module:pex-math~Vec2</code>                  |                     | Updated in place.              |
| step           | [<code>SpringTransition</code>](#SpringTransition) |                     |                                |
| [goalVelocity] | <code>module:pex-math~Vec2</code>                  | <code>[0, 0]</code> |                                |

<a name="advanceVec3"></a>

## advanceVec3(current, goal, velocity, step, [goalVelocity]) ⇒ <code>module:pex-math~Vec3</code>

Vector `advance`.

**Kind**: global function
**Returns**: <code>module:pex-math~Vec3</code> - `current`.

| Param          | Type                                               | Default                | Description                    |
| -------------- | -------------------------------------------------- | ---------------------- | ------------------------------ |
| current        | <code>module:pex-math~Vec3</code>                  |                        | Updated in place.              |
| goal           | <code>module:pex-math~Vec3</code>                  |                        | Goal at the start of the step. |
| velocity       | <code>module:pex-math~Vec3</code>                  |                        | Updated in place.              |
| step           | [<code>SpringTransition</code>](#SpringTransition) |                        |                                |
| [goalVelocity] | <code>module:pex-math~Vec3</code>                  | <code>[0, 0, 0]</code> |                                |

<a name="advanceQuat"></a>

## advanceQuat(current, goal, angularVelocity, step) ⇒ <code>number</code>

Quaternion `advance`: springs the scaled angle-axis rotation from `goal` to
`current`.

**Kind**: global function
**Returns**: <code>number</code> - The remaining angle in radians.
**See**: https://theorangeduck.com/page/spring-roll-call#quaternionspring

| Param           | Type                                               | Description                                          |
| --------------- | -------------------------------------------------- | ---------------------------------------------------- |
| current         | <code>module:pex-math~Quat</code>                  | Updated in place.                                    |
| goal            | <code>module:pex-math~Quat</code>                  |                                                      |
| angularVelocity | <code>module:pex-math~Vec3</code>                  | Scaled axis in radians per second, updated in place. |
| step            | [<code>SpringTransition</code>](#SpringTransition) |                                                      |

<a name="fromPhysical"></a>

## fromPhysical(options) ⇒ [<code>SpringConfig</code>](#SpringConfig)

Spring from mass, stiffness and damping.

**Kind**: global function
**See**: https://en.wikipedia.org/wiki/Harmonic_oscillator#Damped_harmonic_oscillator

| Param             | Type                | Default        | Description     |
| ----------------- | ------------------- | -------------- | --------------- |
| options           | <code>object</code> |                |                 |
| [options.mass]    | <code>number</code> | <code>1</code> |                 |
| options.stiffness | <code>number</code> |                | Greater than 0. |
| options.damping   | <code>number</code> |                |                 |

<a name="toPhysical"></a>

## toPhysical(config, [mass]) ⇒ [<code>PhysicalSpring</code>](#PhysicalSpring)

Mass, stiffness and damping of a spring.

**Kind**: global function

| Param  | Type                                       | Default        |
| ------ | ------------------------------------------ | -------------- |
| config | [<code>SpringConfig</code>](#SpringConfig) |                |
| [mass] | <code>number</code>                        | <code>1</code> |

<a name="fromPerceptual"></a>

## fromPerceptual(options) ⇒ [<code>SpringConfig</code>](#SpringConfig)

Spring from Apple's perceptual duration and bounce, as in SwiftUI.

**Kind**: global function
**See**

- https://developer.apple.com/videos/play/wwdc2023/10158/
- https://www.kvin.me/posts/effortless-ui-spring-animations

| Param            | Type                | Default        | Description                                         |
| ---------------- | ------------------- | -------------- | --------------------------------------------------- |
| options          | <code>object</code> |                |                                                     |
| options.duration | <code>number</code> |                | Period of the undamped spring in seconds.           |
| [options.bounce] | <code>number</code> | <code>0</code> | In (−1, 1]: 0 is critical, > 0 bounces, < 0 creeps. |

<a name="toPerceptual"></a>

## toPerceptual(config) ⇒ [<code>PerceptualSpring</code>](#PerceptualSpring)

Perceptual duration and bounce of a spring.

**Kind**: global function

| Param  | Type                                       |
| ------ | ------------------------------------------ |
| config | [<code>SpringConfig</code>](#SpringConfig) |

<a name="fromSmoothTime"></a>

## fromSmoothTime(smoothTime) ⇒ [<code>SpringConfig</code>](#SpringConfig)

Critically damped spring from Lowe's and Unity's smooth time.

From rest, it covers 59% of the distance in `smoothTime` and 95% in 2.37 ×
`smoothTime`.

**Kind**: global function
**See**: Lowe, T. (2004). Critically damped ease-in/ease-out smoothing. Game Programming Gems 4, §1.10. ISBN 978-1584502951.

| Param      | Type                | Description |
| ---------- | ------------------- | ----------- |
| smoothTime | <code>number</code> | In seconds. |

<a name="halfLifeDecay"></a>

## halfLifeDecay(halfLife, dt) ⇒ <code>number</code>

Fraction of the distance left after `dt` with exponential damping.

**Kind**: global function
**See**: https://theorangeduck.com/page/spring-roll-call#exactdamper

| Param    | Type                | Description                                                                      |
| -------- | ------------------- | -------------------------------------------------------------------------------- |
| halfLife | <code>number</code> | Time to cover half the remaining distance, in seconds. 0 or less leaves nothing. |
| dt       | <code>number</code> | In seconds. 0 or less leaves everything, whatever the half-life.                 |

<a name="damp"></a>

## damp(current, target, halfLife, dt) ⇒ <code>number</code>

Exponential damping towards `target`: no velocity, no overshoot.

**Kind**: global function
**Returns**: <code>number</code> - The new value.
**See**

- https://theorangeduck.com/page/spring-roll-call#exactdamper
- https://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/

| Param    | Type                | Description                                            |
| -------- | ------------------- | ------------------------------------------------------ |
| current  | <code>number</code> |                                                        |
| target   | <code>number</code> |                                                        |
| halfLife | <code>number</code> | Time to cover half the remaining distance, in seconds. |
| dt       | <code>number</code> | In seconds.                                            |

<a name="settlingTime"></a>

## settlingTime(config, [velocity], [restThreshold]) ⇒ <code>number</code>

Time after which the displacement stays under `restThreshold`, starting from
displacement 1.

**Kind**: global function
**Returns**: <code>number</code> - In seconds. Infinity when the spring never settles.

| Param           | Type                                       | Default           | Description                                                 |
| --------------- | ------------------------------------------ | ----------------- | ----------------------------------------------------------- |
| config          | [<code>SpringConfig</code>](#SpringConfig) |                   |                                                             |
| [velocity]      | <code>number</code>                        | <code>0</code>    | Initial velocity towards the goal, in distances per second. |
| [restThreshold] | <code>number</code>                        | <code>1e-3</code> | Relative to the distance.                                   |

<a name="ease"></a>

## ease(config, [options]) ⇒ [<code>SpringEase</code>](#SpringEase)

Spring from 0 to 1 as an easing function over its settling time.

**Kind**: global function
**Throws**:

- <code>RangeError</code> When the spring never settles: see `settlingTime`.

| Param     | Type                                                 |
| --------- | ---------------------------------------------------- |
| config    | [<code>SpringConfig</code>](#SpringConfig)           |
| [options] | [<code>SpringEaseOptions</code>](#SpringEaseOptions) |

<a name="smoothDamp"></a>

## smoothDamp(current, target, state, smoothTime, dt, [maxSpeed]) ⇒ <code>number</code>

Critically damped spring towards `target` that never overshoots it, with
Unity's signature.

**Kind**: global function
**Returns**: <code>number</code> - The new value.
**See**

- Lowe, T. (2004). Critically damped ease-in/ease-out smoothing. Game Programming Gems 4, §1.10. ISBN 978-1584502951.
- https://github.com/Unity-Technologies/UnityCsReference/blob/225b0fbdb57cc17d094e8056b71f8314aba56f73/Runtime/Export/Math/Mathf.cs#L276-L307
- https://theorangeduck.com/page/spring-roll-call#critical

| Param      | Type                                     | Default               | Description                       |
| ---------- | ---------------------------------------- | --------------------- | --------------------------------- |
| current    | <code>number</code>                      |                       |                                   |
| target     | <code>number</code>                      |                       |                                   |
| state      | [<code>SpringState</code>](#SpringState) |                       | Updated in place.                 |
| smoothTime | <code>number</code>                      |                       | In seconds. See `fromSmoothTime`. |
| dt         | <code>number</code>                      |                       | In seconds.                       |
| [maxSpeed] | <code>number</code>                      | <code>Infinity</code> | In units per second.              |

<a name="smoothDampVec2"></a>

## smoothDampVec2(current, target, velocity, smoothTime, dt, [maxSpeed]) ⇒ <code>module:pex-math~Vec2</code>

2D vector `smoothDamp`: `maxSpeed` limits the magnitude of the velocity.

**Kind**: global function
**Returns**: <code>module:pex-math~Vec2</code> - `current`.
**See**: https://github.com/Unity-Technologies/UnityCsReference/blob/225b0fbdb57cc17d094e8056b71f8314aba56f73/Runtime/Export/Math/Vector2.cs#L447-L502

| Param      | Type                              | Default               | Description                       |
| ---------- | --------------------------------- | --------------------- | --------------------------------- |
| current    | <code>module:pex-math~Vec2</code> |                       | Updated in place.                 |
| target     | <code>module:pex-math~Vec2</code> |                       |                                   |
| velocity   | <code>module:pex-math~Vec2</code> |                       | Updated in place.                 |
| smoothTime | <code>number</code>               |                       | In seconds. See `fromSmoothTime`. |
| dt         | <code>number</code>               |                       | In seconds.                       |
| [maxSpeed] | <code>number</code>               | <code>Infinity</code> | In units per second.              |

<a name="smoothDampVec3"></a>

## smoothDampVec3(current, target, velocity, smoothTime, dt, [maxSpeed]) ⇒ <code>module:pex-math~Vec3</code>

Vector `smoothDamp`: `maxSpeed` limits the magnitude of the velocity.

**Kind**: global function
**Returns**: <code>module:pex-math~Vec3</code> - `current`.
**See**: https://github.com/Unity-Technologies/UnityCsReference/blob/225b0fbdb57cc17d094e8056b71f8314aba56f73/Runtime/Export/Math/Vector3.cs#L231-L301

| Param      | Type                              | Default               | Description                       |
| ---------- | --------------------------------- | --------------------- | --------------------------------- |
| current    | <code>module:pex-math~Vec3</code> |                       | Updated in place.                 |
| target     | <code>module:pex-math~Vec3</code> |                       |                                   |
| velocity   | <code>module:pex-math~Vec3</code> |                       | Updated in place.                 |
| smoothTime | <code>number</code>               |                       | In seconds. See `fromSmoothTime`. |
| dt         | <code>number</code>               |                       | In seconds.                       |
| [maxSpeed] | <code>number</code>               | <code>Infinity</code> | In units per second.              |

<a name="smoothDampQuat"></a>

## smoothDampQuat(current, target, angularVelocity, smoothTime, dt, [maxSpeed]) ⇒ <code>number</code>

Quaternion `smoothDamp`: damps the scaled angle-axis rotation from `target`
to `current`.

**Kind**: global function
**Returns**: <code>number</code> - The remaining angle in radians.
**See**: https://theorangeduck.com/page/spring-roll-call#quaternionspring

| Param           | Type                              | Default               | Description                                          |
| --------------- | --------------------------------- | --------------------- | ---------------------------------------------------- |
| current         | <code>module:pex-math~Quat</code> |                       | Updated in place.                                    |
| target          | <code>module:pex-math~Quat</code> |                       |                                                      |
| angularVelocity | <code>module:pex-math~Vec3</code> |                       | Scaled axis in radians per second, updated in place. |
| smoothTime      | <code>number</code>               |                       | In seconds. See `fromSmoothTime`.                    |
| dt              | <code>number</code>               |                       | In seconds.                                          |
| [maxSpeed]      | <code>number</code>               | <code>Infinity</code> | In radians per second.                               |

<a name="createTransition"></a>

## createTransition() ⇒ [<code>SpringTransition</code>](#SpringTransition)

Identity transition, to be filled by `transition`.

**Kind**: global function
<a name="transition"></a>

## transition(out, config, dt) ⇒ [<code>SpringTransition</code>](#SpringTransition)

Exact transition of a spring over `dt`, for any damping ratio.

**Kind**: global function
**See**: https://www.ryanjuckett.com/damped-springs/

| Param  | Type                                               | Description                                            |
| ------ | -------------------------------------------------- | ------------------------------------------------------ |
| out    | [<code>SpringTransition</code>](#SpringTransition) |                                                        |
| config | [<code>SpringConfig</code>](#SpringConfig)         |                                                        |
| dt     | <code>number</code>                                | Step in seconds. 0 or less leaves the state unchanged. |

<a name="SpringConfig"></a>

## SpringConfig : <code>object</code>

Normalized spring: every parametrisation converts to it.

**Kind**: global typedef
**Properties**

| Name  | Type                | Description                                              |
| ----- | ------------------- | -------------------------------------------------------- |
| omega | <code>number</code> | Natural frequency ω in radians per second.               |
| zeta  | <code>number</code> | Damping ratio ζ: < 1 bounces, 1 is critical, > 1 creeps. |

<a name="PhysicalSpring"></a>

## PhysicalSpring : <code>object</code>

**Kind**: global typedef
**Properties**

| Name      | Type                | Description                                                                                 |
| --------- | ------------------- | ------------------------------------------------------------------------------------------- |
| mass      | <code>number</code> |                                                                                             |
| stiffness | <code>number</code> | Force per unit of displacement. Greater than 0: without it, nothing pulls towards the goal. |
| damping   | <code>number</code> | Force per unit of velocity.                                                                 |

<a name="PerceptualSpring"></a>

## PerceptualSpring : <code>object</code>

**Kind**: global typedef
**Properties**

| Name     | Type                | Description                                         |
| -------- | ------------------- | --------------------------------------------------- |
| duration | <code>number</code> | Period of the undamped spring in seconds.           |
| bounce   | <code>number</code> | In (−1, 1]: 0 is critical, > 0 bounces, < 0 creeps. |

<a name="SpringTransition"></a>

## SpringTransition : <code>object</code>

Exact map from displacement and velocity to their values `dt` later:

- `e₁ = pp·e₀ + pv·v₀`
- `v₁ = vp·e₀ + vv·v₀`

Shared by every value stepped with the same config and `dt`.

**Kind**: global typedef
**Properties**

| Name | Type                | Description      |
| ---- | ------------------- | ---------------- |
| dt   | <code>number</code> | Step in seconds. |
| pp   | <code>number</code> |                  |
| pv   | <code>number</code> |                  |
| vp   | <code>number</code> |                  |
| vv   | <code>number</code> |                  |

<a name="SpringState"></a>

## SpringState : <code>object</code>

Velocity carried between scalar steps.

**Kind**: global typedef
**Properties**

| Name     | Type                | Description          |
| -------- | ------------------- | -------------------- |
| velocity | <code>number</code> | In units per second. |

<a name="SpringEaseOptions"></a>

## SpringEaseOptions : <code>object</code>

**Kind**: global typedef
**Properties**

| Name            | Type                | Default           | Description                                                                       |
| --------------- | ------------------- | ----------------- | --------------------------------------------------------------------------------- |
| [velocity]      | <code>number</code> | <code>0</code>    | Initial velocity towards the goal, in distances per second.                       |
| [restThreshold] | <code>number</code> | <code>1e-3</code> | Displacement, relative to the distance, under which the spring counts as settled. |

<a name="SpringEase"></a>

## SpringEase : <code>object</code>

Spring as an easing function over its settling time.

**Kind**: global typedef
**Properties**

| Name     | Type                  | Description                                                          |
| -------- | --------------------- | -------------------------------------------------------------------- |
| ease     | <code>function</code> | Progress from 0 to 1 at normalized time `t`. Exactly 1 from `t = 1`. |
| duration | <code>number</code>   | Settling time in seconds.                                            |

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
