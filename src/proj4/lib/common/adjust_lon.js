
import {TWO_PI, SPI} from '../constants/values.js';
import sign from './sign.js';

export default function(x) {
  return (Math.abs(x) <= SPI) ? x : (x - (sign(x) * TWO_PI));
}
