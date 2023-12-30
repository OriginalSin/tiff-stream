import { ProjCoordTransGeoKey } from './globals.js';
import EPSG from './epsg.js';

const {CRS, geographicKeysToCopy, Units, ProjectionGeoKey} = EPSG;

const userDefined = 32767;
const tokensOrder = ["+proj", "+lat_0", "+lon_0", "+lat_1", "+lat_ts", "+lon_1", "+lat_2", "+lon_2", "+k_0", "+x_0", "+y_0", "+ellps", "+a", "+b", "+pm", "+towgs84", "+approx"];
const toFixed = (n) => {
	if (isNaN(n))
		return n;
	return parseFloat(parseFloat(n).toFixed(12));
}
/**
 *
 * Fields of this object contains mapping of some "simple" PCS keys to an object where:
 * 1. `p` - Proj4 definitions
 * 1. `u` - If set to 1, units are angular. if 2 -- linear, and 3 -- ratio.
 *
 * Yup, there's an object in an object. Fields of this object are o1, o2 and o3. Latter Fields takes precedence over previous ones. Let me explain.
 *
 * GeoTIFF defines following centers: natural origin, projection center and just center. Natural and projection's centers seems to have no difference at all, even libgeotiff defines them as same. Proj4 doesn't support natural origins, so projection's center should take precedence.
 *
 * And there's "just center" which appears to be as same as the other centers. Though, libgeotiff doesn't support it at all. So, let's assume them to be as same as the other centers and make other centers override them.
 *
 * So the centers hierarchy is following: "just center", natural origin, projection center.
 *
 * @type {Object}
 */
let k = {
	o1: {	// Keys without overrides and "just center" keys
		ProjStdParallel1GeoKey: {
			u: 1,
			p: "lat_1"
		},
		ProjStdParallel2GeoKey: {
			u: 1,
			p: "lat_2"
		},

		ProjCenterLongGeoKey: {
			u: 1,
			p: "lon_0"
		},
		ProjCenterLatGeoKey: {
			u: 1,
			p: "lat_0"
		},
		ProjCenterEastingGeoKey: {
			u: 2,
			p: "x_0"
		},
		ProjCenterNorthingGeoKey: {
			u: 2,
			p: "y_0"
		},
		ProjScaleAtCenterGeoKey: {
			u: 3,
			p: "k_0"
		},
	},

	o2: {	// Natural origin keys
		ProjNatOriginLongGeoKey: {
			u: 1,
			p: "lon_0"
		},
		ProjNatOriginLatGeoKey: {
			u: 1,
			p: "lat_0"
		},
		ProjFalseOriginEastingGeoKey: {
			u: 2,
			p: "x_0"
		},
		ProjFalseOriginNorthingGeoKey: {
			u: 2,
			p: "y_0"
		},
		ProjScaleAtNatOriginGeoKey: {
			u: 3,
			p: "k_0"
		},
	},

	o3: {	// Projection center keys
		ProjFalseOriginLongGeoKey: {
			u: 1,
			p: "lon_0"
		},
		ProjFalseOriginLatGeoKey: {
			u: 1,
			p: "lat_0"
		},
		ProjFalseEastingGeoKey: {
			u: 2,
			p: "x_0"
		},
		ProjFalseNorthingGeoKey: {
			u: 2,
			p: "y_0"
		},
	}
}

// Aliases

k.o2.ProjStdParallelGeoKey = k.o1.ProjStdParallel1GeoKey;
k.o3.ProjOriginLongGeoKey = k.o2.ProjNatOriginLongGeoKey;
k.o3.ProjOriginLatGeoKey = k.o2.ProjNatOriginLatGeoKey;
k.o3.ProjScaleAtOriginGeoKey = k.o2.ProjScaleAtNatOriginGeoKey;
const PCSKeys = k;


/**
 * Some parameters must be overridden or transformed in some way. This function performs all necessary transforms.
 * @param tokens
 */
const override = function override(tokens) {
	let proj = tokens["+proj"], a = tokens["+a"], b = tokens["+b"];

	// Some geokeys should be mapped to different Proj4 parameters than specified in PCSKeys.js
	// For now, only this transform is known. Others might come up later.
	if (proj === "cea") {
		tokens["+lat_ts"] = tokens["+lat_1"];
		delete tokens["+lat_1"];
	}

	// These projections doesn't work with spheres, proj4 requires +approx parameter in this case
	if (a === b && a !== undefined && (proj === "tmerc" || proj === "utm" || proj === "etmerc"))
		tokens["+approx"] = null;
}


