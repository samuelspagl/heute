# WebGL2 refraction integration: implementation contract

Reference: https://github.com/Muggleee/liquid-glass. It demonstrates Vue 3 + Vite + WebGL2 + GLSL ES 3.0 + signed-distance fields (SDF). It is a **reference demo**, not a verified npm drop-in for Nuxt.

## Precise requirements before code

A convincing refraction shader needs **what is being refracted**. Decide explicitly:

1. **Controlled background image/video** — render it as a texture; straightforward and honest.
2. **Controlled WebGL scene** — render the source scene to an offscreen framebuffer then apply distortion and glass highlights.
3. **Arbitrary live DOM backdrop** — cannot be sampled automatically by WebGL; consider a CSS blur fallback, a dedicated scene render, or an approved DOM capture system (with many limitations). Do not quietly render misleading pixels.

## Lifecycle sketch

```ts
// This is a lifecycle sketch, not a complete renderer.
onMounted(async () => {
  const canvas = canvasRef.value
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true })
  if (!gl) return // CSS fallback remains visible

  // 1. Compile/link shaders; surface compilation errors
  // 2. Setup VAO, vertex buffer, source textures, uniforms
  // 3. Sync canvas dimensions to its CSS rect, capped DPR
  // 4. Optionally animate only while visible and required
  // 5. Handle resize, visibility, webglcontextlost/restored
  // 6. Save explicit cleanup functions
})
onBeforeUnmount(() => {
  // Cancel RAF, disconnect observers, remove listeners,
  // delete GL textures, buffers, shaders, framebuffers, program
})
```

## Renderer responsibilities

- GLSL ES 3.0 (`#version 300 es`) and WebGL2 compatibility.
- Use SDF for rounded-rectangle and circular glass boundaries; anti-alias smoothly near edges.
- Derive apparent refraction via UV offsets sampled from the **known background texture**. Add subtle edge chromatic highlights only if it improves readability.
- Ensure shader resolution uniforms reflect drawing buffer dimensions; consistently handle CSS pixels vs device pixels.
- Recompile/recreate resources on context restoration. Never access `window`, `document`, canvas, or `ResizeObserver` at module evaluation time.
- Cap DPR and buffer dimensions, and degrade to CSS during low-power/reduced-motion constraints.
- If pointer motion changes the shader, throttle to animation frames and disable the effect on touch-only/reduced-motion contexts.

## Testing

- Disable WebGL2, verify all functionality stays visible.
- Reload and navigate in SSR; no hydration mismatch.
- Resize and zoom rapidly; pixels stay aligned and GPU memory does not grow.
- Tab through every control. The canvas must not receive focus or pointer events.
- Test hidden-tab cleanup, color-mode switches, and high-contrast override.
