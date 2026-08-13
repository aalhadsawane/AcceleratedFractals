# AcceleratedFractals

Interactive fractal website where mouse hover controls a Fibonacci-driven fractal field rendered on the GPU.

## Mathematical core

The app uses matrix exponentiation to compute Fibonacci pairs in `O(log n)` time:

\[
[f(n), f(n-1)] = \begin{bmatrix}1 & 1\\1 & 0\end{bmatrix}^{n-1} [f(1), f(0)]
\]

The computed `f(n)` and `f(n-1)` values drive fractal zoom, iterations, and color response.

## Rendering and acceleration

- **OpenGL path (web):** browser GPU rendering via **WebGL** (OpenGL ES class API).
- **SIMD-friendly core math:** matrix multiplication is implemented with a compact 2x2 representation that is easy to port to SIMD/C++.
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
