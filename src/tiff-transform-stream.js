/**
 * This file contains a TiffUnpacker.
 */
import { fieldTagNames } from './globals.js';
import geoKeyDirectory from './geoKeyDirectory.js';


/**
 * This class unpacks Uint8Arrays and sends PNG chunks when it gained enough data.
 */
export class TiffUnpacker {
	constructor(opt = {}) {
		this.data = new Uint8Array(0);
		this.minBuf = 64 * 1024;
		this.onTags = opt.onTags;
		this.onTile = opt.onTile;
		this.onChunk = null;
		this.onClose = null;
		// this.num = 0;				
		this.tileCount = 0;		// текущий номер тайла
		if (opt.chunk instanceof Uint8Array) this.addBinaryData(opt.chunk);
	}

  /**
   * Adds more binary data to unpack.
   *
   * @param {Uint8Array} uint8Array The data to add.
   */
	addBinaryData(uint8Array) {
// console.log("addBinaryData", this.position, this.data.length, uint8Array.length);
		const newData = new Uint8Array(this.data.length + uint8Array.length);
		newData.set(this.data, 0);
		newData.set(uint8Array, this.data.length);
		this.data = newData;

		this.checkForChunks();
	}
  
  /**
   * Получение описания TIFF.
   */
	checkTiffTags(dataView) {
		if (this.NotTiff || dataView.byteLength < 1024) { // chunk маленький либо это не TIFF
			return;
		}
		const LE = this.LE = dataView.getUint16(0) === 18761 ? true : false; // file as little endian format if format species it in memory
		const magicNumber = dataView.getUint16(2, LE);
		if (magicNumber !== 42 && magicNumber !== 43) {
			this.NotTiff = true;
			console.error({ identity: magicNumber, Compression: "Not Tif" });
			return;
		}
		const tags = {};
		const bigTiff = this.bigTiff = magicNumber === 42 ? false : true;
		const entrySize = bigTiff ? 20 : 12, offsetSize = bigTiff ? 8 : 2, byteRange = bigTiff ? 8 : 4;

		let offset = 8, offsetByteSize = 0;
		let firstIFDOffset = dataView.getUint32(16, LE); //a32[4];
		if (bigTiff) {
			offsetByteSize = dataView.getUint16(8, LE); //a16[4];
			if (offsetByteSize !== 8) {
				throw new Error('Unsupported offset byte-size.');
			}
			firstIFDOffset = dataView.getUint64(8, LE);
		}
		const a8 = this.data;
		// const a16 = new Uint16Array(a8.buffer, 32 * 1024);
		// const a32 = new Uint32Array(a8.buffer, 16 * 1024);
		const getFieldValues = (data) => {
			const {tagName, valueOffset, fLength, typeCount, bigTiff, read_order} = data;
			let val = dataView.getUint16(valueOffset, LE); // по умолчанию
			if (fLength * typeCount > byteRange) { 	// resolve the reference to the actual byte range
				let actualOffset = bigTiff ? dataView.getUint64(valueOffset, LE) : val;

				const nm = actualOffset / fLength;
				if (tagName === 'TileByteCounts' || tagName === 'TileOffsets') {
					console.log("tagName", tagName, fLength);
				}
				if (fLength === 8) {
					val = new Array(typeCount).fill(1).map((v, i) => { return dataView.getFloat64(actualOffset + i * fLength, LE); });
				} else if (fLength === 1) { // Ascii
					val = new TextDecoder('utf-8').decode(a8.slice(nm, nm + typeCount));
				} else if (fLength === 2) {
					val = new Array(typeCount).fill(1).map((v, i) => { return dataView.getUint16(actualOffset + i * fLength, LE); });
					// val = Array.from(a16.slice(nm, nm + typeCount));
				} else if (fLength === 4) {
					val = new Array(typeCount).fill(1).map((v, i) => { return dataView.getUint32(actualOffset + i * fLength, LE); });
					// val = Array.from(a32.slice(nm, nm + typeCount));
				}
			}
			return val;
		}

		let dpos = dataView.getUint32(4, LE);
		let i = offset + (bigTiff ? 8 : 2);
		const numDirEntries = dataView.getUint16(dpos, LE);
		for (let entryCount = 0; entryCount < numDirEntries; i += entrySize, ++entryCount) {
			let x = dpos + offsetSize + entrySize * entryCount;
			const tag_ = dataView.getUint16(x, LE);
			const tagName = fieldTagNames[tag_];
			
			const valueOffset = i + (bigTiff ? 12 : 8);
			const fieldType = dataView.getUint16(i + 2, LE);
			const typeCount = bigTiff ? dataView.getUint64(i + 4, LE) : dataView.getUint16(i + 4, LE);
			let fLength = 2;
			
			let fieldValues;// = dataView.getUint16(valueOffset, LE); // по умолчанию
			let attr = {tagName, valueOffset, fLength, typeCount, bigTiff};
if (tagName === 'TileByteCounts' || tagName === 'TileOffsets') {
	// console.log("fieldType", tagName, fieldType, fLength, tags.BitsPerSample);
}
			switch(fieldType) {
				case 2:
					fieldValues = getFieldValues({...attr, fLength: 1});
					break;
				case 4:
					// if (tags.BitsPerSample.length === 3) fLength = 4;
					// else if (tags.BitsPerSample.length === 4) fLength = 8;
					fieldValues = getFieldValues({...attr, fLength: 4});
					break;
				case 12:	// getFloat64
					fieldValues = getFieldValues({...attr, fLength: 8});
					break;
				default:
					fieldValues = getFieldValues(attr);
					break;
			}
			tags[tagName] = fieldValues;
		}
		tags.geoKeyDirectory = geoKeyDirectory(tags);
		tags.isTiled = tags.TileByteCounts;
		// tags.isTiled = !tags.StripOffsets;
		if (tags.isTiled) {
			this.position = tags.TileByteCounts[0];
			this.data = this.data.slice(tags.TileOffsets[0], this.data.length);
			tags.tilesConf = {
				tSize: {width: tags.TileWidth, height: tags.TileLength},
				colCount: Math.sqrt(tags.TileByteCounts.length)
			};
		} else {
			this.position = tags.StripByteCounts[0];
			this.minBuf = this.position;
			this.data = this.data.slice(tags.StripOffsets[0], this.data.length);
			tags.tilesConf = {
				tSize: {width: tags.ImageWidth, height: 1},
				colCount: 1
			};

			// let rstrip = Math.min(tags.RowsPerStrip, tags.ImageLength);
			// let ww = tags.ImageWidth;
// console.warn("TODO: необходимо еще разобраться с ключами tags.StripOffsets и tags.StripByteCounts ", tags);
// return;
		}


		this.tags = tags;
		if (this.onTags) this.onTags(tags);
	}

