# Theme system, components, and customization

## The three layers

1. **Tailwind v4 theme (`@theme` in CSS):** Define palette shades, fonts, breakpoints and spacing scales. For a custom brand, define all the `--color-brand-50` to `--color-brand-950` shades so variants have meaningful light/dark mappings.
2. **Nuxt UI app config (`app/app.config.ts`):** Alias semantic colors (`primary`, `neutral`, `success`, etc.) to palette names and supply component-level defaults.
3. **Nuxt UI CSS tokens (`--ui-*`):** Adjust semantic backgrounds, borders, radius, and contrast. Build layout using utilities such as `text-primary`, `text-dimmed`, `bg-default`, `bg-elevated`, `border-default`.

## CSS example

```css
@import "tailwindcss";
@import "@nuxt/ui";

@theme static {
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  /* Define the remaining shades for production. */
}
:root { --ui-radius: .75rem; }
.dark { --ui-bg: var(--ui-color-neutral-950); }
```

## App config example

```ts
export default defineAppConfig({
  ui: {
    colors: { primary: 'brand', neutral: 'slate' },
    button: {
      slots: { base: 'font-semibold' },
      defaultVariants: { color: 'primary' }
    }
  }
})
```

## Styling precedence

- Use `<UButton class="rounded-full" />` for a quick root-class change.
- Use `<UButton :ui="{ trailingIcon: 'rotate-90' }" />` for per-instance slot changes (choose slots that exist in the installed version).
- Use `app.config.ts` to change a component across the application.
- For recent v4 releases, `<UTheme :ui="{ button: { base: 'rounded-full' } }">` can scope overrides to a subtree. Confirm support in the installed release.
- For a very custom design, compose your own wrapper around Nuxt UI primitives rather than replacing accessibility, keyboard support, overlays, or focus management.

## Light/dark behavior

Nuxt UI includes color-mode support. Prefer its built-in UI semantics. Avoid writing a second, conflicting dark mode toggle before checking the module's automatic integrations. When overriding `--ui-bg`/other tokens, verify contrast and SSR color-mode behavior. If glass effects are used, make them stronger/opaque enough for text over unpredictable backdrops.

## Scanning and monorepos

If utilities referenced in a package outside the main app are missing in production, inspect Tailwind v4's source scanning and supported `@source` directives. Don't add dynamic class interpolation that the scanner cannot see; use static class maps/variants where possible.

## Quick check

Render a page with `bg-default`, `bg-elevated`, `border-default`, `text-muted`, `text-primary`, `UButton`, `UModal`, and `UInput`. Test light/dark appearance and SSR/hydration. If `UModal`/toast behavior fails, verify `<UApp>` is installed at the root.
