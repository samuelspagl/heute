import { createError, getHeader, sendStream, setResponseHeaders, setResponseStatus, type H3Event } from 'h3'
import { byteRange, openMedia } from './storage'

export async function serveMedia(event: H3Event, directory: string, name: string, type: string) {
  const opened = await openMedia(directory, name).catch(() => null)
  if (!opened) throw createError({ statusCode: 404, statusMessage: 'Media not found' })
  const { file, size } = opened
  setResponseHeaders(event, { 'content-type': type, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'accept-ranges': 'bytes' })
  let range
  try { range = byteRange(getHeader(event, 'range'), size) }
  catch {
    await file.close()
    setResponseHeaders(event, { 'content-range': `bytes */${size}` })
    throw createError({ statusCode: 416, statusMessage: 'Range not satisfiable' })
  }
  if (range) {
    setResponseStatus(event, 206)
    setResponseHeaders(event, { 'content-range': `bytes ${range.start}-${range.end}/${size}`, 'content-length': range.end - range.start + 1 })
  } else setResponseHeaders(event, { 'content-length': size })
  if (event.method === 'HEAD') { await file.close(); return '' }
  let position = range?.start ?? 0
  const end = range?.end ?? size - 1
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const buffer = Buffer.alloc(Math.min(64 * 1024, end - position + 1))
        const { bytesRead } = await file.read(buffer, 0, buffer.length, position)
        position += bytesRead
        if (bytesRead) controller.enqueue(buffer.subarray(0, bytesRead))
        if (!bytesRead || position > end) { await file.close(); controller.close() }
      } catch (error) { await file.close().catch(() => {}); controller.error(error) }
    },
    async cancel() { await file.close() }
  })
  return sendStream(event, stream)
}
