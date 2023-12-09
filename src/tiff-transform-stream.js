/**
 * This file contains a TiffUnpacker.
 */
import { getTags } from './tifUtils.js';
import pako from './pako.esm.js';


/**
 * This class unpacks Uint8Arrays and sends PNG chunks when it gained enough data.
 */
export class TiffUnpacker {
	constructor(opt = {}) {
		// this.data = new Uint8Array(0);
		this.minBuf = 64 * 1024;
		this.onTags = opt.onTags;
		this.onTile = opt.onTile;
		this.onChunk = null;
		this.onClose = null;
		// this.num = 0;				
		this.tileCount = 0;		// текущий номер тайла
		this._shiftPos = 0;		// текущий index обработанного байта
		this._restPos = 0;		// текущий остаток данных
		this.chunks = [];		// массив полученных chunk-оф
// console.log("constructor:  ", this.chunks.length, this.tileInd, this.data);
		if (opt.chunk instanceof Uint8Array) this.addBinaryData(opt.chunk);
	}
  
  /**
   * Установка Флага получения тайлов
   */
	setReadyTiles(flag) {
		if (!this.readyTiles) this.checkForChunks(2);
		this.readyTiles = flag;
	}

	streamClosed() {
		if (!this.tags) { // Получение описания TIFF
console.log("streamClosed:  ", this.chunks.length, this.tileInd, this.data);
			this._parseTags();
			this.checkForChunks(11);
		}
		// requestAnimationFrame(this.checkForChunks.bind(this));
	}
  /**
   * Adds more binary data to unpack.
   *
   * @param {Uint8Array} uint8Array The data to add.
   */
	addBinaryData(uint8Array) {
console.log("addBinaryData", this.tags, uint8Array.length);
		this.chunks.push(uint8Array);
		if (!this.data) {
			this.data = new Uint8Array(0);
		}
		if (!this.tags) { // Получение описания TIFF
			this._nextChunkConcat();
			if (this.data.length < this.minBuf) return;	// chunk маленький - ожидаем пополнения
			this._parseTags();
		}
		this.checkForChunks(1);
	}

	_parseTags() {
		let tags = getTags(this.data);
		if (!tags) return;
		if (!tags.error) {
			this.tags = tags;
			if (this.onTags) this.onTags(tags);
			this._shift = tags._nextPos;
			this._strips = (tags.isTiled ? tags.TileByteCounts : tags.StripByteCounts).map((cnt, i) => {
				return {
					pos: (tags.isTiled ? tags.TileOffsets : tags.StripOffsets)[i],
					cnt
				}; 
			});
			this.setReadyTiles(true);


		} else {
			console.error("getTags:  ", this.data.length, tags);
		}
	}

	_nextChunkConcat() {
		const nChunk = this.chunks.shift();
		if (nChunk) {
			const clen = this.data.length;
			// const rest = this.data.subarray(clen);
			const newData = new Uint8Array(clen + nChunk.length);
			newData.set(this.data);	// остаток данных
			newData.set(nChunk, clen);
			this.data = newData;
		}
	}
	_checkDataSize(nextPos) {
		if (!this.readyTiles) return;

		const len = this.data.length;
		const min = nextPos || this.minBuf;
		if (len < min - this._shiftPos) {	// chunk маленький - ожидаем пополнения
			this._nextChunkConcat();
			return;
		}
		return true;
	}

