import { MAX_KERNEL_RADIUS } from "./kernel"

export const QUAD_VERT = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
	v_uv = a_position * 0.5 + 0.5;
	gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// Copies the scalar field into a new grid. Sampling filter decides nearest or stretched.
export const COPY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
in vec2 v_uv;
out vec4 out_color;
void main() {
	out_color = vec4(texture(u_state, v_uv).r, 0.0, 0.0, 1.0);
}
`

// Scalar field in the red channel. Row 0 of the texture is shown at the top.
export const DISPLAY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
in vec2 v_uv;
out vec4 out_color;
void main() {
	vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
	float value = clamp(texture(u_state, uv).r, 0.0, 1.0);
	vec3 low = vec3(0.03, 0.04, 0.08);
	vec3 mid = vec3(0.15, 0.75, 0.72);
	vec3 high = vec3(0.98, 0.93, 0.75);
	vec3 color = mix(low, mid, smoothstep(0.0, 0.45, value));
	color = mix(color, high, smoothstep(0.45, 1.0, value));
	out_color = vec4(color, 1.0);
}
`

// A <- clip(A + dt * G(K * A), 0, 1)
// G(u; μ, σ) = 2 exp(-(u - μ)^2 / (2 σ^2)) - 1
// K is the active creature's ring, uploaded as u_kernel.
// The loop bound matches MAX_KERNEL_RADIUS. Neighbors wrap through the sampler.
export const SIM_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform sampler2D u_kernel;
uniform vec2 u_texelSize;
uniform float u_mu;
uniform float u_sigma;
uniform float u_dt;
uniform float u_radius;
uniform float u_kernelReady;
in vec2 v_uv;
out vec4 out_color;

const int MAX_R = ${MAX_KERNEL_RADIUS};

float growth(float potential) {
	float sigma = max(u_sigma, 1e-4);
	float x = (potential - u_mu) / sigma;
	return 2.0 * exp(-0.5 * x * x) - 1.0;
}

float convolve(vec2 uv) {
	int radius = int(u_radius + 0.5);
	float sum = 0.0;
	for (int dy = -MAX_R; dy <= MAX_R; dy++) {
		for (int dx = -MAX_R; dx <= MAX_R; dx++) {
			if (abs(dx) > radius || abs(dy) > radius) continue;
			float weight = texelFetch(u_kernel, ivec2(dx + radius, dy + radius), 0).r;
			vec2 sampleUv = uv + vec2(float(dx), float(dy)) * u_texelSize;
			sum += weight * texture(u_state, sampleUv).r;
		}
	}
	return sum;
}

void main() {
	float state = texture(u_state, v_uv).r;
	float potential = convolve(v_uv);
	float integrated = clamp(state + u_dt * growth(potential), 0.0, 1.0);
	float next = mix(state, integrated, u_kernelReady);
	out_color = vec4(next, 0.0, 0.0, 1.0);
}
`
