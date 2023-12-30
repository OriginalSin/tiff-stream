import proj4 from './core.js';
import Proj from "./Proj.js";
import Point from "./Point.js";
import common from "./common/toPoint.js";
import defs from "./defs.js";
import nadgrid from "./nadgrid.js";
import transform from "./transform.js";
import mgrs from "./mgrs/mgrs.js";
import includedProjections from "../projs.js";

proj4.defaultDatum = 'WGS84'; //default datum
proj4.Proj = Proj;
proj4.WGS84 = new proj4.Proj('WGS84');
proj4.Point = Point;
proj4.toPoint = common;
proj4.defs = defs;
proj4.nadgrid = nadgrid;
proj4.transform = transform;
proj4.mgrs = mgrs;
proj4.version = '__VERSION__';
includedProjections(proj4);

export default proj4;
