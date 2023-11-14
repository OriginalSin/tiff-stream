import {TiffUnpacker} from './tiff-transform-stream.js'
import TilesConcat from './wglTilesConcat.js'
import IndDB from './IndDB.js'

class TiffStream {
    constructor(options) {
		// super();
		const {IndDB} = options;
		console.time('TiffUnpacked');
		let pull = [];
		// this.pull = pull;
		let tilesConcat;
		let bTc;
window.test = IndDB;
		const tiffUnpacker = new TiffUnpacker({
			onTags: tags => {
 // console.log('__ onTags __', IndDB);
 
				tilesConcat = new TilesConcat({...tags, ...options});
 				bTc = tilesConcat.Render.bind(tilesConcat);
// console.log('__ onTags1 __', tilesConcat);
			},
			onTile: tile => {
 // console.log('__ onTile __', tile);
				// IndDB.addRecord(tile);
				// pull.push(tile);
				tilesConcat.Render(tile);
				// tilesConcat.reRender(tile);
		// requestAnimationFrame(() => {
				// tilesConcat.Render.call(tilesConcat, tile);
		// });
				// if (bTc) {
					// pull.forEach(bTc);
			// pull = [];
				// }
			}
		});
		this.tiffUnpacker = tiffUnpacker;
		// this.write = (chunk, controller) => {
 // console.log('__ write __', chunk, controller);
			// tiffUnpacker.addBinaryData(chunk);		// Called when a chunk is read.
			// tiffUnpacker.addBinaryData.bind(tiffUnpacker);		// Called when a chunk is read.
		// }
    }
	close = () => {											// Called when the stream is closed.
		console.timeEnd('TiffUnpacked');
	}
	write(chunk, controller) {
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
	// let filename = url.split('/').pop();
	let db = await IndDB.getTable({name});
	// const databases = await self.indexedDB.databases();
	// let db = databases.filter(it => it.name === 'tileList') || [await IndDB()];
	opt.IndDB = IndDB;
  console.log('nnnnnnnn', db);
	// let db1 = IndDB.addRecord({db, name});

	fetch(name, {mode: 'cors', credentials: 'include'}).then(response => response.body)
	  .then(rs => {
			const [rs1, rs2] = rs.tee();
			rs2.pipeThrough(new TransformStream())
			// rs2.pipeTo(new TiffStream(opt))
				// new TiffStream(opt),
				// {
					// size: function (chunk) {
 // console.log('__ size __', chunk);
						// return 122222;
					// }
				// }
				// )).catch(console.error);
			return rs1;
	  })
		.then(rs => rs.pipeTo(new WritableStream(new TiffStream(opt))))
}

