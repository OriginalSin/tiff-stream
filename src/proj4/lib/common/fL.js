import {HALF_PI} from '../constants/values.js';

export default function(x, L) {
  return 2 * Math.atan(x * Math.exp(L)) - HALF_PI;
}
