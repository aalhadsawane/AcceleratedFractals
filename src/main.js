import './style.css'

document.querySelector('#app').innerHTML = `
  <p id="stats" aria-live="polite"></p>
  <canvas id="fractal-canvas" aria-label="Interactive fractal canvas"></canvas>
`

const canvas = document.querySelector('#fractal-canvas')
const stats = document.querySelector('#stats')
const gl = canvas.getContext('webgl')

if (!gl) {
  stats.textContent = 'WebGL is unavailable in this browser.'
  throw new Error('WebGL is required')
}

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const fragmentShaderSource = `
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_n_norm;
uniform float u_y;

vec3 neonPalette(float t, float time) {
  vec3 a = vec3(0.25, 0.28, 0.35);
  vec3 b = vec3(0.55, 0.45, 0.65);
  vec3 c = vec3(1.0, 1.15, 1.35);
  vec3 d = vec3(0.02, 0.21, 0.42)
    + vec3(
      0.10 * sin(time * 0.13),
      0.08 * cos(time * 0.09),
      0.06 * sin(time * 0.11)
    );
  return a + b * cos(6.28318 * (c * t + d));
}

float gridLine(float value, float width) {
  float d = abs(fract(value) - 0.5);
  return 1.0 - smoothstep(0.0, width, d);
}

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  uv.x *= u_resolution.x / max(u_resolution.y, 1.0);

  float zoom = mix(0.95, 9.5, pow(u_n_norm, 0.9));
  vec2 center = vec2(
    -0.615 + 0.05 * sin(u_time * 0.11),
    (u_y - 0.5) * 0.85
  );
  vec2 c = uv / zoom + center;
  vec2 z = vec2(0.0);
  float morph = 0.18 + 0.72 * pow(u_n_norm, 0.9);
  float phase = u_time * (0.32 + 0.65 * morph) + u_n_norm * 6.28318;
  vec2 juliaSeed = vec2(-0.72, 0.24) + 0.23 * vec2(cos(phase), sin(phase * 0.87));
  float branchCutoff = mix(0.00002, 0.00028, morph);
  float maxIter = 120.0 + 260.0 * u_n_norm;
  float iter = 0.0;
  bool escaped = false;
  float trap = 10.0;

  for (int i = 0; i < 400; i++) {
    if (iter >= maxIter) break;
    vec2 prevZ = z;
    float zx = z.x * z.x - z.y * z.y + c.x;
    float zy = 2.0 * z.x * z.y + c.y;
    vec2 mandelStep = vec2(zx, zy);
    vec2 juliaStep = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + juliaSeed;
    z = mix(mandelStep, juliaStep, morph);
    trap = min(trap, length(z));
    if (iter > 20.0 && length(z - prevZ) < branchCutoff) {
      iter = maxIter;
      break;
    }
    if (dot(z, z) > 256.0) {
      escaped = true;
      break;
    }
    iter += 1.0;
  }

  float smoothIter = iter;
  if (escaped) {
    float mag = max(dot(z, z), 1.0001);
    smoothIter = iter + 1.0 - log2(log2(mag));
  }

  float t = clamp(smoothIter / maxIter, 0.0, 1.0);
  float trapTone = exp(-7.0 * trap);
  vec2 gridUv = uv * 5.0;
  float majorGrid = max(gridLine(gridUv.x, 0.035), gridLine(gridUv.y, 0.035));
  float minorGrid = max(gridLine(gridUv.x * 2.0, 0.02), gridLine(gridUv.y * 2.0, 0.02));

  vec3 background = vec3(0.03, 0.045, 0.075);
  background += minorGrid * vec3(0.03, 0.045, 0.065);
  background += majorGrid * vec3(0.05, 0.09, 0.14);

  vec3 neon = neonPalette(t + 0.08 * sin(u_time * 0.35), u_time);
  float glow = pow(1.0 - min(t, 0.999), 2.0);
  vec3 fractal = neon * (0.7 + 1.7 * glow);
  float band = 0.5 + 0.5 * cos(t * 55.0 - u_time * 0.9);
  fractal *= 0.85 + 0.25 * band;

  vec3 interior = neonPalette(0.2 + 0.55 * trapTone + 0.2 * u_y, u_time * 0.65);
  interior = interior * (0.45 + 0.55 * trapTone) + background * 0.5;
  vec3 color = mix(
    interior,
    fractal,
    escaped ? 1.0 : 0.2
  );
  color += majorGrid * 0.035;
  color = clamp(color, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}
`

function createShader(type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(message || 'Shader compilation failed')
  }

  return shader
}

function createProgram(vertexSource, fragmentSource) {
  const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(message || 'Program linking failed')
  }

  return program
}

function multiplyMatrix2x2(a, b) {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
  ]
}

function matrixPower2x2(base, exponent) {
  let result = [1, 0, 0, 1]
  let power = base.slice()
  let n = exponent

  while (n > 0) {
    if (n % 2 === 1) {
      result = multiplyMatrix2x2(result, power)
    }
    power = multiplyMatrix2x2(power, power)
    n = Math.floor(n / 2)
  }

  return result
}

function fibonacciPair(n) {
  if (n <= 1) {
    return [n, 0]
  }

  const transform = [1, 1, 1, 0]
  const power = matrixPower2x2(transform, n - 1)
  return [power[0], power[2]]
}

const program = createProgram(vertexShaderSource, fragmentShaderSource)
gl.useProgram(program)

const positionLocation = gl.getAttribLocation(program, 'a_position')
const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
const mouseLocation = gl.getUniformLocation(program, 'u_mouse')
const timeLocation = gl.getUniformLocation(program, 'u_time')
const nNormLocation = gl.getUniformLocation(program, 'u_n_norm')
const yLocation = gl.getUniformLocation(program, 'u_y')

const positionBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
  ]),
  gl.STATIC_DRAW,
)

gl.enableVertexAttribArray(positionLocation)
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

const mouse = { x: 0.5, y: 0.5 }

function resizeCanvasToDisplaySize() {
  const width = Math.floor(window.innerWidth)
  const height = Math.floor(window.innerHeight)

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)
  }
}

window.addEventListener('mousemove', (event) => {
  mouse.x = Math.min(Math.max(event.clientX / window.innerWidth, 0), 1)
  mouse.y = 1 - Math.min(Math.max(event.clientY / window.innerHeight, 0), 1)
})

function render(time) {
  resizeCanvasToDisplaySize()

  const minIndex = 0
  const maxIndex = 48
  const fibonacciIndex = Math.min(
    maxIndex,
    Math.floor(mouse.x * (maxIndex - minIndex + 1)) + minIndex,
  )
  const nNorm = (fibonacciIndex - minIndex) / Math.max(maxIndex - minIndex, 1)
  const yInfluence = (mouse.y - 0.5) * 0.65
  const [fib, prevFib] = fibonacciPair(fibonacciIndex)

  gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
  gl.uniform2f(mouseLocation, mouse.x, mouse.y)
  gl.uniform1f(timeLocation, time * 0.001)
  gl.uniform1f(nNormLocation, nNorm)
  gl.uniform1f(yLocation, mouse.y)

  stats.textContent = `n=${fibonacciIndex} f(n)=${fib} f(n-1)=${prevFib} y=${mouse.y.toFixed(3)} yΔ=${yInfluence.toFixed(3)}`

  gl.drawArrays(gl.TRIANGLES, 0, 6)
  requestAnimationFrame(render)
}

requestAnimationFrame(render)
