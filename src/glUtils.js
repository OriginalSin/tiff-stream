
const error = console.log;
  const defaultShaderType = [
    "VERTEX_SHADER",
    "FRAGMENT_SHADER",
  ];

export function setRectangle(gl, x, y, width, height, usage) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2,
  ]), usage || gl.STATIC_DRAW);
}

  /**
   * Resize a canvas to match the size its displayed.
   * @param {HTMLCanvasElement} canvas The canvas to resize.
   * @param {number} [multiplier] amount to multiply by.
   *    Pass in window.devicePixelRatio for native pixels.
   * @return {boolean} true if the canvas was resized.
   * @memberOf module:webgl-utils
   */
export function resizeCanvasToDisplaySize(canvas, multiplier) {
    multiplier = multiplier || 1;
    const width  = canvas.clientWidth  * multiplier | 0;
    const height = canvas.clientHeight * multiplier | 0;
    if (canvas.width !== width ||  canvas.height !== height) {
      canvas.width  = width;
      canvas.height = height;
      return true;
    }
    return false;
  }

  const errorRE = /ERROR:\s*\d+:(\d+)/gi;
  function addLineNumbersWithError(src, log = '') {
    // Note: Error message formats are not defined by any spec so this may or may not work.
    const matches = [...log.matchAll(errorRE)];
    const lineNoToErrorMap = new Map(matches.map((m, ndx) => {
      const lineNo = parseInt(m[1]);
      const next = matches[ndx + 1];
      const end = next ? next.index : log.length;
      const msg = log.substring(m.index, end);
      return [lineNo - 1, msg];
    }));
    return src.split('\n').map((line, lineNo) => {
      const err = lineNoToErrorMap.get(lineNo);
      return `${lineNo + 1}: ${line}${err ? `\n\n^^^ ${err}` : ''}`;
    }).join('\n');
  }

  /**
   * Creates a program, attaches shaders, binds attrib locations, links the
   * program and calls useProgram.
   * @param {WebGLShader[]} shaders The shaders to attach
   * @param {string[]} [opt_attribs] An array of attribs names. Locations will be assigned by index if not passed in
   * @param {number[]} [opt_locations] The locations for the. A parallel array to opt_attribs letting you assign locations.
   * @param {module:webgl-utils.ErrorCallback} opt_errorCallback callback for errors. By default it just prints an error to the console
   *        on error. If you want something else pass an callback. It's passed an error message.
   * @memberOf module:webgl-utils
   */
	function createProgram(
      gl, shaders, opt_attribs, opt_locations, opt_errorCallback) {
    const errFn = opt_errorCallback || error;
    const program = gl.createProgram();
    shaders.forEach(function(shader) {
      gl.attachShader(program, shader);
    });
    if (opt_attribs) {
      opt_attribs.forEach(function(attrib, ndx) {
        gl.bindAttribLocation(
            program,
            opt_locations ? opt_locations[ndx] : ndx,
            attrib);
      });
    }
    gl.linkProgram(program);

    // Check the link status
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
        // something went wrong with the link
        const lastError = gl.getProgramInfoLog(program);
        errFn(`Error in program linking: ${lastError}\n${
          shaders.map(shader => {
            const src = addLineNumbersWithError(gl.getShaderSource(shader));
            const type = gl.getShaderParameter(shader, gl.SHADER_TYPE);
            return `${glEnumToString(gl, type)}:\n${src}`;
          }).join('\n')
        }`);

        gl.deleteProgram(program);
        return null;
    }
    return program;
  }

  /**
   * Loads a shader.
   * @param {WebGLRenderingContext} gl The WebGLRenderingContext to use.
   * @param {string} shaderSource The shader source.
   * @param {number} shaderType The type of shader.
   * @param {module:webgl-utils.ErrorCallback} opt_errorCallback callback for errors.
   * @return {WebGLShader} The created shader.
   */
  function loadShader(gl, shaderSource, shaderType, opt_errorCallback) {
    const errFn = opt_errorCallback || error;
    // Create the shader object
    const shader = gl.createShader(shaderType);

    // Load the shader source
    gl.shaderSource(shader, shaderSource);

    // Compile the shader
    gl.compileShader(shader);

    // Check the compile status
    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      // Something went wrong during compilation; get the error
      const lastError = gl.getShaderInfoLog(shader);
      errFn(`Error compiling shader: ${lastError}\n${addLineNumbersWithError(shaderSource, lastError)}`);
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }
  /**
   * Creates a program from 2 sources.
   *
   * @param {WebGLRenderingContext} gl The WebGLRenderingContext
   *        to use.
   * @param {string[]} shaderSourcess Array of sources for the
   *        shaders. The first is assumed to be the vertex shader,
   *        the second the fragment shader.
   * @param {string[]} [opt_attribs] An array of attribs names. Locations will be assigned by index if not passed in
   * @param {number[]} [opt_locations] The locations for the. A parallel array to opt_attribs letting you assign locations.
   * @param {module:webgl-utils.ErrorCallback} opt_errorCallback callback for errors. By default it just prints an error to the console
   *        on error. If you want something else pass an callback. It's passed an error message.
   * @return {WebGLProgram} The created program.
   * @memberOf module:webgl-utils
   */
