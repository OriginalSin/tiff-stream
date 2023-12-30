import {HALF_PI} from '../constants/values.js';
import sign from './sign.js';

export default function(x) {
  return (Math.abs(x) < HALF_PI) ? x : (x - (sign(x) * Math.PI));
}