export default {
	/**
	 * Converts GeoTIFFs geokeys to Proj4 string
	 * @param geoKeys {GeoKeys} Object where keys are geokeys (named exactly as in GeoTIFF specification) and values are, well, their values.
	 * @return {module:geokeysToProj4.ProjectionParameters} Projection parameters
	 */
	toProj4: function (geoKeys) {
		let proj = "", x = 1, y = 1, errors = {};

		// First, get CRS, both geographic and projected
		if (geoKeys.GeographicTypeGeoKey && geoKeys.ProjectedCSTypeGeoKey)
			errors.bothGCSAndPCSAreSet = true;

		let crsKey = geoKeys.GeographicTypeGeoKey || geoKeys.ProjectedCSTypeGeoKey;
		if (crsKey) {
			let crs = CRS[crsKey.toString()];
			if (crs) {
				if (typeof crs === "string")
					proj = crs;
				else {
					proj = crs.p;
					x = crs.x;
					y = crs.y;
				}
			} else if (crsKey !== userDefined)
				errors.CRSNotSupported = crsKey;
		}

		if (proj === "")
			proj = "+proj=longlat"; // If GeoTIFF uses PCS, string rebuilding will override +proj

		/////////////////////////
		//         GCS         //
		/////////////////////////

		for (let name in geographicKeysToCopy) {
			let value = geoKeys[name];
			if (value) {
				let keyValue = geographicKeysToCopy[name][value.toString()];
				if (keyValue !== undefined)
					proj += " " + keyValue;
			}
		}

		// All other geokeys will override ones provided by keys above

		// Read GCS units
		let units = {
			GeogLinearUnitsGeoKey: 1,
			GeogAngularUnitsGeoKey: 1,
			ProjLinearUnitsGeoKey: 1,
		}

		let unitDefs = {}; // Values are booleans, true means that GeoTIFF redefines units

		for (let name in units) {
			let m, key = geoKeys[name];

			if (!key)
				continue;

			if (key === userDefined) {
				let splitAt = name.length - 7, // I.e., "GeogLinearUnitsGeoKey" will be split to "GeogLinearUnit" and "sGeoKey"
					sizeKeyName = name.substr(0, splitAt) + "SizeGeoKey",
					size = geoKeys[sizeKeyName];
				if (size)
					m = size;
				else
					errors[sizeKeyName + "NotDefined"] = true;
			} else if (key)
				m = Units[key.toString()]?.m;

			if (!m) {
				m = 1;
				errors[name + "NotSupported"] = key; // This EPSG key doesn't exist, assuming meters or degrees
			} else {
				unitDefs[name] = true;
				if (name === "GeogAngularUnitsGeoKey")
					m *= 180 / Math.PI; // Radians are angular base units
			}
			units[name] = m;
		}

		// Get axes
		let axes = {
			GeogSemiMajorAxisGeoKey: null,
			GeogSemiMinorAxisGeoKey: null,
		}

		for (let axis in axes) {
			let key = geoKeys[axis];
			if (key)
				axes[axis] = key * units.GeogLinearUnitsGeoKey;
		}

		if (geoKeys.GeogInvFlatteningGeoKey && axes.GeogSemiMajorAxisGeoKey) // Can't calculate semi minor axis if semi major axis is missing
			axes.GeogSemiMinorAxisGeoKey = axes.GeogSemiMajorAxisGeoKey - axes.GeogSemiMajorAxisGeoKey / geoKeys.GeogInvFlatteningGeoKey;

		if (axes.GeogSemiMajorAxisGeoKey)
			proj += " +a=" + axes.GeogSemiMajorAxisGeoKey;

		let b;
		if (axes.GeogSemiMinorAxisGeoKey)
			b = axes.GeogSemiMinorAxisGeoKey;
		else if (proj.indexOf("+b") === -1)
			b = axes.GeogSemiMajorAxisGeoKey;

		if (b)
			proj += " +b=" + b;

		// Get prime meridian
		let pm = geoKeys.GeogPrimeMeridianLongGeoKey;
		if (pm)
			proj += " +pm=" + (pm * units.GeogAngularUnitsGeoKey);

		// To WGS key
		if (geoKeys.GeogTOWGS84GeoKey)
			proj += " +towgs84=" + geoKeys.GeogTOWGS84GeoKey.join();

		/////////////////////////
		//         PCS         //
		/////////////////////////

		// We've already got CRS, let's jump straight to the other keys

		// This key despite its name defines conversion -- a method (and its parameters) which converts coordinates. The basic example of it is a projection.
		if (geoKeys.ProjectionGeoKey && geoKeys.ProjectionGeoKey !== userDefined) {
			let conversion = ProjectionGeoKey[geoKeys.ProjectionGeoKey.toString()];
			if (conversion)
				proj += " +proj=" + conversion;
			else
				errors.conversionNotSupported = geoKeys.ProjectionGeoKey;
		}

		let objects = ["o1", "o2", "o3"];
		for (let name of objects) {
			let object = PCSKeys[name];
			for (let key in object) {
				if (!object.hasOwnProperty(key))
					continue;

				let keyValue = geoKeys[key];
				if (keyValue === undefined)
					continue;

				// Get key definition and units
				let keyDef = object[key], m;
				if (keyDef.u === 1)
					m = units.GeogAngularUnitsGeoKey;
				else if (keyDef.u === 2)
					m = units.ProjLinearUnitsGeoKey;
				else
					m = 1;

				keyValue *= m;
				proj += ` +${keyDef.p}=${keyValue}`;
			}
		}

		// This key should take precedence over all other keys
		if (geoKeys.ProjCoordTransGeoKey && geoKeys.ProjCoordTransGeoKey !== userDefined) {
			let projName = ProjCoordTransGeoKey[geoKeys.ProjCoordTransGeoKey.toString()];
			if (projName)
				proj += " +proj=" + projName;
			else
				errors.coordinateTransformationNotSupported = geoKeys.ProjCoordTransGeoKey;
		}

		// Gosh, everybody seems to suggest to add +no_defs to avoid errors caused by default values. Let's follow this suggestion.
		proj += " +no_defs";

		/////////////////////////
		//  String processing  //
		/////////////////////////

		// Tokenize string

		let keyValues = proj.split(" ");
		let tokens = {};
		for (let kv of keyValues) {
			let kvArr = kv.trim().split("=");
			if (kvArr.length === 1)
				tokens[kvArr[0]] = null;
			else
				tokens[kvArr[0].trim()] = kvArr[1].trim();
		}

		override(tokens); // Apply all necessary overrides

		// Build final string

		proj = "";
		let tokenArrays = [tokensOrder, Object.keys(tokens)];
		let processedTokens = {};

		for (let arr of tokenArrays) {
			for (let token of arr) {
				if (!(token in tokens) || processedTokens[token])
					continue;

				proj += token;
				let tokenValue = tokens[token];
				if (tokenValue !== null)
					proj += "=" + toFixed(tokenValue);

				proj += " ";
				processedTokens[token] = true;
			}
		}

		// Find out which units to use

		let isGCS = (tokens["+proj"] === "longlat"), coordUnits;
		if (isGCS) {
			coordUnits = "degree";
			if (unitDefs.GeogAngularUnitsGeoKey) {
				x = units.GeogAngularUnitsGeoKey;
				y = units.GeogAngularUnitsGeoKey;
			}
		} else {
			coordUnits = "metre";
			if (unitDefs.ProjLinearUnitsGeoKey) {
				let m;
				if (typeof units.ProjLinearUnitsGeoKey === "number")
					m = units.ProjLinearUnitsGeoKey;
				else {
					m = units.ProjLinearUnitsGeoKey.m;
					coordUnits = units.ProjLinearUnitsGeoKey.t;
				}
				x = m;
				y = m;
			}
		}

		x = toFixed(x);
		y = toFixed(y);

		return {
			projName: tokens["+proj"],
			proj4: proj,
			coordinatesConversionParameters: {
				x: x,
				y: y,
			},
			shouldConvertCoordinates: (x !== 1 || y !== 1),
			coordinatesUnits: coordUnits,
			isGCS: isGCS,
			errors: errors,
		}

	},

	/**
	 * Converts given coordinates to standard ones (i.e. meters or degrees).
	 *
	 * Basically, a short way to multiply x and y by `parameters.x` and `parameters.y` respectively.
	 *
	 * It does NOT accept image coordinates! Convert image coordinates to projection coordinates first (by multiplying image coordinates by `image.getResolution()` and adding coordinates of a top left corner) and then pass converted coordinates to this function.
	 *
	 * @param x {number} X coordinate
	 * @param y {number} Y coordinate
	 * @param parameters {Object} getProjectionParameters().coordinatesConversionParameters
	 * @return {module:geokeysToProj4.Point} Converted coordinates
	 */
	convertCoordinates: function (x, y, parameters) {
		return {
			x: x * parameters.x,
			y: y * parameters.y,
		}
	}
}