export function createProgramFromSources(
      gl, shaderSources, opt_attribs, opt_locations, opt_errorCallback) {
    const shaders = [];
    for (let ii = 0; ii < shaderSources.length; ++ii) {
      shaders.push(loadShader(
          gl, shaderSources[ii], gl[defaultShaderType[ii]], opt_errorCallback));
    }
    return createProgram(gl, shaders, opt_attribs, opt_locations, opt_errorCallback);
}

const getRGB = function(i, cm, gs, bs) {
	const r = (cm[i] >> 8) / 255, g = (cm[i + gs] >> 8) / 255, b = (cm[i + bs] >> 8) / 255;
	const a = getAlpha({r, g, b});
	return {r, g, b, a};
}

const getVec4 = function(p) {
	return 'vec4(' + [p.r.toFixed(10), p.g.toFixed(10), p.b.toFixed(10)].join(', ') + ', ' + p.a.toFixed(1) + ')';
}

const getAlpha = function(p) {
	// if (p.b === 1)
	// return 1;
	const ev = (p.r + p.g + p.b) / 3;
	return p.r === ev && p.g === ev && p.b === ev ? 0.4 : 0.9;
	// return p.r === ev && p.g === ev && p.b === ev ? 0.2 : 1;
}
export function getColorMapShader(cm, fMain, fss) {
	const gs = cm.length / 3, bs = gs * 2;
	let rArr = [];
	let rArr1 = [];
	let out = [];
	// let alpha = 1;
	// let vec4p = [(cm[0] >> 8) / 255, (cm[gs] >> 8) / 255, (cm[bs] >> 8) / 255, alpha];
	let pLine = getRGB(0, cm, gs, bs);
	let i = 0;
	for (; i < gs; i++) {
		let cLine = getRGB(i, cm, gs, bs);
		if (pLine.r !== cLine.r || pLine.g !== cLine.g || pLine.b !== cLine.b || pLine.a !== cLine.a) {
			rArr.push({i, ...pLine});
		}
			// rArr1.push({i, ...pLine});
		pLine = cLine;
	}
	const out1 = 'vec4 colorMap(float v) {\n' + rArr.map(p => {
		return '	if (v < ' + (p.i / 255).toFixed(10) + ') return ' + getVec4(p) + ';';
	}).join('\n	else ') + '\n	return ' + getVec4(pLine) + ';\n}';
// console.log('rArr ', rArr1, out1);

	let str = fss;
	str = str.replace(fMain, `
		${out1}
	void main() {
	   vec4 tColor = texture(u_texture, v_texcoord);
	   outColor = colorMap(tColor[0]);
	}
	`);
	return str;
}

export function createFramebufferTexture(gl, size = {}) {
	let fbo = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

	let renderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);

	let texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.width || 256, size.height || 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	return {fbo, texture};
};
export function bindFrambufferAndSetViewport(gl, fb, width, height) {
   gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
   gl.viewport(0, 0, width, height);
}
