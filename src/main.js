import {TiffUnpacker} from './tiff-transform-stream.js'
// import GmxGL from './gl'
import {Render, gmxGl} from './wgl.js'
// import wut from './webgl-utils.js'

const tbody = document.getElementsByTagName('tbody')[0];
const canvas = document.querySelector('.canvas');
// const gmxGL = new GmxGL({canvas});
/*
fetch('./data/33.png')
  .then(response => response.blob())
  .then(createImageBitmap)
  .then(bitmap => {
// создаём <canvas> того же размера
// let canvas = document.createElement('canvas');
// canvas.width = bitmap.width;
// canvas.height = bitmap.height;

// let context = canvas.getContext('2d');

// копируем изображение в  canvas (метод позволяет вырезать часть изображения)
// context.drawImage(bitmap, 0, 0);
// let arr = context.getImageData(0,0,bitmap.width,bitmap.height);
// let ndarr = new Uint8Array(arr.data);
			// console.log('data', arr, ndarr);
		// let fileReader = new FileReader();

		// fileReader.readAsArrayBuffer(blob);

		// fileReader.onload = function(event) {
		  // let arrayBuffer = fileReader.result;
			// console.log('data', arrayBuffer);
		// };
	  // let tt = await data.arrayBuffer();
	  // let ndarr = new Uint8Array(tt);
			// console.log('data', ndarr);
// gmxGL.draw({bitmap: ndarr, size: {width: 256, height: 256}});
Render(bitmap, canvas);
  })
*/
class LogStreamSink {
    /**
     * @param {string} name
     */
    constructor(name) {
		this.name = name;
		this.counter = 0;
		this.header = false;
		console.time('tiffUnpacker');
		this.tiffUnpacker = new TiffUnpacker({});
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
			// console.log('tags', this.tiffUnpacker.tags);
 		console.timeLog('tiffUnpacker');
		// const tags = this.tiffUnpacker.tags;
		this.drawTiles();

 		console.timeEnd('tiffUnpacker');
			// console.log('tags', tags);
    }
    drawTiles(heading, counter, chunk) {
		const tags = this.tags;
			if (!tags.tiles) return;
		const tiles = tags.tiles;
		const tSize = {width: tags.TileWidth, height: tags.TileLength};
		let w = Math.sqrt(tags.TileByteCounts.length);
		tiles.forEach((tile, n) => {
			let col = n % w;
			let raw = Math.floor(n / w);
			if (tiles[n] !== 'done') {
				Render(tiles[n], tSize, tSize.width * col, tSize.height * raw);
				tiles[n] = 'done';
			}
		});
	}

    chkTags(heading, counter, chunk) {
		const tags = this.tags;

			console.log('tags', tags);
			this.header = true;
		// canvas.width = w * 256;
		// canvas.height = w * 256;
		canvas.width = tags.ImageWidth;
		canvas.height = tags.ImageLength;
		this._offscreen = canvas;
		// this._offscreen = canvas.transferControlToOffscreen();

		gmxGl(this._offscreen);
			console.log('canvas____', canvas);
		// setTimeout(function() {
		// }.bind(this), 1000);
    }

    /**
     * Creates a row in the table.
     *
     * @param {string} heading
     * @param {string} col1
     * @param {string} col2
     */
    createRow(heading, counter, chunk) {
		this.tiffUnpacker.addBinaryData(chunk);
		this.tags = this.tiffUnpacker.tags;
		if (this.tags && !this.header) {	// Описание TIFF прочитано надо стартовать
			this.chkTags();
		}
		// requestAnimationFrame(this.drawTiles.bind(this));
		// if (this.header) this.drawTiles();
		// if (this.header) {
			// setTimeout(function() {
				// this.drawTiles();
			// }.bind(this), 100);
		// }
		
			// console.log(', tags', this.header, this.tags.tiles.length);
		// if (counter === 1) {	// первые 64Кб
		    // this.tiffUnpacker = new TiffUnpacker({chunk});
		// }
		// } else {
		
      const col1 = counter;
      const col2 = chunk.constructor.name + ' ' + chunk.length;
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

  // function logReadableStream(name, rs) {
    // const [rs1, rs2] = rs.tee();

    // rs2.pipeTo(new WritableStream(new LogStreamSink(name))).catch(console.error);

    // return rs1;
  // }


  // Fetch the original image
fetch('./data/B_RGB.tif')
  // Retrieve its body as ReadableStream
  .then(response => response.body)
  // Log each fetched Uint8Array chunk
  // .then(rs => logReadableStream('Fetch Response Stream', rs))
  // Transform to a PNG chunk stream
  // .then(rs => rs.pipeThrough(new TiffTransformStream({
		// onChunk: ev => {
			// console.log("onChunk", ev);
		// },
		// onClose: ev => {
			// console.log("onClose", ev);
		// },
  // })))
  // Log each transformed PNG chunk
  // .then(rs => logReadableStream('PNG Chunk Stream', rs))
  .then(rs => {
	const [rs1, rs2] = rs.tee();

    rs2.pipeTo(new WritableStream(new LogStreamSink('TiffParser'))).catch(console.error);

    return rs1;
  })


