---
name: nuxt-liquid-glass
description: Build accessible liquid-glass, frosted-glass, and optional WebGL2 refraction surfaces for Nuxt 4, Vue 3, and Nuxt UI. Use when implementing Apple-like glass effects, translucent navigation, interactive refractive cards, shader backgrounds, or migrating Muggleee/liquid-glass ideas into an SSR Nuxt project.
compatibility: Nuxt 4, Vue 3, Nuxt UI 4 optional; WebGL2 effects require a supporting browser and client-side lifecycle.
metadata:
  version: "1.0.0"
  updated: "2026-11-10"
---

# Nuxt Liquid Glass

Create premium, legible, responsive, and **progressively enhanced** glass surfaces. Separate the **CSS-first translucent surface** from true **refractive rendering**. `backdrop-filter: blur(...)` is not optical refraction; a WebGL2 shader is a separate optional enhancement.

## When this skill should activate

Use it for Nuxt/Vue requests mentioning liquid glass, frosted panels, refraction, shader UI, translucent glass, glass buttons, floating navigation, or the `Muggleee/liquid-glass` reference. Do not load WebGL for ordinary solid cards.

## Mandatory working sequence

1. **Inspect the app:** Nuxt and Nuxt UI versions, `app/` folder layout, existing theme tokens, color-mode support, components, interaction and reduced-motion conventions. Prefer project styles over new design systems.
2. **Identify the visual requirement:** Choose (A) a lightweight CSS-first overlay or (B) genuine dynamic refraction. Ask only if functionality really depends on the distinction; otherwise start with CSS-first and leave a renderer hook.
3. **Build a stable semantic component:** Native `<button>`, `<a>`, or Nuxt UI control for actions; a plain surface is decorative. Do not use clickable `<div>` as a button. Preserve readable contrast and keyboard focus.
4. **Make SSR safe:** Render meaningful HTML/CSS on server and initial client render. Access `window`, `document`, `ResizeObserver`, canvas and WebGL **only in `onMounted`/client-only code**. Avoid hydration-altering random values and viewport reads in setup.
5. **Progressively enhance:** Check WebGL2 and extensions actually used, device pixel ratio, reduced-motion/transparency preference, power/viewport constraints. If unsupported, keep a complete static appearance and interaction.
6. **Integrate Nuxt UI:** Prefer wrapping real `UButton`, `UNavigationMenu`, `UCard`, etc. Keep overlay/pointer effects behind content; do not recreate Nuxt UI accessibility behavior.
7. **Check performance:** Cap DPR (e.g. 2), use `ResizeObserver`, pause rendering when hidden/offscreen, dispose shader/buffers/textures/RAF on unmount, and avoid continuous animation for static glass.
8. **Test:** SSR build, hydration, light/dark themes, keyboard and screen-reader navigation, high contrast, touch/low-end mobile, reduced-motion, and WebGL-disabled browser.

## Starter implementation

`assets/GlassSurface.vue` is an original, **CSS-only fallback**; copy it to your Nuxt project's `app/components/GlassSurface.vue` (adjust for your structure). Example:

```vue
<template>
  <GlassSurface strength="medium" class="p-5">
    <div class="flex items-center justify-between gap-4">
      <strong>Workspace</strong>
      <UButton label="Open" icon="i-lucide-arrow-up-right" />
    </div>
  </GlassSurface>
</template>
```

The fallback is deliberately not labelled as a WebGL implementation. For actual refraction, read [WebGL integration](references/webgl-integration.md) and implement a separate `ClientOnly` enhancement layer. Read [architecture](references/architecture.md) for component responsibilities and [accessibility and performance](references/accessibility-performance.md) for release gates.

## WebGL2 design constraints

- `Muggleee/liquid-glass` is a Vue 3/Vite **demo application**, not a documented drop-in Nuxt module. Use it as an architectural/visual reference, not as an assumed importable npm API.
- Real screen-content refraction needs a source texture. A fragment shader cannot automatically sample arbitrary live DOM pixels behind an element. Specify a background texture, an explicitly rendered scene, or another honest capture pipeline; don't promise seamless refraction of all underlying DOM.
- Do not import demo source without examining its license, attribution requirements, shader dependencies, and browser/runtime assumptions.
- Put canvas behind DOM content (`pointer-events: none`, suitable stacking and clipping), then handle reflow/resizing accurately.
- Avoid expensive full-screen blur passes and framebuffer reads for every glass card; evaluate if CSS is visually sufficient.

## Done criteria

- [ ] Clear distinction between CSS-only translucency and real shader refraction
- [ ] Server HTML and first client render match; no browser globals on SSR
- [ ] Buttons/links accessible via keyboard and assistive tech
- [ ] Text and controls pass relevant contrast and focus checks
- [ ] Works with color modes and reduced-motion/transparency requests
- [ ] WebGL failure leaves a usable non-WebGL design
- [ ] No canvas leaks, runaway RAF loops, giant textures, or unnecessary rerenders
- [ ] Run existing project's lint/typecheck/build/test scripts

## Sources

See [source notes](references/sources.md). Verify the project's versions and current APIs before implementing.
