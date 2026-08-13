# AcceleratedFractals

Interactive fractal website where mouse hover controls a Fibonacci-driven, continuously animated fractal rendered on the GPU.

## Mathematical core

The app uses matrix exponentiation to compute Fibonacci pairs in `O(log n)` time:

\[
[f(n), f(n-1)] = \begin{bmatrix}1 & 1\\1 & 0\end{bmatrix}^{n-1} [f(1), f(0)]
\]

The computed `f(n)` and `f(n-1)` values are displayed live on-canvas for the selected index.

The fragment shader uses `n`, `x`, `y`, and time to drive a constantly changing nonlinear recurrence:

\[
z_{k+1} = z_k^2 + c(t,n,x,y) + w(z_k,t,x,y)
\]

where `c(t,n,x,y)` is a time-varying complex driver and `w(z_k,t,x,y)` is a sinusoidal warp term. This removes static Mandelbrot panning behavior and keeps the entire frame in active motion.

## Controls

- **X position → `n`**  
  Horizontal mouse position maps to `n` in the range **0 to 48**.
- **Y position → `y`**  
  Vertical mouse position maps to a normalized `y` value in **[0, 1]**, and also to a signed offset `yΔ` shown on-canvas.
- **Effect of `y` on fractal**  
  `y` changes warp intensity and animation phase so vertical movement continuously reshapes the flow and palette.

## Stability behavior

The frame is always filled by the fractal shader and continuously evolves over time. Coloring is orbit-trap driven so the screen never falls back to a blank grid.

## Rendering and acceleration

- **OpenGL path (web):** browser GPU rendering via **WebGL** (OpenGL ES class API).
- **Shader language:** **GLSL** fragment shader for per-pixel fractal iteration and color mapping.
- **SIMD-friendly core math:** matrix multiplication is implemented with a compact 2x2 representation that is easy to port to SIMD/C++.
- **Build/dev tooling:** **Vite** + modern **JavaScript (ES modules)**.
- **CUDA note:** CUDA is not available in browser runtime on Vercel; WebGL provides GPU acceleration for deployment.

## Run locally

```bash
npm install
npm run dev
```

## Build for deployment (Vercel)

```bash
npm run build
```
