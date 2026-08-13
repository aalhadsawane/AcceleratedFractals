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

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  uv.x *= u_resolution.x / max(u_resolution.y, 1.0);
  float t = u_time;
  float mouseWarp = (u_mouse.x - 0.5) * 1.6;
  float verticalWarp = (u_y - 0.5) * 1.2;
  float angle = t * (0.09 + 0.11 * u_n_norm) + mouseWarp;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 z = rot * (uv * (1.15 + 0.6 * sin(t * 0.17 + verticalWarp)));
  vec2 c = vec2(
    0.48 * cos(t * 0.31 + 3.2 * u_n_norm + verticalWarp),
    0.48 * sin(t * 0.23 - 2.8 * u_n_norm - mouseWarp)
  );
  float maxIter = 140.0 + 260.0 * u_n_norm;
  float iter = 0.0;
  float trap = 10.0;

  for (int i = 0; i < 420; i++) {
    if (iter >= maxIter) break;
    z = vec2(
      z.x * z.x - z.y * z.y,
      2.0 * z.x * z.y
    ) + c;
    z += 0.16 * vec2(
      sin(2.7 * z.y + t * 0.9 + verticalWarp * 5.0),
      cos(2.4 * z.x - t * 0.8 + mouseWarp * 4.0)
    );
    trap = min(trap, length(z));
    if (dot(z, z) > 120.0) break;
    iter += 1.0;
  }

  float normalizedIter = clamp(iter / maxIter, 0.0, 1.0);
  float trapTone = exp(-4.8 * trap);
  float pulse = 0.5 + 0.5 * sin(t * 1.6 + normalizedIter * 28.0 + trap * 9.0);

  vec3 base = neonPalette(normalizedIter + trapTone * 0.45 + pulse * 0.22, t);
  vec3 accent = neonPalette(0.75 + trapTone * 0.35 + u_n_norm * 0.3, t * 0.73);
  vec3 color = mix(base, accent, 0.42 + 0.38 * pulse);
  color *= 0.55 + 1.3 * trapTone + 0.35 * (1.0 - normalizedIter);
  color += 0.16 * neonPalette(fract(trap * 2.2 + t * 0.05), t * 1.2);
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

  stats.textContent = `n=${fibonacciIndex} f(n)=${fib} f(n-1)=${prevFib} warpX=${mouse.x.toFixed(3)} warpY=${yInfluence.toFixed(3)}`

  gl.drawArrays(gl.TRIANGLES, 0, 6)
  requestAnimationFrame(render)
}

requestAnimationFrame(render)
