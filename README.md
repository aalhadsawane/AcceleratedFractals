# AcceleratedFractals

Interactive fractal website where mouse hover controls a Fibonacci-driven Mandelbrot view rendered on the GPU.

## Mathematical core

The app uses matrix exponentiation to compute Fibonacci pairs in `O(log n)` time:

\[
[f(n), f(n-1)] = \begin{bmatrix}1 & 1\\1 & 0\end{bmatrix}^{n-1} [f(1), f(0)]
\]

The computed `f(n)` and `f(n-1)` values are displayed live on-canvas for the selected index.

The fragment shader uses `n` to morph between Mandelbrot and animated Julia dynamics:

\[
z_{k+1} = (1-\alpha(n))\,(z_k^2 + c) + \alpha(n)\,(z_k^2 + j(t,n))
\]

where `\alpha(n)` grows with normalized `n`, and `j(t,n)` is a time-varying complex seed. This keeps the fractal alive over time while making horizontal movement (`n`) visibly change geometry.

## Controls

- **X position → `n`**  
  Horizontal mouse position maps to `n` in the range **0 to 48**.
- **Y position → `y`**  
  Vertical mouse position maps to a normalized `y` value in **[0, 1]**, and also to a signed offset `yΔ` shown on-canvas.
- **Effect of `y` on fractal**  
  `y` shifts the Mandelbrot center on the imaginary axis and changes interior coloring, so moving vertically changes both structure and color distribution.

## Stability behavior

The view stays centered in a stable region, but structure now evolves over time (instead of only palette drift). A hard delta cutoff is also applied during iteration so extremely tiny branch-like detail is clamped once it falls below a threshold, preventing over-rendering of imperceptible micro-structures.

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
