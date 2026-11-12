// Target: app/app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brand',
      secondary: 'violet',
      success: 'green',
      info: 'sky',
      warning: 'amber',
      error: 'red',
      neutral: 'slate'
    },
    button: {
      slots: {
        base: 'font-semibold'
      },
      defaultVariants: {
        size: 'md'
      }
    }
  }
})
