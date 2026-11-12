# Accessibility and performance release gates

## Accessibility

- Use semantic HTML and Nuxt UI controls. Glass must not replace button, link, menu, or dialog semantics.
- Check normal text at WCAG AA contrast (commonly 4.5:1; 3:1 for large text), including over the brightest and darkest backdrop conditions. For unknown backdrops, add a more opaque backing behind text.
- Preserve a visible keyboard focus ring; avoid blend effects masking it.
- Honor `prefers-reduced-motion`. Consider `prefers-reduced-transparency` (where supported) and `prefers-contrast: more`, with solid backgrounds.
- Avoid continuous parallax or cursor tracking that impairs motor accessibility. Decorative canvas should be `aria-hidden="true"` and not focusable.
- Glass overlays must not block scrolling, taps, form field text selection, tooltips, or drag interactions.

## Performance

- Prefer CSS tier on pages with many glass elements.
- For a shader, avoid one WebGL context per card; share a composited renderer where practical.
- Cap device-pixel ratio (e.g. 2) and render only when visible/dirty; pause on `document.visibilityState === 'hidden'`.
- Unregister `ResizeObserver`, intersection observers, event listeners and animation frames on unmount; release GPU resources.
- Measure real mobile GPU load. Do not assume `backdrop-filter` or live full-frame effects are free.

## Nuxt UI checks

Test overlays, popovers, tooltips, menus, `UButton`, and input focus states **above** the effect. Ensure the GL layer has `pointer-events: none` and appropriate z-index. When a panel hosts a form, give inputs a stronger fill than the surrounding glass.
