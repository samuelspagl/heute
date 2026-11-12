import { parseDocument } from 'htmlparser2'
import type { RssEntry } from '~~/shared/rss'

type Node = ReturnType<typeof parseDocument>['children'][number]
type Element = Extract<Node, { attribs: Record<string, string> }>

function isElement(node: Node): node is Element {
  return 'name' in node && 'attribs' in node
}

function localName(node: Element) {
  return node.name.slice(node.name.lastIndexOf(':') + 1)
}

function elements(nodes: Node[], name: string): Element[] {
  return nodes.filter((node): node is Element => isElement(node) && localName(node) === name)
}

function child(node: Element, name: string) {
  return elements(node.children, name)[0]
}

function textContent(nodes: Node[], html = false): string {
  const parts: string[] = []
  const stack: (Node | string)[] = [...nodes].reverse()
  while (stack.length) {
    const node = stack.pop()!
    if (typeof node === 'string') {
      parts.push(node)
      continue
    }
    if (node.type === 'text') parts.push(node.data)
    if ('name' in node && /(?:^|:)(script|style)$/i.test(node.name)) continue
    if (html && 'name' in node && /^(br|p|div|li|h[1-6])$/.test(node.name)) {
      parts.push(' ')
      stack.push(' ')
    }
    if ('children' in node) {
      for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]!)
    }
  }
  return parts.join('')
}

function plainText(node: Element | undefined, maxLength: number, markup = true) {
  if (!node) return ''
  const value = textContent(node.children, true)
  const plain = markup ? textContent(parseDocument(value).children, true) : value
  return plain.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function articleUrl(raw: string, feedUrl: string) {
  if (!raw.trim()) return null
  try {
    const url = new URL(raw.trim(), feedUrl)
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.href
  } catch {
    return null
  }
  return null
}

export function parseFeed(xml: string, feedUrl: string): RssEntry[] {
  if (/<!DOCTYPE\b/i.test(xml)) throw new Error('Feed declarations are not supported')
  const document = parseDocument(xml, { xmlMode: true })
  const roots = document.children.filter(isElement)
  const root = roots[0]
  if (roots.length !== 1 || !root) throw new Error('Expected one feed root')
  const channel = localName(root) === 'rss' ? child(root, 'channel') : undefined
  if (!channel && localName(root) !== 'feed') throw new Error('Unsupported feed format')

  const items = channel ? elements(channel.children, 'item') : elements(root.children, 'entry')
  return items.flatMap(item => {
    const titleNode = child(item, 'title')
    const title = plainText(titleNode, 300, Boolean(channel || titleNode?.attribs.type === 'html'))
    const link = channel
      ? plainText(child(item, 'link'), 4096, false)
      : elements(item.children, 'link').find(node => (!node.attribs.rel || node.attribs.rel === 'alternate') && node.attribs.href)?.attribs.href ?? ''
    const url = articleUrl(link, feedUrl)
    if (!title || !url) return []

    const description = channel
      ? child(item, 'description') ?? child(item, 'encoded')
      : child(item, 'summary') ?? child(item, 'content')
    const summary = plainText(description, 500, Boolean(channel || description?.attribs.type === 'html'))
    const date = channel ? child(item, 'pubDate') ?? child(item, 'date') : child(item, 'published') ?? child(item, 'updated')
    const timestamp = Date.parse(plainText(date, 128, false))
    return [{ title, summary, url, publishedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null }]
  })
}
