import * as webglUtils from './glUtils.js';
import m4 from './m4.js';

"use strict";
const qualityOptions = { anisotropicFiltering: true, mipMapping: true, linearFiltering: true };
const _anisoExt = null;//, srcPoints, matrix, glResources, gl;
const contextOpt = {preserveDrawingBuffer: true};

export default class TilesConcat {
	constructor(options) {
		const { canvas, maxSize = {}, programs = [] } = options;
		
		// canvas.width = options.ImageWidth;
		// canvas.height = options.ImageLength;
		// canvas.width = maxSize.width || options.ImageWidth;
		// canvas.height = maxSize.height || options.ImageLength;
		const gl = canvas.getContext("webgl2", contextOpt);	// Get A WebGL context
		this.gl = gl;
		this.canvas = canvas;
		this.tags = options;
 console.warn('__constructor__', options);

		const program = webglUtils.createProgramFromSources(this.gl, [vss, fss]);
		this.program = program

		// look up where the vertex data needs to go.
		this.positionLocation = gl.getAttribLocation(program, "a_position");
		this.texcoordLocation = gl.getAttribLocation(program, "a_texcoord");

		// lookup uniforms
		this.matrixLocation = gl.getUniformLocation(program, "u_matrix");
		this.textureLocation = gl.getUniformLocation(program, "u_texture");

		this.init();
		this.vpScale = 1; // зум viewport
		this.vpPos = [0, 0]; // смещение viewport
		this.vpShift = [0, 0]; // текущее смещение viewport
		const maxx = this.tags.ImageWidth - this.canvas.width;
		const maxy = this.tags.ImageLength - this.canvas.height;
		
		const onMess = (event) => {
			const { type, canvas, pos = [0,0], scale} = event.data;
		// console.log('onMess', type, shift, event)
			if (scale) this.vpScale = scale;
			if (type === 'drag') {
				const [px, py] = pos;
				this.vpShift[0] = px;
				this.vpShift[1] = py;
				// if (px <= maxx && px >= 0) this.vpShift[0] = px;
				// if (py <= maxy && py >= 0) this.vpShift[1] = py;
			// } else if (type === 'scale') {
				// this.vpScale = scale;
				// this.vpShift = [0, 0];
			}
			// let px = this.vpShift[0] + shift[0];
			// if (px <= maxx && px >= 0) this.vpShift[0] = px;
			// let py = this.vpShift[1] + shift[1];
			// if (py <= maxy && py >= 0) this.vpShift[1] = py;
		};
		self.addEventListener("message", onMess.bind(this), false);
		requestAnimationFrame(this.autoFrame.bind(this));
	}

    autoFrame(time) {
		this.draw();
		requestAnimationFrame(this.autoFrame.bind(this));
	}

    resize(screen) {
		const { canvas, maxSize} = this;
		canvas.width = canvas.clientWidth = maxSize.width || screen.width;
		canvas.height = canvas.clientHeight = maxSize.height || screen.height;
 console.warn('__resize__', canvas.width, this.gl.canvas.width, twgl.m4);
	}

    init() {
		const {gl} = this;
		// const canvas = this.canvas;
		
			// Create a buffer.
		var positionBuffer = gl.createBuffer();
		this.positionBuffer = positionBuffer;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
			// Put a unit quad in the buffer
		var positions = [
		0, 0,
		0, 1,
		1, 0,
		1, 0,
		0, 1,
		1, 1,
		];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		  // Create a buffer for texture coords
		var texcoordBuffer = gl.createBuffer();
		this.texcoordBuffer = texcoordBuffer;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);

		// Put texcoords in the buffer
		var texcoords = [
		0, 0,
		0, 1,
		1, 0,
		1, 0,
		0, 1,
		1, 1,
		];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

