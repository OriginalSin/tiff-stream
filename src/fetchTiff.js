import {TiffUnpacker} from './tiff-transform-stream.js'
import TilesConcat from './wglTilesConcat.js'

class TiffStream {
    constructor(canvas) {
		console.time('TiffUnpacked');
		let pull = [];
		// this.pull = pull;
		let tilesConcat;

		const tiffUnpacker = new TiffUnpacker({
			onTags: tags => {
				tilesConcat = new TilesConcat({canvas, tags});
			},
			onTile: tile => {
				pull.push(tile);
				if (tilesConcat) { pull.forEach(tilesConcat.Render.bind(tilesConcat)); }
			}
		});
		this.write = tiffUnpacker.addBinaryData.bind(tiffUnpacker);		// Called when a chunk is read.
		this.close = () => {											// Called when the stream is closed.
			pull = [];
			console.timeEnd('TiffUnpacked');
		};
    }
}
export default (url, canvas) => {  // Fetch Tiff file to canvas
	fetch(url, {mode: 'cors', credentials: 'include'}).then(response => response.body)
	  .then(rs => {
			const [rs1, rs2] = rs.tee();
			rs2.pipeTo(new WritableStream(new TiffStream(canvas))).catch(console.error);
			return rs1;
	  });
}

