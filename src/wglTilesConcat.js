import * as webglUtils from './glUtils.js';
import m4 from './m4.js';

"use strict";
const qualityOptions = { anisotropicFiltering: true, mipMapping: true, linearFiltering: true };
const _anisoExt = null;//, srcPoints, matrix, glResources, gl;
const contextOpt = {preserveDrawingBuffer: true};

export default class TilesConcat {
	constructor(options) {
		const { canvas, maxSize = {}, programs = [] } = options;
		
		const gl = canvas.getContext("webgl2", contextOpt);	// Get A WebGL context
		this.gl = gl;
		this.canvas = canvas;
		this.tags = options;
		this.progs = {
			tBound: this._setTileBoundsProg(),
		};

		let tfShader = texShader.f;
		if (options.ColorMap) {
			tfShader = getColorMapShader(options.ColorMap);
			// console.warn('__colorMapShader__', tfShader);
		}


		const program = webglUtils.createProgramFromSources(this.gl, [texShader.v, tfShader]);
		this.program = program;

		// look up where the vertex data needs to go.
		this.positionLocation = gl.getAttribLocation(program, "a_position");
		this.texcoordLocation = gl.getAttribLocation(program, "a_texcoord");

		// lookup uniforms
		this.matrixLocation = gl.getUniformLocation(program, "u_matrix");
		this.textureLocation = gl.getUniformLocation(program, "u_texture");

		this._init();
		this.vpScale = 1; // зум viewport
		this.vpPos = [0, 0]; // смещение viewport
		this.vpShift = [0, 0]; // текущее смещение viewport
		const maxx = this.tags.ImageWidth - this.canvas.width;
		const maxy = this.tags.ImageLength - this.canvas.height;
		
		const onMess = (event) => {
			const { type, canvas, pos = [0,0], scale} = event.data;
		// console.log('onMess', type, scale, pos)
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
		requestAnimationFrame(this._autoFrame.bind(this));
	}

    _autoFrame(time) {
		this._draw();
		requestAnimationFrame(this._autoFrame.bind(this));
	}

    resize(screen) {
		const { canvas, maxSize} = this;
		canvas.width = canvas.clientWidth = maxSize.width || screen.width;
		canvas.height = canvas.clientHeight = maxSize.height || screen.height;
 console.warn('__resize__', canvas.width, this.gl.canvas.width, twgl.m4);
	}

    _setTileBoundsProg() {
		const {gl} = this;
		const p = webglUtils.createProgramFromSources(this.gl, [tBoundShader.v, tBoundShader.f]);

		const tBound = {
			p,
			position: gl.getAttribLocation(p, 'position'),
			normal: gl.getAttribLocation(p, 'normal'),
			miter: gl.getAttribLocation(p, 'miter'),
			
			projection: gl.getUniformLocation(p, 'projection'),
			model: gl.getUniformLocation(p, 'model'),
			view: gl.getUniformLocation(p, 'view'),
			thickness: gl.getUniformLocation(p, 'thickness'),
		};
		return tBound;
	}

    _init() {
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

	_draw(opt) {
 		const {gl, canvas, vpShift} = this;
		webglUtils.resizeCanvasToDisplaySize(canvas);

 		gl.viewport(0, 0, canvas.width, canvas.height);   // Tell WebGL how to convert from clip space to pixels
 		// gl.viewport(-vpShift[0], -vpShift[1], canvas.width, canvas.height);   // Tell WebGL how to convert from clip space to pixels
 		// gl.viewport(-vpShift[0], -vpShift[1], canvas.width + vpShift[0], canvas.height + vpShift[1]);   // Tell WebGL how to convert from clip space to pixels
 		// gl.viewport(vpShift[0], vpShift[1], rect[2], rect[3]);   // Tell WebGL how to convert from clip space to pixels
		gl.clear(gl.COLOR_BUFFER_BIT);
		let that = this;
		this.textureInfos.forEach(function(drawInfo) {	// перерисовка тектур
			if (!drawInfo.texture) return;
			that._drawImage(drawInfo.texture, drawInfo.width, drawInfo.height, drawInfo.x, drawInfo.y );
		});
		this._drawTilesGrid(this.progs.tBound);
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
				if (bitmapChanels === 1) {
					mipMapping = false;
					// internalFormat = gl.RGB8; srcFormat = gl.RGB;
					// internalFormat = gl.RGB8; srcFormat = gl.RGB;
					// internalFormat = gl.R8_SNORM; srcFormat = gl.RED; srcType = gl.BYTE;
					internalFormat = gl.R8; srcFormat = gl.RED;
				} else if (bitmapChanels === 3) {
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

	_drawTilesGrid(prog) {
 		const {gl, canvas, vpShift, vpPos} = this;
		
 // console.warn('_drawTilesGrid', vpShift, vpPos);
	}

  // Unlike images, textures do not have a width and height associated
  // with them so we'll pass in the width and height of the texture
	_drawImage(tex, texWidth, texHeight, dstX, dstY) {
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


const tBoundShader = {
	v: `#version 300 es
		precision highp float;

		in vec2 position;
		in vec2 normal;
		in float miter; 
		uniform mat4 projection;
		uniform mat4 model;
		uniform mat4 view;
		uniform float thickness;
		out float edge;

		void main() {
		  edge = sign(miter);
		  vec2 pointPos = position.xy + vec2(normal * thickness/2.0 * miter);
		  gl_Position = projection * view * model * vec4(pointPos, 0.0, 1.0);
		  gl_PointSize = 1.0;
		}
	`,
	f: `#version 300 es
		precision highp float;

		uniform vec3 color;
		uniform float inner;
		in float edge;

		// const vec3 color2 = vec3(0.8);

		out vec4 outColor;
		void main() {
		  float v = 1.0 - abs(edge);
		  v = smoothstep(0.65, 0.7, v*inner); 
		  outColor = mix(vec4(color, 1.0), vec4(0.0), v);
		}
	`,
};


const fMain = `
	void main() {
	   outColor = texture(u_texture, v_texcoord);
	}
`;
const texShader = {
	v: `#version 300 es
		precision highp float;

		in vec4 a_position;
		in vec2 a_texcoord;
		uniform mat4 u_matrix;

		out vec2 v_texcoord;

		void main() {
		   gl_Position = u_matrix * a_position;
		   v_texcoord = a_texcoord;
		}
	`,
	f: `#version 300 es
		precision highp float;

		in vec2 v_texcoord;

		uniform sampler2D u_texture;

		out vec4 outColor;				// we need to declare an output for the fragment shader
${fMain}
	`
};
const getColorMapShader = function(cm) {
	const gs = cm.length / 3, bs = gs * 2;
	let out = [];
	let vec4p = [cm[0] >> 8, cm[gs] >> 8, cm[bs] >> 8, 255];
	for (let i = 0; i < gs; i++) {
		let vec4 = [cm[i] >> 8, cm[i + gs] >> 8, cm[i + bs] >> 8, 255];
		if (vec4[0] !== vec4p[0] || vec4[1] !== vec4p[1] || vec4[2] !== vec4p[2]) {
			out.push(`${out.length ? 'else ':''}if (v < float(${i / 255})) return vec4(${vec4p.map(v => v / 255).join(', ') + '.'});`);
			vec4p = vec4;
		}
	}
	out.push(`return vec4(${vec4p.map(v => v / 255).join('., ') + '.'});`);
	out.unshift('vec4 colorMap(float v) {');
	out.push('}');

	let str = texShader.f;
	str = str.replace(fMain, `
		${out.join('\n')}
	void main() {
	   vec4 tColor = texture(u_texture, v_texcoord);
	   outColor = colorMap(tColor[0]);
	}
	`);
	return str;
}
