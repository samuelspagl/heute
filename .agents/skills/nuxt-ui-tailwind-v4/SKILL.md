---
name: nuxt-ui-tailwind-v4
description: Configure, theme, troubleshoot, and extend Nuxt UI v4 with Tailwind CSS v4 in Nuxt 4. Use for @nuxt/ui setup, @theme palettes, app.config.ts semantic colors, CSS tokens, light/dark themes, Reka UI component slots, styling overrides, and migrations from @nuxtjs/tailwindcss or Tailwind v3.
compatibility: Nuxt 4, @nuxt/ui v4, tailwindcss v4; use the current Nuxt UI documentation when version differs.
metadata:
  version: "1.0.0"
  updated: "2026-11-10"
---

# Nuxt UI v4 + Tailwind CSS v4

Set up **one coherent CSS-first design system**, not two competing Tailwind pipelines. Nuxt UI v4 uses Tailwind CSS v4, Nuxt UI theme defaults, and accessible components built on Reka UI.

## When to activate

Use for new Nuxt UI setup, CSS import errors, custom colors/fonts, `@theme` palettes, dark/light mode, app config `ui.colors`, component styling with `ui` props or slots, and migration from Tailwind v3 / `@nuxtjs/tailwindcss`.

## Implementation workflow

1. **Inspect versions** of `nuxt`, `@nuxt/ui`, `tailwindcss`, any `@nuxtjs/tailwindcss` module, `postcss`, existing CSS imports, `app.config.ts`, `nuxt.config.ts`, and Nuxt folder structure.
2. **Choose integration:** For a Nuxt 4 + Nuxt UI v4 project, install `@nuxt/ui` and `tailwindcss`; register `@nuxt/ui` as a Nuxt module. **Do not automatically add `@nuxtjs/tailwindcss`.** If a legacy module exists, audit its role and migration impact first.
3. **Include one primary stylesheet:** `app/assets/css/main.css` contains `@import "tailwindcss";` followed by `@import "@nuxt/ui";`. Add `css: ['~/assets/css/main.css']` to Nuxt config (check the project's alias mapping).
4. **Wrap the app in `<UApp>`** for overlays, toast, modal and related UI services (`app/app.vue`). Do not wrap every individual component.
5. **Define palette in CSS** using Tailwind v4 `@theme static` when custom color utilities should be generated. Semantic names like `primary` and `neutral` are configured via `defineAppConfig({ ui: { colors: ... } })`.
6. **Use Nuxt UI semantic tokens** (e.g. `bg-default`, `bg-elevated`, `text-muted`, `text-primary`, `border-default`) in components. Prefer them over hardcoding unrelated Tailwind colors across the app.
7. **Style components at the right level:** `class` for root quick changes; `:ui` for per-instance slots; `app.config.ts` for app-wide slot/variant defaults; `UTheme` for subtree changes (supported on recent Nuxt UI v4).
8. **Implement color mode:** Make `.dark` overrides of `--ui-*` tokens where needed; test system, light and dark mode on SSR/hydration. Retain focus/contrast and reduced-motion behavior.
9. **Validate** with current release docs, typecheck/lint/build, and component/UI tests. Confirm the actual rendered output in browser, not just CSS compilation.

## Minimum working setup

Install project dependencies with the package manager already in use, e.g.:

```bash
pnpm add @nuxt/ui tailwindcss
```

`nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css']
})
```

`app/assets/css/main.css`:

```css
@import "tailwindcss";
@import "@nuxt/ui";

@theme static {
  --color-brand-50: #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-950: #172554;
}

:root { --ui-radius: 0.65rem; }
.dark { --ui-bg: var(--ui-color-neutral-950); }
```

For a real custom brand palette, define **all required shades from 50 to 950**; the snippet above is short for readability. See `assets/main.css` for full palette.

`app/app.config.ts`:

```ts
export default defineAppConfig({
  ui: {
    colors: { primary: 'brand', neutral: 'zinc' },
    button: { slots: { base: 'font-semibold' } }
  }
})
```

`app/app.vue`:

```vue
<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
```

See copy-ready templates in `assets/` and [theming guide](references/theme-and-components.md).

## Important distinctions

- **`@nuxt/ui` vs `@nuxtjs/tailwindcss`:** Nuxt UI v4's documented install uses `@nuxt/ui` and Tailwind CSS v4 directly. Existing standalone Tailwind module installations require deliberate audit, not silent duplication.
- **`@theme` vs Nuxt UI `ui.colors`:** `@theme` creates Tailwind palette tokens; `app.config.ui.colors` maps semantic aliases (`primary`, `neutral`) onto palettes.
- **`--ui-*` vs `--color-*`:** `--ui-*` are Nuxt UI semantic/layout tokens; `--color-*` tokens belong to Tailwind's generated palette.
- **`app.config.ts` vs `nuxt.config.ts`:** runtime UI theme and component overrides go in app config; module setup goes in Nuxt config.
- **Version-specific theme APIs:** Consult the installed version's component theme keys before overriding slots/variants. Do not blindly copy v3 theme signatures into v4.

## Migration warning signs

Avoid using Tailwind v3-style `@tailwind base; @tailwind components; @tailwind utilities;` in a v4 stylesheet, or adding v3-only `tailwind.config.ts` conventions without a clear migration plan. Don't import both Nuxt UI's CSS and a second generated global Tailwind sheet if it duplicates base layers.

Read [migration and troubleshooting](references/migration-troubleshooting.md) before changing legacy projects.

## Done criteria

- [ ] `@nuxt/ui` v4 and `tailwindcss` v4 versions match intended setup
- [ ] Exactly one intended Tailwind CSS v4 import pipeline
- [ ] `<UApp>` wraps the Nuxt page/layout root
- [ ] Brand palette shades generated and semantic colors mapped
- [ ] Global component overrides typecheck for installed UI version
- [ ] Contrast/focus, light/dark/system, overlays, toasts, forms tested
- [ ] No missing utilities after production build or monorepo scanning
- [ ] Lint/typecheck/build and existing tests pass

## Sources

See [source notes](references/sources.md). Nuxt UI evolves quickly; re-check before migrations.
