// import './style.css'
// import javascriptLogo from './javascript.svg'
// import viteLogo from '/vite.svg'
// import tiffDecoder from 'tiff-decoder'
import {crc32, CRC_TABLE} from './crc32.js'
import {createChunk} from './png-chunks.js'
import {PNGTransformStream} from './png-transform-stream.js'
import { fieldTypes, fieldTagNames, arrayFields, geoKeyNames, geoKeys, CompressionTypes } from './globals.js';
import proj4 from 'proj4';
import * as geokeysToProj4 from "geotiff-geokeys-to-proj4";

// import { Buffer } from 'node:buffer';

function parseGeoKeyDirectory(tags) {
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

  const tbody = document.getElementsByTagName('tbody')[0];

  class LogStreamSink {
    /**
     * @param {string} name
     */
    constructor(name) {
      this.name = name;
      this.counter = 0;
    }

    /**
     * Called when a chunk is written to the log.
     */
    write(chunk) {
      this.counter += 1;
      // console.log('Chunk %d of %s: %o', this.counter, this.name, chunk);

      this.createRow(this.name, this.counter, chunk);
      // this.createRow(this.name, this.counter, chunk.constructor.name);
    }

    /**
     * Called when the stream is closed.
     */
    close() {
      this.createRow(this.name, this.counter, 'Closed');
    }
    /**
     * Получение описания Tiff.
     */
    getTags(chunk) {	// первые 64Кб
		const buf =	chunk.buffer;
		const len = buf.byteLength;
		const dv = new DataView(buf, 0, len);
		let a8 = new Uint8Array(buf), a16 = new Uint16Array(buf), a32 = new Uint32Array(buf), f32 = new Float32Array(buf);

		const read_order = a16[0] === 18761 ? true : false; //tif file as little endian format if format species it in memory
		const magicNumber = a16[1];
		let bigTiff;
		if (magicNumber === 42) {
			bigTiff = false;
		} else if (magicNumber === 43) {
			bigTiff = true;
		} else {
			console.error({ identity: magicNumber, Compression: "Not Tif" });
			return;
		}

		const tags = {};
		if (read_order) { 		//read in tif file as little endian format if format species it in memory
			let offset = 8, offsetByteSize = 0;
			let firstIFDOffset = a32[4];
			if (bigTiff) {
				offsetByteSize = a16[4];
				if (offsetByteSize !== 8) {
					throw new Error('Unsupported offset byte-size.');
				}
				firstIFDOffset = dv.getUint64(8, read_order);
			}
			const entrySize = bigTiff ? 20 : 12;
			const offsetSize = bigTiff ? 8 : 2;
			let A = a32[1], A2 = A / 2;
			let numDirEntries = a16[A2];
			let i = offset + (bigTiff ? 8 : 2);
			  for (let entryCount = 0; entryCount < numDirEntries; i += entrySize, ++entryCount) {
				let x = A + offsetSize + entrySize * entryCount;
				const tag_ = a16[x / 2];
				const tagName = fieldTagNames[tag_];
				
				const valueOffset = i + (bigTiff ? 12 : 8);
				const fieldType = a16[(i + 2) / 2];
				const typeCount = bigTiff ? dv.getUint64(i + 4, read_order) : a16[(i + 4)/2];
				let fieldTypeLength = 2;
				let len = 2;
const getFieldValues = (data) => {
	const {tagName, len, valueOffset, fieldTypeLength, typeCount, bigTiff, read_order} = data;
	let val = a16[valueOffset / 2];
	if (fieldTypeLength * typeCount > (bigTiff ? 8 : 4)) { 	// resolve the reference to the actual byte range
		let actualOffset = bigTiff ? dv.getUint64(valueOffset, read_order) : a16[valueOffset/2];

		// const length = fieldTypeLength * typeCount;
		const nm = actualOffset / len;
		if (tagName === 'ModelPixelScale' || tagName === 'ModelTiepoint') {
			val = new Array(typeCount).fill(1).map((v, i) => { return dv.getFloat64(actualOffset + i * 8, read_order); });
		} else if (tagName === 'GeoAsciiParams') {
			val = new TextDecoder('utf-8').decode(a8.slice(nm, nm + typeCount));
		} else if (len === 2) {
			val = Array.from(a16.slice(nm, nm + typeCount));
		} else {
			val = Array.from(a32.slice(nm, nm + typeCount));
		}
	}
	return val;
}

				let fieldValues;
				let attr = {tagName, len, valueOffset, fieldTypeLength, typeCount, bigTiff, read_order};
				switch(fieldType) {
					case 2:
						fieldValues = getFieldValues({...attr, fieldTypeLength: 1, len: 1});
						break;
					case 4:
						fieldValues = getFieldValues({...attr, len: 4});
						break;
					case 12:
						fieldValues = getFieldValues({...attr, fieldTypeLength: 8});
						break;
					default:
						fieldValues = getFieldValues(attr);
						break;
				}
				tags[tagName] = fieldValues;

				if (tag_ == 259) {	// compression
				  //console.log("Code: " + offset_);
					console.log(CompressionTypes[fieldValues]);
				}
			  }
				// let resolution;
				// let origin;
				// const tiePoints = tags.ModelTiepoint;
				// const modelTransformation = tags.ModelTransformation;
    // const modelPixelScale = tags.ModelPixelScale;
				// if (tiePoints && tiePoints.length === 6) {
				  // origin = [tiePoints[3], tiePoints[4], tiePoints[5]];
				// } else if (modelTransformation) {
				  // origin = [modelTransformation[3], modelTransformation[7], modelTransformation[11]];
				// }
				// if (modelPixelScale) {
				  // resolution = [modelPixelScale[0], -modelPixelScale[1], modelPixelScale[2]];
				// } else if (modelTransformation) {
				  // resolution = [modelTransformation[0], modelTransformation[5], modelTransformation[10]];
				// }
				// tags.origin = origin;
				// tags.resolution = resolution;

    // if (referenceImage) {
      // const [refResX, refResY, refResZ] = referenceImage.getResolution();
      // return [
        // refResX * referenceImage.getWidth() / this.getWidth(),
        // refResY * referenceImage.getHeight() / this.getHeight(),
        // refResZ * referenceImage.getWidth() / this.getWidth(),
      // ];
    // }

				
			  tags.geoKeyDirectory = parseGeoKeyDirectory(tags);
			  // let projObj = geokeysToProj4.toProj4(tags.geoKeyDirectory); // Convert geokeys to proj4 string
			// The function above returns an object where proj4 property is a Proj4 string and coordinatesConversionParameters is conversion parameters which we'll use later
			  // let projection = proj4(projObj.proj4, "WGS84"); // Project our GeoTIFF to WGS84
			  // const width = tags.ImageWidth, height = tags.ImageLength;

			// tags.anchors = {	 // Pixel dimensions for converting image coordinates to source CRS coordinates
				// bl: pointProject(origin[0], origin[1], projObj, projection),
				// tl: pointProject(origin[0], origin[1] + height * resolution[1], projObj, projection),
				// tr: pointProject(origin[0] + width * resolution[0], origin[1] + height * resolution[1], projObj, projection),
				// br: pointProject(origin[0] + width * resolution[0], origin[1], projObj, projection)
			// }

			  this.tags = tags;
// console.log('tags', tags, fieldTypes);

		} else {
			const getItem = (buf, byteOffset, byteLength, is32, isLE) => {
			  const dv = new DataView(buf, byteOffset, byteLength)
			  return is32 ? dv.getUint32(0, isLE) : dv.getUint16(0, isLE);
			}
			let First_IFD_location = getItem(buf, 4, 4, true, read_order);
			let A = First_IFD_location;
			  let directory_entry_ = new DataView(buf, A, 2).getUint16(0, read_order);
			  for (let i = 0; i < directory_entry_; i++) {
				let x = A + 2 + 12 * i;
				let tag_ = new DataView(buf, x, 2).getUint16(0, read_order);

				if (tag_ == 259) {
				  let offset_ = new DataView(buf, x + 8, 4).getUint32(0, read_order);
				  //console.log("Code: " + offset_);
					console.log(CompressionTypes[fieldValues]);
				}
			  }
		} 
    }

    /**
     * Creates a row in the table.
     *
     * @param {string} heading
     * @param {string} col1
     * @param {string} col2
     */
    createRow(heading, counter, chunk) {
		if (counter === 1) {	// первые 64Кб
			this.getTags(chunk)
			console.log('tags', this.tags);
		}
		
      const col1 = counter;
      const col2 = chunk.constructor.name;
      const tr = document.createElement('tr');
      tbody.appendChild(tr);
      const th = document.createElement('th');
      th.appendChild(document.createTextNode(heading));
      tr.appendChild(th);
      const tdCounter = document.createElement('td');
      tdCounter.appendChild(document.createTextNode(col1));
      tr.appendChild(tdCounter);
      const tdChunk = document.createElement('td');
      tdChunk.appendChild(document.createTextNode(col2));
      tr.appendChild(tdChunk);
    }
  }

  function logReadableStream(name, rs) {
    const [rs1, rs2] = rs.tee();

    rs2.pipeTo(new WritableStream(new LogStreamSink(name))).catch(console.error);

    return rs1;
  }


  // Fetch the original image
  fetch('./data/B_RGB.tif')
  // Retrieve its body as ReadableStream
  .then(response => response.body)
  // Log each fetched Uint8Array chunk
  .then(rs => logReadableStream('Fetch Response Stream', rs))
  // Transform to a PNG chunk stream
  .then(rs => rs.pipeThrough(new PNGTransformStream()))
  // Log each transformed PNG chunk
  .then(rs => logReadableStream('PNG Chunk Stream', rs))


// setupCounter(document.querySelector('#counter'))
