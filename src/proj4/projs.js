import tmerc from './lib/projections/tmerc.js';
import etmerc from './lib/projections/etmerc.js';
import utm from './lib/projections/utm.js';
import sterea from './lib/projections/sterea.js';
import stere from './lib/projections/stere.js';
import somerc from './lib/projections/somerc.js';
import omerc from './lib/projections/omerc.js';
import lcc from './lib/projections/lcc.js';
import krovak from './lib/projections/krovak.js';
import cass from './lib/projections/cass.js';
import laea from './lib/projections/laea.js';
import aea from './lib/projections/aea.js';
import gnom from './lib/projections/gnom.js';
import cea from './lib/projections/cea.js';
import eqc from './lib/projections/eqc.js';
import poly from './lib/projections/poly.js';
import nzmg from './lib/projections/nzmg.js';
import mill from './lib/projections/mill.js';
import sinu from './lib/projections/sinu.js';
import moll from './lib/projections/moll.js';
import eqdc from './lib/projections/eqdc.js';
import vandg from './lib/projections/vandg.js';
import aeqd from './lib/projections/aeqd.js';
import ortho from './lib/projections/ortho.js';
import qsc from './lib/projections/qsc.js';
import robin from './lib/projections/robin.js';
import geocent from './lib/projections/geocent.js';
import tpers from './lib/projections/tpers.js';
import geos from './lib/projections/geos.js';
export default function(proj4){
  proj4.Proj.projections.add(tmerc);
  proj4.Proj.projections.add(etmerc);
  proj4.Proj.projections.add(utm);
  proj4.Proj.projections.add(sterea);
  proj4.Proj.projections.add(stere);
  proj4.Proj.projections.add(somerc);
  proj4.Proj.projections.add(omerc);
  proj4.Proj.projections.add(lcc);
  proj4.Proj.projections.add(krovak);
  proj4.Proj.projections.add(cass);
  proj4.Proj.projections.add(laea);
  proj4.Proj.projections.add(aea);
  proj4.Proj.projections.add(gnom);
  proj4.Proj.projections.add(cea);
  proj4.Proj.projections.add(eqc);
  proj4.Proj.projections.add(poly);
  proj4.Proj.projections.add(nzmg);
  proj4.Proj.projections.add(mill);
  proj4.Proj.projections.add(sinu);
  proj4.Proj.projections.add(moll);
  proj4.Proj.projections.add(eqdc);
  proj4.Proj.projections.add(vandg);
  proj4.Proj.projections.add(aeqd);
  proj4.Proj.projections.add(ortho);
  proj4.Proj.projections.add(qsc);
  proj4.Proj.projections.add(robin);
  proj4.Proj.projections.add(geocent);
  proj4.Proj.projections.add(tpers);
  proj4.Proj.projections.add(geos);
}