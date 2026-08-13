import './style.css'

document.querySelector('#app').innerHTML = `
  <div id="overlay">
    <h1>Accelerated Fibonacci Fractals</h1>
    <p>
      Move your cursor across the canvas. The Fibonacci index comes from mouse X and
      is calculated with matrix exponentiation.
    </p>
    <p id="stats" aria-live="polite"></p>
  </div>
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
uniform float u_fib;
uniform float u_prevFib;

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  uv.x *= u_resolution.x / max(u_resolution.y, 1.0);

  float fibNorm = log(max(u_fib, 1.0)) / 12.0;
  float zoom = 0.8 + fibNorm;
  vec2 c = vec2(
    (u_mouse.x - 0.5) * 0.8 + 0.12 * sin(u_time * 0.2),
    (u_mouse.y - 0.5) * 0.8 + 0.12 * cos(u_time * 0.18)
  );

  vec2 z = uv / zoom;
  float maxIter = 30.0 + mod(u_prevFib, 70.0);
  float iter = 0.0;

  for (int i = 0; i < 160; i++) {
    if (iter >= maxIter) break;
    vec2 z2 = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    z = z2;
    if (dot(z, z) > 12.0) break;
    iter += 1.0;
  }

  float t = iter / maxIter;
  float pulse = 0.15 * sin(u_time + t * 7.0);
  vec3 color = vec3(
    0.1 + 0.9 * t + pulse,
    0.12 + 0.5 * (1.0 - t),
    0.25 + 0.9 * (1.0 - t * t)
  );
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
const fibLocation = gl.getUniformLocation(program, 'u_fib')
const prevFibLocation = gl.getUniformLocation(program, 'u_prevFib')

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

  const fibonacciIndex = Math.max(2, Math.floor(mouse.x * 42) + 2)
  const [fib, prevFib] = fibonacciPair(fibonacciIndex)

  gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
  gl.uniform2f(mouseLocation, mouse.x, mouse.y)
  gl.uniform1f(timeLocation, time * 0.001)
  gl.uniform1f(fibLocation, fib)
  gl.uniform1f(prevFibLocation, prevFib)

  stats.textContent = `n=${fibonacciIndex}, f(n)=${fib}, f(n-1)=${prevFib}`

  gl.drawArrays(gl.TRIANGLES, 0, 6)
  requestAnimationFrame(render)
}

requestAnimationFrame(render)