	_nextChunk() {
		const nChunk = this.chunks.shift();
		if (nChunk) {
			const rpos = this._restPos;
			
			this._shiftPos += rpos;
			const rest = this.data.subarray(rpos);
			const newData = new Uint8Array(rest.length + nChunk.length);
			newData.set(rest);	// остаток данных
			newData.set(nChunk, rest.length);
			this.data = newData;
			this.checkForChunks(3);
		}
	}
	_getLastInd() {
		let {_shift, _shiftPos = 0} = this;
		let size = this.data.length - _shift + _shiftPos;
		let lastInd = this._strips.findLastIndex(v => {
			return v.pos + v.cnt < size;
		});

		return lastInd + 1;
	}
	_getChunkTiles(tileInd, lastInd) {
		let {tags, _shift, _shiftPos = 0} = this;
		let {isTiled, TileByteCounts, TileOffsets, Compression} = tags;
		if (!isTiled || !this.data) return;

		const {tSize, colCount} = tags.tilesConf;
		const {width, height} = tSize;
		const buf = this.data.buffer;

		for (let i = tileInd; i < lastInd; i++) {
			let strip = this._strips[i];
			let {pos, cnt} = strip;
			let b = pos - _shiftPos;

			const ndarray = this.data.subarray(b, b + cnt);

			const dx = width * (i % colCount);
			const dy = height * Math.floor(i / colCount);
			if (this.onTile) this.onTile({ ndarray, tSize, dx, dy, num: i });
		}
		this._shift = 0;
		this.tileInd = lastInd;
		if (TileOffsets[lastInd]) {
			this._restPos = TileOffsets[lastInd] - _shiftPos;
			this._nextChunk();
			// requestAnimationFrame(this.checkForChunks.bind(this));
		} else {
			// this.data = undefined;
		}
	}
	_getChunkStrips(tileInd, lastInd) {
		let {tags, _shift, _shiftPos = 0} = this;
		let {isTiled, StripOffsets, Compression, BitsPerSample, RowsPerStrip, ColorMap} = tags;
		if (isTiled || !this.data) return;

		let {tSize, colCount} = tags.tilesConf;
		let {width, height} = tSize;

		// let _stripWidth = tags.imageSize.width * RowsPerStrip * (Array.isArray(BitsPerSample) ? BitsPerSample.length : BitsPerSample);
		let _stripWidth = tags.imageSize.width * RowsPerStrip;
		let tStripNum = lastInd - tileInd;
		const ndarray = new Uint8Array(tStripNum * _stripWidth);

		for (let i = tileInd; i < lastInd; i++) {
			let strip = this._strips[i];
			let {pos, cnt} = strip;
			let b = pos - _shiftPos;
			// let b = pos - _shiftPos;
			// _shiftPos = _shift;

			const arr = this.data.subarray(b, b + cnt);
if (arr[0] !== 120) {
// if (i > 4) {
debugger
console.warn("bb:  ", tileInd, lastInd, strip.cnt, this.data.length);
}
			const arr1 = Compression === 1 ? arr : pako.ungzip(arr);
/*
if (ColorMap) {
  const greenOffset = ColorMap.length / 3;
  const blueOffset = ColorMap.length / 3 * 2;
  arr1.forEach(v => {
	let r = ColorMap[v] / 65536 * 256;
	let g = ColorMap[v + greenOffset] / 65536 * 256;
	let b = ColorMap[v + blueOffset] / 65536 * 256;
	let out = [r, g, b];
if (r) {
debugger
}
  });
}

export function fromPalette(raster, colorMap) {
  const { width, height } = raster;
  const rgbRaster = new Uint8Array(width * height * 3);
  const greenOffset = colorMap.length / 3;
  const blueOffset = colorMap.length / 3 * 2;
  for (let i = 0, j = 0; i < raster.length; ++i, j += 3) {
    const mapIndex = raster[i];
    rgbRaster[j] = colorMap[mapIndex] / 65536 * 256;
    rgbRaster[j + 1] = colorMap[mapIndex + greenOffset] / 65536 * 256;
    rgbRaster[j + 2] = colorMap[mapIndex + blueOffset] / 65536 * 256;
  }
  return rgbRaster;
}

*/			
			ndarray.set(arr1, _stripWidth * (i - tileInd));
		}
		const dx = 0;
		const dy = tileInd;
		tSize.height = tags.RowsPerStrip * ndarray.length / _stripWidth;
		if (this.onTile) this.onTile({ ndarray, tSize, dx, dy, num: tileInd });

		this._shift = 0;
		this.tileInd = lastInd;
		 
		if (this._strips[lastInd]) {
			this._restPos = this._strips[lastInd].pos - _shiftPos;
			this._nextChunk();
			// requestAnimationFrame(this.checkForChunks.bind(this));
		} else {
			// this.data = undefined;
		}
	}

  /**
   * Checks whether new chunks can be found within the binary data.
   */
	checkForChunks(attr) {
		if (!this.readyTiles || !this.data) return;

		let tags = this.tags;
		let {isTiled, Compression} = tags;
		let tileInd = this.tileInd || 0;
		let strip = this._strips[tileInd];

		if (strip === undefined) { // Все тайлы получены
			console.warn("Все тайлы получены:  ", attr, tileInd, pako);
			this.allTiles = true;
			this.data = undefined;
			return;
		}
		let lastInd = this._getLastInd();
		if (lastInd === tileInd) lastInd++;	// только на последней полосе
// if (tileInd > 60) {
// debugger
// console.warn("bb:  ", tileInd, lastInd, strip.cnt, this.data.length);
// }
		let {pos, cnt} = strip;
		let nextPos = pos + cnt;
		// let nextPos = pos + cnt - this._shiftPos;
		if (!this._checkDataSize(nextPos)) {	// chunk маленький - ожидаем пополнения
// console.warn("bb:  ", tileInd, lastInd, strip.cnt, this.data.length);
			requestAnimationFrame(this.checkForChunks.bind(this));
			return;
		}

		if (isTiled) {	// По тайлам
			this._getChunkTiles(tileInd, lastInd);
		} else { 		// По полосам
			this._getChunkStrips(tileInd, lastInd);
		}
	}
}
