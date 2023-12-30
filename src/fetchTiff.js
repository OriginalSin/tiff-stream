import {TiffUnpacker, getTags} from './tiff-transform-stream.js'
import TilesConcat from './wglTilesConcat.js'

const k64 = 64 * 1024;
const maxFileSize = 30 * 1000 * 1024;
const queueingStrategy = new ByteLengthQueuingStrategy({ highWaterMark: 64 * 1024});


class TiffStream {
    constructor(options) {
		// super();
		const {name = 'test', db, stream, onTags, onTile} = options;
// console.log('TiffUnpacked', options);
		console.time('TiffUnpacked');
		// let pull = [];
		this.chunkCount = 0;
		// let tilesConcat;
		let bTc;
		// this.setIndDB(name);

// this.stream = stream;
		
		const _this = this;
		const tiffUnpacker = new TiffUnpacker({
			onTags: tags => {
				const tilesConcat = new TilesConcat({...tags, ...options});
				_this.tilesConcat = tilesConcat;
				if (options.onTags) options.onTags.call(this, tags);
 // console.log('__ onTags __', IndDB);
			},
			onTile: tile => {
				// IndDB.addRecord(tile);
// if (tile.num > 50) return;
				_this.tilesConcat.Render(tile);
// _this.stream.cancel();
			}
		});
		this.tiffUnpacker = tiffUnpacker;
    }
	close = () => {											// Called when the stream is closed.
		console.timeEnd('TiffUnpacked');
 		this.tiffUnpacker.streamClosed();
	}
	write(chunk, controller) {
// console.log("uint8Array:  ", chunk.length, chunk);
 		this.tiffUnpacker.addBinaryData(chunk);		// Called when a chunk is read.
    }
	transform(chunk, controller) {
 console.log('__ transform __', chunk, controller);
      // controller.enqueue(chunk.toUpperCase());
    }
	start(controller) {											// Called when the stream is closed.
console.log('__ start __', controller);
	}
	abort(reason) {											// Called when the stream is closed.
console.error('__abort__', reason);
	}
	flush (controller) {											// Called when the stream is closed.
console.log('__ flush __', controller);
		// this.pull = [];
		// console.timeEnd('TiffUnpacked');
	}

}
export default async (name, opt) => {  // Fetch Tiff file to canvas
	fetch(name, {mode: 'cors', credentials: 'include'}).then(response => response.body)
	  .then(rs => {
			const [rs1, rs2] = rs.tee();
			rs2.pipeThrough(new TransformStream())
			return rs1;
	  })
		.then(rs => rs.pipeTo(new WritableStream(new TiffStream(opt))))
}

