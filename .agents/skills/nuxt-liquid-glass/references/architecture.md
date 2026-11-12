# Architecture and Nuxt UI composition

## Choose a rendering tier

| Tier | Technology | Good for | Limitations |
|---|---|---|---|
| Static | Solid/semi-transparent background, border and highlights | High contrast, accessibility, older browsers | No backdrop blur/refraction |
| CSS-enhanced | `backdrop-filter`, gradient highlights, subtle shadow | Headers, floating nav, glass cards | Distorts only by blurring, not physical optics |
| Shader-enhanced | WebGL2, GLSL fragment shader, SDF masks and known source texture | Animated jewel controls, product visuals | Client-only, expensive, cannot inherently sample arbitrary DOM behind it |

Prefer the lowest tier that meets the design. Do not make every form control a GPU canvas.

## Component boundaries

- `GlassSurface.vue`: semantic, SSR-renderable wrapper, theme tokens, slots, fallback, absolutely no browser APIs.
- `GlassRefraction.client.vue`: optional canvas enhancement; accepts `shape`, `intensity`, `backgroundSource` (a pre-established texture or rendered scene), `paused`.
- `useGlassRenderer.ts`: WebGL2 resource lifecycle, shader compilation, resizing, and teardown.
- Nuxt UI continues to provide accessible button, input, dialog, focus, popover, and menu semantics. Do not render critical text *inside* the shader.

Example conceptual composition (not a drop-in renderer):

```vue
<GlassSurface class="relative p-5">
  <ClientOnly>
    <GlassRefraction v-if="enabled" class="pointer-events-none absolute inset-0" />
  </ClientOnly>
  <UButton label="Continue" />
</GlassSurface>
```

Maintain explicit stacking: visual shader layer behind content, and no pointer interception. If the shader must precede DOM content, place it as the first child of a separate content wrapper.

## Visual recipes

- **Glass navigation:** CSS tier; no permanent RAF loop; retain focus outline and scroll behavior.
- **Floating action:** use `UButton` with customized Nuxt UI `ui` slots or a wrapper; keep hit targets at least comfortably touch-sized.
- **Large decorative hero:** WebGL2 can be reasonable; lazily mount under user-visible area and render behind text.
- **Editable form:** prioritize readable fields and solid input backgrounds; glass serves as container only.

## Nuxt integration

1. Inspect `app.vue` and `app/components` patterns.
2. Use `ClientOnly` only for the optional browser-only renderer, not the whole navigation/form.
3. Keep any browser-only modules behind dynamic imports in client lifecycle to avoid evaluating globals on SSR.
4. Keep dimensions stable between SSR and hydration (CSS aspect-ratio or explicit CSS dimensions).
5. Avoid SSR-only OS media queries to decide DOM structure; decide styling in CSS and enhance on mounted client.
