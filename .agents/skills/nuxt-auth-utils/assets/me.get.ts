// Target destination: server/api/me.get.ts
import { defineEventHandler } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  // For sensitive information, load the DB record and enforce current permissions.
  return { id: user.id, name: user.name }
})
