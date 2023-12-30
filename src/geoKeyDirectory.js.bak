import proj4 from 'proj4';
import * as geokeysToProj4 from "geotiff-geokeys-to-proj4";
import { geoKeyNames, fieldTagNames } from './globals.js';
// import { fieldTypes, fieldTagNames, arrayFields, geoKeyNames, geoKeys, CompressionTypes } from './globals.js';

export default function parseGeoKeyDirectory(tags) {
	const rawKeys = tags.GeoKeyDirectory;
	if (!rawKeys) {
		return null;
	}

	const geoKeyDirectory = {};
	for (let i = 4; i <= rawKeys[3] * 4; i += 4) {
		const key = geoKeyNames[rawKeys[i]];
		const location = rawKeys[i + 1] ? (fieldTagNames[rawKeys[i + 1]]) : null;
		const count = rawKeys[i + 2];
		const offset = rawKeys[i + 3];

		let value = offset;
		if (location) {
			value = tags[location];
			const tVal = typeof(value);
			if (tVal === 'undefined' || value === null) {
				throw new Error(`Could not get value of geoKey '${key}'.`);
			} else if (tVal === 'string') {
				value = value.substring(offset, offset + count - 1);
			} else if (value.subarray) {
				value = count === 1 ? value[0] : value.subarray(offset, offset + count);
			}
		}
		geoKeyDirectory[key] = value;
	}
	const {ModelTiepoint, ModelTransformation, ModelPixelScale}= tags;
	let resolution, origin;
	if (ModelTiepoint && ModelTiepoint.length === 6) {
		origin = [ModelTiepoint[3], ModelTiepoint[4], ModelTiepoint[5]];
	} else if (ModelTransformation) {
		origin = [ModelTransformation[3], ModelTransformation[7], ModelTransformation[11]];
	}
	if (ModelPixelScale) {
		resolution = [ModelPixelScale[0], -ModelPixelScale[1], ModelPixelScale[2]];
	} else if (ModelTransformation) {
		resolution = [ModelTransformation[0], ModelTransformation[5], ModelTransformation[10]];
	}
	tags.origin = origin;
	tags.resolution = resolution;
	const width = tags.ImageWidth, height = tags.ImageLength;
	tags.imageSize = {width, height};
				
	const projObj = geokeysToProj4.toProj4(geoKeyDirectory); // Convert geokeys to proj4 string
			// The function above returns an object where proj4 property is a Proj4 string and coordinatesConversionParameters is conversion parameters which we'll use later
	const projection = proj4(projObj.proj4, "WGS84"); // Project our GeoTIFF to WGS84

	tags.anchors = {	 // Pixel dimensions for converting image coordinates to source CRS coordinates
		bl: pointProject(origin[0], origin[1], projObj, projection),
		tl: pointProject(origin[0], origin[1] + height * resolution[1], projObj, projection),
		tr: pointProject(origin[0] + width * resolution[0], origin[1] + height * resolution[1], projObj, projection),
		br: pointProject(origin[0] + width * resolution[0], origin[1], projObj, projection)
	}
	return geoKeyDirectory;
}

const pointProject = (x, y, projObj, projection) => {
	let point = {x, y};
	if (projObj.shouldConvertCoordinates)
		point = geokeysToProj4.convertCoordinates(x, y, projObj.coordinatesConversionParameters);

	return projection.forward(point); // Project these coordinates
}
