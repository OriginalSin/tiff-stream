import * as glUtils from './glUtils.js';

"use strict";

export default class TilesConcat {
	constructor(opt) {
		const { canvas, screen, programs = [], tags } = opt;
		const { imageSize } = tags;
		
		canvas.width = imageSize.width, canvas.height = imageSize.height;
		this.gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true});	// Get A WebGL context
		this.canvas = canvas;
		this.tags = tags;

		// this.bitmapSize = {
			// ...imageSize,
			// tSize: {width: tags.TileWidth, height: tags.TileLength},
			// w: Math.sqrt(tags.TileByteCounts.length)
		// };
		this.program = glUtils.createProgramFromSources(this.gl, [vss, fss]);
		this.init();
	}

    resize(screen) {
		const { canvas } = this;
		canvas.width = canvas.clientWidth = screen.width, canvas.height = canvas.clientHeight = screen.height;
 // console.warn('__resize__', canvas.width, this.gl.canvas.width, twgl.m4);
	}

    init() {
		const {gl, program} = this;
		const canvas = this.canvas;

		// look up where the vertex data needs to go.
		const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
		const texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");

		const vao = gl.createVertexArray();		// Create a vertex array object (attribute state)
		gl.bindVertexArray(vao);				// and make it the one we're currently working with

		const positionBuffer = gl.createBuffer();	// Create a buffer and put a single pixel space rectangle in it (2 triangles)

		gl.enableVertexAttribArray(positionAttributeLocation);  // Turn on the attribute

		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);	// Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)

		gl.vertexAttribPointer(		// Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
		  positionAttributeLocation,
		  2,			// 2 components per iteration
		  gl.FLOAT,		// the data is 32bit floats
		  false,		// don't normalize the data
		  0,			// stride 0 = move forward size * sizeof(type) each iteration to get the next position
		  0				// offset = 0; // start at the beginning of the buffer
		);

		const texCoordBuffer = gl.createBuffer();	// provide texture coordinates for the rectangle.
		gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		  0.0,  0.0,
		  1.0,  0.0,
		  0.0,  1.0,
		  0.0,  1.0,
		  1.0,  0.0,
		  1.0,  1.0,
		]), gl.STATIC_DRAW);

		gl.enableVertexAttribArray(texCoordAttributeLocation);	// Turn on the attribute

		gl.vertexAttribPointer(		// Tell the attribute how to get data out of texCoordBuffer (ARRAY_BUFFER)
		  texCoordAttributeLocation,
			2,          // size: 2 components per iteration
			gl.FLOAT,   // type: the data is 32bit floats
			false,		// normalize don't normalize the data
			0,        	// stride: 0 = move forward size * sizeof(type) each iteration to get the next position
			0        	// offset: start at the beginning of the buffer
		  );

		const texture = gl.createTexture();	// Create a texture.
		gl.activeTexture(gl.TEXTURE0 + 0);	// make unit 0 the active texture uint (ie, the unit all other texture commands will affect
		gl.bindTexture(gl.TEXTURE_2D, texture); // Bind it to texture unit 0' 2D bind point

		// Set the parameters so we don't need mips and so we're not filtering
		// and we don't repeat at the edges
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	 
		glUtils.resizeCanvasToDisplaySize(canvas);

		gl.viewport(0, 0, canvas.width, canvas.height);  // Tell WebGL how to convert from clip space to pixels

		gl.useProgram(program);		// Tell it to use our program (pair of shaders)

		// Pass in the canvas resolution so we can convert from pixels to clipspace in the shader
		const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
		gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

		// Tell the shader to get the texture from texture unit 0
		const imageLocation = gl.getUniformLocation(program, "u_image");
		gl.uniform1i(imageLocation, 0);

		// Bind the position buffer so gl.bufferData that will be called in setRectangle puts data in the position buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	}

	Render(opt) { // отрисовка тайла
		const {gl, program} = this;
		const {ndarray, tSize, dx = 0, dy = 0} = opt;
		if (!tSize) {
			return;	// TODO: по строкам изображения
		}
		const {width, height} = tSize || {};			// размеры тайла
		const bitmapType = ndarray.constructor.name;	// тип ndarray
		const bitmapChanels = ndarray.length / (width * height);	// сколько каналов
		const DefPars = {
			internalFormat: gl.RGBA,   // format we want in the texture
			srcFormat: gl.RGBA,        // format of data we are supplying
			srcType: gl.UNSIGNED_BYTE, // type of data we are supplying
		};
		let {internalFormat, srcFormat, srcType} = DefPars;
		switch(bitmapType) {
			case 'Uint8Array':
				if (bitmapChanels === 3) {
					internalFormat = gl.RGB8;
					srcFormat = gl.RGB;
					// gl.pixelStorei( gl.UNPACK_ALIGNMENT, 1);

				}
				break;
			case 'Float32Array':
				// mipMapping = false;
				// internalFormat = gl.RGBA32F;
				// format = gl.RGBA;
				// type = gl.FLOAT;
				break;
		}
		gl.texImage2D(gl.TEXTURE_2D,
			0,										// the largest mip
			internalFormat,							// format we want in the texture
			width, height,							// размеры текстуры
			0,										// бордюр
			srcFormat,								// format of data we are supplying
			srcType,								// type of data we are supplying
			ndarray									// ndarray картинки
		);

		glUtils.setRectangle(gl, 0, 0, width, height);	// Set a rectangle the same size as the image.
	   
		var matrixLocation = gl.getUniformLocation(program, "u_matrix");
		gl.uniformMatrix3fv(matrixLocation, false, [		// Set the matrix.
		  1,	0,	0,
		  0,	1,	0,
		  dx,	dy, 1,
		]);
		gl.drawArrays(gl.TRIANGLES, 0, 6);		// Draw the rectangle.
		// gl.flush();		// очищает команды буфера.
	}

}

const vss = `#version 300 es
	in vec2 a_position;			// an attribute is an input (in) to a vertex shader.
	in vec2 a_texCoord;			// It will receive data from a buffer
	uniform vec2 u_resolution;	// Used to pass in the resolution of the canvas
	out vec2 v_texCoord;		// Used to pass the texture coordinates to the fragment shader
	uniform mat3 u_matrix;		// A matrix to transform the positions by

	void main() {
		vec2 position = (u_matrix * vec3(a_position, 1)).xy;	// Multiply the position by the matrix.
		vec2 zeroToOne = position / u_resolution;				// convert the position from pixels to 0.0 to 1.0
		vec2 zeroToTwo = zeroToOne * 2.0;						// convert from 0->1 to 0->2
		vec2 clipSpace = zeroToTwo - 1.0;						// convert from 0->2 to -1->+1 (clipspace)

		gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
		  // pass the texCoord to the fragment shader
		  // The GPU will interpolate this value between points.
		v_texCoord = a_texCoord;
	}
`;

const fss = `#version 300 es
	precision highp float;

	uniform sampler2D u_image;		// our texture
	in vec2 v_texCoord;				// the texCoords passed in from the vertex shader.
	out vec4 outColor;				// we need to declare an output for the fragment shader

	void main() {
	  outColor = texture(u_image, v_texCoord);
	}
`;