  /**
   * Checks whether new chunks can be found within the binary data.
   */
	checkForChunks() {
		if (!this.position) this.position = 0;
// console.warn("position:  ", this.data.length , this.minBuf);
		if (this.data.length < this.minBuf) return;	// chunk маленький - ожидаем пополнения
	
		const dataView = new DataView(this.data.buffer, 0);
		this.dataView = dataView;
		let num = this.tileCount;
	
		if (!this.tags && this.position === 0) { // Получение описания TIFF
// console.warn("position_10:  ", this.position, this.tags);
			this.checkTiffTags(dataView);
// console.warn("position_1:  ", this.position, this.tags);
		} else if (num < this.tags[this.tags.isTiled ? 'TileOffsets' : 'StripOffsets'].length) { // Получение тайлов
			const tags = this.tags;
			let nextPos = tags.isTiled ? tags.TileOffsets[num] : tags.StripOffsets[num];
			let nextCount = tags.isTiled ? tags.TileByteCounts[num] : tags.StripByteCounts[num];
// console.warn("position_11111:  ", num, this.data.length, nextCount);
			if (this.data.length < nextCount) return; // chunk маленький либо это не TIFF

			const pull = [];
// console.warn("position_11:  ", num, this.data.length, this.position);
			do {
// console.warn("FFFFFFFFF___:  ", num, tags.isTiled);
				if (tags.isTiled) {
					const ndarray = new Uint8Array(this.data.buffer, 0, nextCount);
					const tc = tags.tilesConf;
					const tSize = tc.tSize;
					const dx = tSize.width * (num % tc.colCount);
					const dy = tSize.height * Math.floor(num / tc.colCount);
					if (this.onTile) this.onTile({ ndarray, tSize, dx, dy, num });
				} else {
					const bps = tags.BitsPerSample;
					if (tags.BitsPerSample === 16) {
// if (tags.BitsPerSample === 16) {
// }
						const ndarray = new Uint16Array(this.data.buffer, 0, nextCount / 2);
						const dx = 0;
						const dy = num;
						const tc = tags.tilesConf;
						const tSize = tc.tSize;
						pull.push({ ndarray, tSize, dx, dy, num });
						if (pull.length % 101 === 0) {
							const outArr = new Uint16Array(ndarray.length * 100);
							pull.pop();
							pull.forEach((it, i) => {
								let arr = it.ndarray;
								outArr.set(arr, i * arr.length);
							});
							
							// const outArr = new Uint16Array(pull.map(it => [...new Uint8Array(it.buffer)]).flat());
						if (this.onTile) this.onTile({ ndarray: outArr, tSize: {width: tSize.width, height: 100} , dx, dy: num - 100, num: num - 100 });  // одна строка изображения
							// const outArr = new Uint16Array(pull.map(it => [...new Uint8Array(it.buffer)]).flat());
							// pull.forEach({ ndarray, dx, dy, num });
							pull.length = 0;
// console.warn("TODO:  ", num, this.data.length);
						}
						if (this.onTile) this.onTile({ ndarray, tSize, dx, dy, num });  // одна строка изображения
					}
					
				}
				this.data = this.data.slice(nextCount, this.data.length);
				this.position = 0;
				num++;
				nextCount = tags.isTiled ? tags.TileByteCounts[num] : tags.StripByteCounts[num];
				nextPos = tags.isTiled ? tags.TileOffsets[num] : tags.StripOffsets[num];
// console.warn("FFFFFFFFF:  ", num, this.position, nextCount, nextPos, this.data.length);
			} while(this.data.length > nextCount)
				
// console.warn("position_111:  ", num, this.data, this.position);
			if (pull.length) {
				let tt = pull.length;
			}
			this.tileCount = num;
		} else {
console.warn("position_2:  ", num, this.tags);
		}
	}
}
