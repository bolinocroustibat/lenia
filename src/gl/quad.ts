const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])

export class FullscreenQuad {
	private readonly buffer: WebGLBuffer

	constructor(private readonly gl: WebGL2RenderingContext) {
		const buffer = gl.createBuffer()
		if (!buffer) throw new Error("Could not create quad buffer")
		this.buffer = buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
		gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW)
	}

	draw(program: WebGLProgram): void {
		const gl = this.gl
		const location = gl.getAttribLocation(program, "a_position")
		if (location < 0) throw new Error('Attribute "a_position" is missing')
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
		gl.enableVertexAttribArray(location)
		gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
		gl.drawArrays(gl.TRIANGLES, 0, 6)
	}

	dispose(): void {
		this.gl.deleteBuffer(this.buffer)
	}
}
