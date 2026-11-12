const surfaceSelector = '.glass-surface:is(.glass-control, .editor-glass, .menu-glass)'
const svgNamespace = 'http://www.w3.org/2000/svg'

// Only the lens geometry is rasterized. The browser supplies the live backdrop,
// including widgets and video; we never copy the wallpaper into a surface.
function lensMap(width: number, height: number, radius: number) {
  const scale = Math.min(1, 768 / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) return null
  const pixels = context.createImageData(canvas.width, canvas.height)
  const r = Math.min(radius, width / 2, height / 2)
  const rim = Math.min(18, width / 4, height / 4)
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const px = (x + .5) / scale - width / 2
      const py = (y + .5) / scale - height / 2
      const qx = Math.abs(px) - (width / 2 - r)
      const qy = Math.abs(py) - (height / 2 - r)
      const ox = Math.max(qx, 0)
      const oy = Math.max(qy, 0)
      const length = Math.hypot(ox, oy)
      const distance = length + Math.min(Math.max(qx, qy), 0) - r
      const strength = distance <= 0 ? Math.pow(Math.max(0, 1 + distance / rim), 2) : 0
      const nx = length ? ox / length : qx > qy ? 1 : 0
      const ny = length ? oy / length : qx > qy ? 0 : 1
      const i = (y * canvas.width + x) * 4
      pixels.data[i] = Math.round(127.5 - Math.sign(px) * nx * strength * 110)
      pixels.data[i + 1] = Math.round(127.5 - Math.sign(py) * ny * strength * 110)
      pixels.data[i + 2] = 128
      pixels.data[i + 3] = 255
    }
  }
  context.putImageData(pixels, 0, 0)
  return canvas.toDataURL()
}

export default defineNuxtPlugin(() => {
  let dispose = () => {}
  onNuxtReady(() => {
    // CSS.supports only checks parsing. Keep other engines on CSS blur until
    // their SVG backdrop rendering has been verified (iOS Chrome uses WebKit).
    if (!/Chrome\//.test(navigator.userAgent)
      || !CSS.supports('backdrop-filter', 'url("#glass-probe") blur(1px)')) return
    const definitions = document.querySelector('.glass-optics-definitions defs')
    if (!definitions) return
    const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)')
    const higherContrast = matchMedia('(prefers-contrast: more)')
    const filters = new Map<HTMLElement, { filter: SVGFilterElement, size: string }>()
    let nextId = 0
    let frame = 0

    function remove(surface: HTMLElement) {
      filters.get(surface)?.filter.remove()
      filters.delete(surface)
      resizeObserver.unobserve(surface)
      surface.style.removeProperty('--glass-backdrop-lens')
      delete surface.dataset.glassRefracted
    }

    function update() {
      frame = 0
      const surfaces = new Set<HTMLElement>(reducedTransparency.matches || higherContrast.matches
        ? [] : document.querySelectorAll<HTMLElement>(surfaceSelector))
      for (const surface of filters.keys()) if (!surfaces.has(surface)) remove(surface)
      for (const surface of surfaces) {
        // Layout dimensions avoid regenerating maps during opening transforms.
        const width = surface.clientWidth
        const height = surface.clientHeight
        if (!width || !height) continue
        const radius = parseFloat(getComputedStyle(surface).borderTopLeftRadius) || 0
        const size = `${width}:${height}:${radius}`
        let entry = filters.get(surface)
        if (entry?.size === size) continue
        const map = lensMap(width, height, radius)
        if (!map) continue
        if (!entry) {
          const filter = document.createElementNS(svgNamespace, 'filter')
          filter.id = `heute-backdrop-lens-${++nextId}`
          filter.setAttribute('x', '0%')
          filter.setAttribute('y', '0%')
          filter.setAttribute('width', '100%')
          filter.setAttribute('height', '100%')
          filter.setAttribute('color-interpolation-filters', 'sRGB')
          entry = { filter, size: '' }
          filters.set(surface, entry)
          definitions!.append(filter)
          resizeObserver.observe(surface)
        }
        const image = document.createElementNS(svgNamespace, 'feImage')
        image.setAttribute('href', map)
        image.setAttribute('width', '100%')
        image.setAttribute('height', '100%')
        image.setAttribute('preserveAspectRatio', 'none')
        image.setAttribute('result', 'lens')
        const displacement = document.createElementNS(svgNamespace, 'feDisplacementMap')
        displacement.setAttribute('in', 'SourceGraphic')
        displacement.setAttribute('in2', 'lens')
        displacement.setAttribute('scale', surface.classList.contains('editor-glass') ? '24' : '14')
        displacement.setAttribute('xChannelSelector', 'R')
        displacement.setAttribute('yChannelSelector', 'G')
        entry.filter.replaceChildren(image, displacement)
        entry.size = size
        surface.style.setProperty('--glass-backdrop-lens', `url("#${entry.filter.id}")`)
        surface.dataset.glassRefracted = ''
      }
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const resizeObserver = new ResizeObserver(schedule)
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    reducedTransparency.addEventListener('change', schedule)
    higherContrast.addEventListener('change', schedule)
    dispose = () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      resizeObserver.disconnect()
      reducedTransparency.removeEventListener('change', schedule)
      higherContrast.removeEventListener('change', schedule)
      for (const surface of filters.keys()) remove(surface)
    }
    schedule()
  })
  if (import.meta.hot) import.meta.hot.dispose(() => dispose())
})
