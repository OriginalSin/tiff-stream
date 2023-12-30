import { geoKeyNames, fieldTagNames } from './globals.js';
import GeokeysToProj4 from './GeokeysToProj4.js';
import proj4 from './proj4/lib/index.js';

export default function parseGeoKeyDirectory(tags) {
	const rawKeys = tags.GeoKeyDirectory;
	if (!rawKeys) return null;

	const geoKeyDirectory = {};
	for (let i = 4; i <= rawKeys[3] * 4; i += 4) {
		const key = geoKeyNames[rawKeys[i]];
		const count = rawKeys[i + 2];
		const offset = rawKeys[i + 3];
		const location = rawKeys[i + 1] ? (fieldTagNames[rawKeys[i + 1]]) : null;

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
				
	const projObj = GeokeysToProj4.toProj4(geoKeyDirectory); // Convert geokeys to proj4 string
			// The function above returns an object where proj4 property is a Proj4 string and coordinatesConversionParameters is conversion parameters which we'll use later
	const projection = proj4(projObj.proj4, "WGS84"); // Project our GeoTIFF to WGS84
	// const projWM = proj4(projObj.proj4, "EPSG:4326"); // Project our GeoTIFF to WebMercator
	const projWM = proj4(projObj.proj4, "EPSG:3857"); // Project our GeoTIFF to WebMercator
// ???
	tags.anchWM = {
		tl: pointProject(origin[0], origin[1], projObj, projWM),
		bl: pointProject(origin[0], origin[1] + height * resolution[1], projObj, projWM),
		br: pointProject(origin[0] + width * resolution[0], origin[1] + height * resolution[1], projObj, projWM),
		tr: pointProject(origin[0] + width * resolution[0], origin[1], projObj, projWM)
	};

	tags.anchWM.bounds = {
		max: {
			x: Math.max(tags.anchWM.bl.x, tags.anchWM.tl.x, tags.anchWM.tr.x, tags.anchWM.br.x),
			y: Math.max(tags.anchWM.bl.y, tags.anchWM.tl.y, tags.anchWM.tr.y, tags.anchWM.br.y)
		},
		min: {
			x: Math.min(tags.anchWM.bl.x, tags.anchWM.tl.x, tags.anchWM.tr.x, tags.anchWM.br.x),
			y: Math.min(tags.anchWM.bl.y, tags.anchWM.tl.y, tags.anchWM.tr.y, tags.anchWM.br.y)
		}
	};
	tags.anchWM.center = [
		(tags.anchWM.bounds.min.x + tags.anchWM.bounds.max.x) / 2,
		(tags.anchWM.bounds.min.y + tags.anchWM.bounds.max.y) / 2
	];
	tags.imageSizeR = [
		width * resolution[0],
		-height * resolution[1]
	];
	tags.anchors = {	 // Pixel dimensions for converting image coordinates to source CRS coordinates
		tl: pointProject(origin[0], origin[1], projObj, projection),
		bl: pointProject(origin[0], origin[1] + height * resolution[1], projObj, projection),
		br: pointProject(origin[0] + width * resolution[0], origin[1] + height * resolution[1], projObj, projection),
		tr: pointProject(origin[0] + width * resolution[0], origin[1], projObj, projection)
	};
// console.log('____________', tags);
	return geoKeyDirectory;
}

const pointProject = (x, y, projObj, projection) => {
	let point = {x, y};
	if (projObj.shouldConvertCoordinates)
		point = GeokeysToProj4.convertCoordinates(x, y, projObj.coordinatesConversionParameters);

	return projection.forward(point); // Project these coordinates
}
