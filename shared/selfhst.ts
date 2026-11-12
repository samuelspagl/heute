export const selfhstRevision = '87a5dfd901a341e271eb453ffebce6c5a88c308e'

export function selfhstUrl(icon: string, format: 'webp' | 'png' = 'webp') {
  const slug = /^selfhst:([a-z0-9][a-z0-9_-]*)$/.exec(icon)?.[1]
  return slug ? `https://cdn.jsdelivr.net/gh/selfhst/icons@${selfhstRevision}/${format}/${slug}.${format}` : null
}
