import {crc32, CRC_TABLE} from './crc32.js'

import {createChunk} from './png-chunks.js'
import geotiffParser from './tiff-chunks.js'
import {PNGTransformStream} from './png-transform-stream.js'

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
     * Creates a row in the table.
     *
     * @param {string} heading
     * @param {string} col1
     * @param {string} col2
     */
    createRow(heading, counter, chunk) {
		if (counter === 1) {	// первые 64Кб
			this.tags = geotiffParser.parseHeader(chunk)
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


