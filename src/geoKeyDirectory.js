import proj4 from 'proj4';
import * as geokeysToProj4 from "geotiff-geokeys-to-proj4";
import { geoKeyNames, fieldTagNames } from './globals.js';
// import { fieldTypes, fieldTagNames, arrayFields, geoKeyNames, geoKeys, CompressionTypes } from './globals.js';

export default function parseGeoKeyDirectory(tags) {
  const rawGeoKeyDirectory = tags.GeoKeyDirectory;
  if (!rawGeoKeyDirectory) {
    return null;
  }

  const geoKeyDirectory = {};
  for (let i = 4; i <= rawGeoKeyDirectory[3] * 4; i += 4) {
    const key = geoKeyNames[rawGeoKeyDirectory[i]];
    const location = (rawGeoKeyDirectory[i + 1])
      ? (fieldTagNames[rawGeoKeyDirectory[i + 1]]) : null;
    const count = rawGeoKeyDirectory[i + 2];
    const offset = rawGeoKeyDirectory[i + 3];

    let value = null;
    if (!location) {
      value = offset;
    } else {
      value = tags[location];
      if (typeof value === 'undefined' || value === null) {
        throw new Error(`Could not get value of geoKey '${key}'.`);
      } else if (typeof value === 'string') {
        value = value.substring(offset, offset + count - 1);
      } else if (value.subarray) {
        value = value.subarray(offset, offset + count);
        if (count === 1) {
          value = value[0];
        }
      }
    }
    geoKeyDirectory[key] = value;
  }
				let resolution;
				let origin;
				const tiePoints = tags.ModelTiepoint;
				const modelTransformation = tags.ModelTransformation;
    const modelPixelScale = tags.ModelPixelScale;
				if (tiePoints && tiePoints.length === 6) {
				  origin = [tiePoints[3], tiePoints[4], tiePoints[5]];
				} else if (modelTransformation) {
				  origin = [modelTransformation[3], modelTransformation[7], modelTransformation[11]];
				}
				if (modelPixelScale) {
				  resolution = [modelPixelScale[0], -modelPixelScale[1], modelPixelScale[2]];
				} else if (modelTransformation) {
				  resolution = [modelTransformation[0], modelTransformation[5], modelTransformation[10]];
				}
				tags.origin = origin;
				tags.resolution = resolution;
				
			  let projObj = geokeysToProj4.toProj4(geoKeyDirectory); // Convert geokeys to proj4 string
			// The function above returns an object where proj4 property is a Proj4 string and coordinatesConversionParameters is conversion parameters which we'll use later
			  let projection = proj4(projObj.proj4, "WGS84"); // Project our GeoTIFF to WGS84
			  const width = tags.ImageWidth, height = tags.ImageLength;

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
