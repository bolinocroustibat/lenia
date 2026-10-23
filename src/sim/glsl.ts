import { MAX_KERNEL_RADIUS, MAX_SENSORS } from "./kernel"

export const QUAD_VERT = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
	v_uv = a_position * 0.5 + 0.5;
	gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// Copies every channel into a new grid. Sampling filter decides nearest or stretched.
export const COPY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
in vec2 v_uv;
out vec4 out_color;
void main() {
	out_color = texture(u_state, v_uv);
}
`

// Red channel uses the color ramp. Three-channel rules draw red, green, and blue.
// Row 0 of the texture is shown at the top. Empty cells stay dark.
export const DISPLAY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform float u_rgb;
in vec2 v_uv;
out vec4 out_color;
void main() {
	vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
	vec3 state = clamp(texture(u_state, uv).rgb, 0.0, 1.0);
	if (u_rgb > 0.5) {
		out_color = vec4(state, 1.0);
		return;
	}
	float value = state.r;
	vec3 low = vec3(0.03, 0.04, 0.08);
	vec3 mid = vec3(0.15, 0.75, 0.72);
	vec3 high = vec3(0.98, 0.93, 0.75);
	vec3 color = mix(low, mid, smoothstep(0.0, 0.45, value));
	color = mix(color, high, smoothstep(0.45, 1.0, value));
	out_color = vec4(color, 1.0);
}
`

// A <- clip(A + dt * G(K * A), 0, 1)
// Gaussian G: 2 exp(-(u - μ)^2 / (2 σ^2)) - 1
// Polynomial G: 2 max(0, 1 - (u - μ)^2 / (9 σ^2))^4 - 1
// K is the active creature's kernel, uploaded as u_kernel.
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
uniform float u_polynomialGrowth;
in vec2 v_uv;
out vec4 out_color;

const int MAX_R = ${MAX_KERNEL_RADIUS};

float growth(float potential) {
	float sigma = max(u_sigma, 1e-4);
	float x = (potential - u_mu) / sigma;
	if (u_polynomialGrowth > 0.5) {
		float bell = max(0.0, 1.0 - x * x / 9.0);
		bell = bell * bell;
		return bell * bell * 2.0 - 1.0;
	}
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

// A_dest <- clip(A_dest + dt * sum (weight * G(K * A_source)), 0, 1)
// Each sensor has its own ring, its own polynomial growth, and a weight that
// already sums to 1 among the sensors writing into that destination.
// The sensor loop is bounded by MAX_SENSORS; each convolution loops over that
// sensor's own radius, so cost scales with the kernels, not MAX_KERNEL_RADIUS.
export const CHANNEL_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;
uniform sampler2D u_state;
uniform highp sampler2DArray u_kernels;
uniform vec2 u_texelSize;
uniform float u_dt;
uniform float u_atlasRadius;
uniform int u_sensorCount;
uniform float u_mu[${MAX_SENSORS}];
uniform float u_sigma[${MAX_SENSORS}];
uniform float u_weight[${MAX_SENSORS}];
uniform float u_radius[${MAX_SENSORS}];
uniform int u_source[${MAX_SENSORS}];
uniform int u_dest[${MAX_SENSORS}];
in vec2 v_uv;
out vec4 out_color;

const int MAX_SENSORS = ${MAX_SENSORS};

float growth(float potential, float mu, float sigma) {
	float x = (potential - mu) / max(sigma, 1e-4);
	float bell = max(0.0, 1.0 - x * x / 9.0);
	bell = bell * bell;
	return bell * bell * 2.0 - 1.0;
}

float channelOf(vec3 state, int channel) {
	if (channel == 1) return state.g;
	if (channel == 2) return state.b;
	return state.r;
}

float convolve(vec2 uv, int sensor, int radius, int source) {
	int atlas = int(u_atlasRadius + 0.5);
	float sum = 0.0;
	for (int dy = -radius; dy <= radius; dy++) {
		for (int dx = -radius; dx <= radius; dx++) {
			float weight = texelFetch(u_kernels, ivec3(dx + atlas, dy + atlas, sensor), 0).r;
			vec2 sampleUv = uv + vec2(float(dx), float(dy)) * u_texelSize;
			sum += weight * channelOf(texture(u_state, sampleUv).rgb, source);
		}
	}
	return sum;
}

void main() {
	vec3 state = texture(u_state, v_uv).rgb;
	vec3 delta = vec3(0.0);
	for (int sensor = 0; sensor < MAX_SENSORS; sensor++) {
		if (sensor >= u_sensorCount) break;
		int radius = int(u_radius[sensor] + 0.5);
		float change = u_weight[sensor] * growth(
			convolve(v_uv, sensor, radius, u_source[sensor]),
			u_mu[sensor],
			u_sigma[sensor]
		);
		int dest = u_dest[sensor];
		if (dest == 0) delta.r += change;
		else if (dest == 1) delta.g += change;
		else delta.b += change;
	}
	out_color = vec4(clamp(state + u_dt * delta, 0.0, 1.0), 1.0);
}
`
