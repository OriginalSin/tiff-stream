import tmerc from "./projections/tmerc.js";
import utm from "./projections/utm.js";
import sterea from "./projections/sterea.js";
import stere from "./projections/stere.js";
import somerc from "./projections/somerc.js";
import omerc from "./projections/omerc.js";
import lcc from "./projections/lcc.js";
import krovak from "./projections/krovak.js";
import cass from "./projections/cass.js";
import laea from "./projections/laea.js";
import aea from "./projections/aea.js";
import gnom from "./projections/gnom.js";
import cea from "./projections/cea.js";
import eqc from "./projections/eqc.js";
import poly from "./projections/poly.js";
import nzmg from "./projections/nzmg.js";
import mill from "./projections/mill.js";
import sinu from "./projections/sinu.js";
import moll from "./projections/moll.js";
import eqdc from "./projections/eqdc.js";
import vandg from "./projections/vandg.js";
import aegd from "./projections/aeqd.js";
import etmerc from './projections/etmerc.js';
import qsc from './projections/qsc.js';
import robin from './projections/robin.js';
import geocent from './projections/geocent.js';
import tpers from './projections/tpers.js';
import geos from './projections/geos.js';

var projs = [
  tmerc,
  utm,
  sterea,
  stere,
  somerc,
  omerc,
  lcc,
  krovak,
  cass,
  laea,
  aea,
  gnom,
  cea,
  eqc,
  poly,
  nzmg,
  mill,
  sinu,
  moll,
  eqdc,
  vandg,
  aegd,
  etmerc,
  qsc,
  robin,
  geocent,
  tpers,
  geos,
];

export default function (proj4) {
  projs.forEach(function (proj) {
    proj4.Proj.projections.add(proj);
  });
}