		this.textureInfos = [];
	}

	draw(opt) {
 		const {gl, canvas, vpShift} = this;
		webglUtils.resizeCanvasToDisplaySize(canvas);

 		gl.viewport(0, 0, canvas.width, canvas.height);   // Tell WebGL how to convert from clip space to pixels
 		// gl.viewport(-vpShift[0], -vpShift[1], canvas.width, canvas.height);   // Tell WebGL how to convert from clip space to pixels
 		// gl.viewport(-vpShift[0], -vpShift[1], canvas.width + vpShift[0], canvas.height + vpShift[1]);   // Tell WebGL how to convert from clip space to pixels
 		// gl.viewport(vpShift[0], vpShift[1], rect[2], rect[3]);   // Tell WebGL how to convert from clip space to pixels
    gl.clear(gl.COLOR_BUFFER_BIT);
		let that = this;
		this.textureInfos.forEach(function(drawInfo) {
			if (!drawInfo.texture) return;
		  that.drawImage(
			drawInfo.texture,
			drawInfo.width,
			drawInfo.height,
			drawInfo.x,
			drawInfo.y
			);
		});
	}
	
	_setTex(opt) { // текстура по ndarray
		const {gl, program, canvas} = this;
		let {ndarray, tSize, dx = 0, dy = 0, num} = opt;

		let mipMapping = qualityOptions.mipMapping;
		const imageSize = this.tags.imageSize;			// размеры tiff
		const {width, height} = tSize || {};			// размеры тайла
		const bitmapType = ndarray.constructor.name;	// тип ndarray
		const bitmapChanels = ndarray.length / (width * height);	// сколько каналов
		const DefPars = {
			internalFormat: gl.RGBA,   // format we want in the texture
			srcFormat: gl.RGBA,        // format of data we are supplying
			srcType: gl.UNSIGNED_BYTE, // type of data we are supplying
		};
		let {internalFormat, srcFormat, srcType} = DefPars;
// console.log("bitmapType", bitmapType, bitmapChanels);
		switch(bitmapType) {
			case 'Uint8Array':
				if (bitmapChanels === 3) {
				mipMapping = false;
					internalFormat = gl.RGB8;
					srcFormat = gl.RGB;
				}
				break;
			case 'Uint16Array':
				if (bitmapChanels === 1) {

	gl.pixelStorei( gl.UNPACK_ALIGNMENT, 1);
	// gl.enable(gl.SCISSOR_TEST);
	// gl.scissor(0, 0, 200, 200);
				mipMapping = false;
				let max = 0, min = 0;
					// ndarray1 = new Float32Array(ndarray.length).fill(1);
					ndarray = new Float32Array(ndarray.map(v => {
						let t = v / 65535;
						max = Math.max(max, t);
						min = Math.min(min, t);
						return t;
					}));
// console.log("bitmapType", max,min);
					// ndarray1.forEach((v, i) => ndarray1[i] = v / 32768);
					// ndarray = ndarray1;

					internalFormat = gl.R32F;
					srcFormat = gl.RED;
					srcType = gl.FLOAT;
				}
				break;
			case 'Float32Array':
				mipMapping = false;
				if (bitmapChanels === 1) {
			// gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F,  width, height, 0, gl.RED, gl.FLOAT, bitmap.fArr);
					internalFormat = gl.R32F;
					srcFormat = gl.RED;
					srcType = gl.FLOAT;
				} else {
					internalFormat = gl.RGBA32F;
					srcFormat = gl.RGBA;
					srcType = gl.FLOAT;
				}
				break;
		}
		// gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
		gl.texImage2D(gl.TEXTURE_2D,
			0,										// the largest mip
			internalFormat,							// format we want in the texture
			width, height,							// размеры текстуры
			0,										// бордюр
			srcFormat,								// format of data we are supplying
			srcType,								// type of data we are supplying
			ndarray									// ndarray картинки
		);

	}
	
	Render(opt) { // отрисовка тайла
		const {gl, program, canvas} = this;
		let {ndarray, tSize, dx = 0, dy = 0, num} = opt;
		if (!tSize) {
		// if (!tSize || num > 12) {
			return;	// TODO: по строкам изображения
		}
	
		const tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([0, 0, 255, 255]));    // Fill the texture with a 1x1 blue pixel.

		// let's assume all images are not a power of 2
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

		// gl.bindTexture(gl.TEXTURE_2D, tex);
		this._setTex(opt);
		this.textureInfos.push({
		  width: tSize.width,
		  height: tSize.height,
		  x: dx,
		  y: dy,
		  texture: tex,
		});

// console.log('__ onTile __', num, ndarray);
		// this.drawTile(opt);
	}

  
  // Unlike images, textures do not have a width and height associated
  // with them so we'll pass in the width and height of the texture
	drawImage(tex, texWidth, texHeight, dstX, dstY) {
 		const {gl, program, canvas, vpShift, vpPos} = this;
		gl.bindTexture(gl.TEXTURE_2D, tex);

		gl.useProgram(program);    // Tell WebGL to use our shader program pair

    // Setup the attributes to pull data from our buffers
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.enableVertexAttribArray(this.positionLocation);
		gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
		gl.enableVertexAttribArray(this.texcoordLocation);
		gl.vertexAttribPointer(this.texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    // this matrix will convert from pixels to clip space
		let matrix = m4.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
let scale = this.vpScale;
		const dx = scale * (dstX - vpShift[0] - vpPos[0]);
		const dy = scale * (dstY - vpShift[1] - vpPos[1]);
		const w = scale * texWidth;
		const h = scale * texHeight;
		if (dx < 0) {
 // console.warn('__resize__', dx, dy, texWidth, texHeight, dstX, dstY);
		}

    // this matrix will scale our 1 unit quad
    // from 1 unit to texWidth, texHeight units
		matrix = m4.translate(matrix, dx, dy, 0);    // this matrix will translate our quad to dstX, dstY
		matrix = m4.scale(matrix, w, h, 1);
		gl.uniformMatrix4fv(this.matrixLocation, false, matrix);    // Set the matrix.

		gl.uniform1i(this.textureLocation, 0);    // Tell the shader to get the texture from texture unit 0

		gl.drawArrays(gl.TRIANGLES, 0, 6);    // draw the quad (2 triangles, 6 vertices)
  }

}

const vss = `
	attribute vec4 a_position;
	attribute vec2 a_texcoord;
	uniform mat4 u_matrix;

	varying vec2 v_texcoord;

	void main() {
	   gl_Position = u_matrix * a_position;
	   v_texcoord = a_texcoord;
	}
`;

const fss = `
	precision mediump float;

	varying vec2 v_texcoord;

	uniform sampler2D u_texture;

	void main() {
	   gl_FragColor = texture2D(u_texture, v_texcoord);
	}

`;
