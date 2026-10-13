export function compileShader(
	gl: WebGL2RenderingContext,
	type: number,
	source: string,
): WebGLShader {
	const shader = gl.createShader(type)
	if (!shader) throw new Error("Could not create shader")
	gl.shaderSource(shader, source)
	gl.compileShader(shader)
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader) ?? "unknown error"
		gl.deleteShader(shader)
		const kind = type === gl.VERTEX_SHADER ? "Vertex" : "Fragment"
		throw new Error(`${kind} shader: ${log}`)
	}
	return shader
}

export function createProgram(
	gl: WebGL2RenderingContext,
	vertSource: string,
	fragSource: string,
): WebGLProgram {
	const vert = compileShader(gl, gl.VERTEX_SHADER, vertSource)
	const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSource)
	const program = gl.createProgram()
	if (!program) throw new Error("Could not create program")
	gl.attachShader(program, vert)
	gl.attachShader(program, frag)
	gl.linkProgram(program)
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const log = gl.getProgramInfoLog(program) ?? "unknown error"
		gl.deleteProgram(program)
		gl.deleteShader(vert)
		gl.deleteShader(frag)
		throw new Error(`Program link: ${log}`)
	}
	gl.detachShader(program, vert)
	gl.detachShader(program, frag)
	gl.deleteShader(vert)
	gl.deleteShader(frag)
	return program
}

export function uniform(
	gl: WebGL2RenderingContext,
	program: WebGLProgram,
	name: string,
): WebGLUniformLocation {
	const location = gl.getUniformLocation(program, name)
	if (location === null) {
		throw new Error(`Uniform "${name}" was removed from the linked program`)
	}
	return location
}
