import { fieldTagNames } from './globals.js';
import geoKeyDirectory from './geoKeyDirectory.js';

function getTags(uint8Array) {		// Получение описания TIFF.
// console.time('getTags');
	const tags = {};

	const dataView = new DataView(uint8Array.buffer, 0);
	if (dataView.byteLength < 1024) { // chunk маленький либо это не TIFF
		tags.error = 'chunk маленький либо это не TIFF';
		return tags;
	}
	const LE = tags.LE = dataView.getUint16(0) === 18761 ? true : false; // file as little endian format if format species it in memory
	const magicNumber = dataView.getUint16(2, LE);
	if (magicNumber !== 42 && magicNumber !== 43) {
		tags.NotTiff = true;
		tags.error = 'это не TIFF';
		tags.identity = magicNumber;
		return tags;
	}
	const bigTiff = tags.bigTiff = magicNumber === 42 ? false : true;
	const entrySize = bigTiff ? 20 : 12, offsetSize = bigTiff ? 8 : 2, byteRange = bigTiff ? 8 : 4;

	let offset = 8;
	// let firstIFDOffset = dataView.getUint32(16, LE);
	if (bigTiff) {	//  todo
		if (dataView.getUint16(8, LE) !== 8) {
			tags.error = 'Unsupported offset byte-size.';
			return tags;
		}
		// firstIFDOffset = dataView.getUint64(8, LE);
	}

	let dpos = dataView.getUint32(4, LE);
	let i = offset + (bigTiff ? 8 : 2);
	const numDirEntries = dataView.getUint16(dpos, LE);
	for (let entryCount = 0; entryCount < numDirEntries; i += entrySize, ++entryCount) {
		let x = dpos + offsetSize + entrySize * entryCount;
		const tag_ = dataView.getUint16(x, LE);
		const tagName = fieldTagNames[tag_];

		const fieldType = dataView.getUint16(i + 2, LE);
		const typeCount = bigTiff ? dataView.getUint64(i + 4, LE) : dataView.getUint16(i + 4, LE);
		const valueOffset = i + (bigTiff ? 12 : 8);
		let fieldValues = dataView.getUint16(valueOffset, LE); // по умолчанию

		let fLength = 2;
		if (fieldType === 2) fLength = 1;
		else if (fieldType === 4) fLength = 4;
		else if (fieldType === 12) fLength = 8;

		if (fLength * typeCount > byteRange) { 	// resolve the reference to the actual byte range
			let actualOffset = bigTiff ? dataView.getUint64(valueOffset, LE) : fieldValues;
			if (actualOffset + typeCount * fLength > dataView.byteLength) return; // Ожидаем следующий chunk

			const tmpArr = new Array(typeCount).fill(1);
			if (fLength === 1) { // Ascii
				const nm = actualOffset / fLength;
				fieldValues = new TextDecoder('utf-8').decode(uint8Array.slice(nm, nm + typeCount));
			} else if (fLength === 2) {
				fieldValues = tmpArr.map((v, i) => dataView.getUint16(actualOffset + i * fLength, LE));
			} else if (fLength === 4) {
				fieldValues = tmpArr.map((v, i) => dataView.getUint32(actualOffset + i * fLength, LE));
			} else if (fLength === 8) {
				fieldValues = tmpArr.map((v, i) => dataView.getFloat64(actualOffset + i * fLength, LE));
			}
		}
		tags[tagName] = fieldValues;
	}
	tags.geoKeyDirectory = geoKeyDirectory(tags);
	let noffset = 0;
	if (tags.TileByteCounts) {
		tags.isTiled = true;
		tags.tilesConf = {
			tSize: {
				width: tags.TileWidth,
				height: tags.TileLength,
				bytes: tags.TileWidth * tags.TileLength * tags.BitsPerSample.length
			},
			colCount: Math.ceil(tags.imageSize.width / tags.TileWidth),
			tilesCount: tags.TileByteCounts.length
		};
		// tags._nextPos = tags.TileByteCounts[0];										// следующая позиция
		tags._nextPos = tags.TileOffsets[0];
	} else {
		tags.tilesConf = {
			tSize: {width: tags.ImageWidth, height: 1},
			colCount: 1,
			tilesCount: tags.StripByteCounts.length
		};
		// tags._nextPos = tags.StripByteCounts[0];
		tags._nextPos = tags.StripOffsets[0];
	}
	tags._shift = tags._nextPos;
	tags._shiftTo1Tile = tags._nextPos;
	// tags._restData = getNewArr(uint8Array, tags._shift);
	  console.log('asas1', tags._nextPos);

	return tags;
}

export {getTags};
