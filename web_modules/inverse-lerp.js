/** @module inverseLerp */
/**
* Get a value's interpolant within a linear range, effectively remapping a value v within [a, b] to [0, 1].
*
* @alias module:inverseLerp
* @param {number} a Start
* @param {number} b End
* @param {number} v Value
* @returns {number}
*/
const inverseLerp = (a, b, v) => (v - a) / (b - a);

export { inverseLerp as default };