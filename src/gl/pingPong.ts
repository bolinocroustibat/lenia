/**
 * Two float textures and their framebuffers.
 * A step reads `readTexture` and writes `writeFramebuffer`, then `swap()` exchanges them.
 * State is R32F so cell values are not quantized to 8 bits.
 */
export class PingPong {
	private readIndex = 0
	private readonly textures: [WebGLTexture, WebGLTexture]
	private readonly framebuffers: [WebGLFramebuffer, WebGLFramebuffer]

	constructor(
		private readonly gl: WebGL2RenderingContext,
		readonly width: number,
		readonly height: number,
	) {
		this.textures = [this.createTexture(), this.createTexture()]
		this.framebuffers = [
			this.createFramebuffer(this.textures[0]),
			this.createFramebuffer(this.textures[1]),
		]
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.bindTexture(gl.TEXTURE_2D, null)
	}

	get readTexture(): WebGLTexture {
		return this.textures[this.readIndex]
	}

	get writeFramebuffer(): WebGLFramebuffer {
		return this.framebuffers[1 - this.readIndex]
	}

	swap(): void {
		this.readIndex = 1 - this.readIndex
	}

	upload(field: Float32Array): void {
		const cellCount = this.width * this.height
		if (field.length !== cellCount) {
			throw new Error(
				`Field length ${field.length} does not match ${this.width}×${this.height}`,
			)
		}
		const gl = this.gl
		gl.bindTexture(gl.TEXTURE_2D, this.readTexture)
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
		gl.texSubImage2D(
			gl.TEXTURE_2D,
			0,
			0,
			0,
			this.width,
			this.height,
			gl.RED,
			gl.FLOAT,
			field,
		)
		gl.bindTexture(gl.TEXTURE_2D, null)
	}

	dispose(): void {
		const gl = this.gl
		for (const texture of this.textures) gl.deleteTexture(texture)
		for (const framebuffer of this.framebuffers)
			gl.deleteFramebuffer(framebuffer)
	}

	private createTexture(): WebGLTexture {
		const gl = this.gl
		const texture = gl.createTexture()
		if (!texture) throw new Error("Could not create state texture")
		gl.bindTexture(gl.TEXTURE_2D, texture)
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.R32F,
			this.width,
			this.height,
			0,
			gl.RED,
			gl.FLOAT,
			null,
		)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
		return texture
	}

	private createFramebuffer(texture: WebGLTexture): WebGLFramebuffer {
		const gl = this.gl
		const framebuffer = gl.createFramebuffer()
		if (!framebuffer) throw new Error("Could not create framebuffer")
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			texture,
			0,
		)
		const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
		if (status !== gl.FRAMEBUFFER_COMPLETE) {
			throw new Error(
				`Framebuffer incomplete (${framebufferStatus(gl, status)})`,
			)
		}
		return framebuffer
	}
}

export interface FieldSamplers {
	nearest: WebGLSampler
	linear: WebGLSampler
}

/** Nearest keeps simulation cells exact. Linear is only for stretching the field on screen. */
export function createFieldSamplers(gl: WebGL2RenderingContext): FieldSamplers {
	const linear = gl.getExtension("OES_texture_float_linear")
		? gl.LINEAR
		: gl.NEAREST
	return {
		nearest: createSampler(gl, gl.NEAREST),
		linear: createSampler(gl, linear),
	}
}

export function bindField(
	gl: WebGL2RenderingContext,
	unit: number,
	texture: WebGLTexture,
	sampler: WebGLSampler,
): void {
	gl.activeTexture(gl.TEXTURE0 + unit)
	gl.bindTexture(gl.TEXTURE_2D, texture)
	gl.bindSampler(unit, sampler)
}

function createSampler(
	gl: WebGL2RenderingContext,
	filter: number,
): WebGLSampler {
	const sampler = gl.createSampler()
	if (!sampler) throw new Error("Could not create sampler")
	gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, filter)
	gl.samplerParameteri(sampler, gl.TEXTURE_MAG_FILTER, filter)
	gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_S, gl.REPEAT)
	gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_T, gl.REPEAT)
	return sampler
}

function framebufferStatus(gl: WebGL2RenderingContext, status: number): string {
	switch (status) {
		case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
			return "incomplete attachment"
		case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
			return "missing attachment"
		case gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:
			return "incomplete multisample"
		case gl.FRAMEBUFFER_UNSUPPORTED:
			return "unsupported"
		default:
			return `0x${status.toString(16)}`
	}
}
