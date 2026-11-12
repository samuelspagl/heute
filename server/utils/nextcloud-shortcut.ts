import type { Database } from 'bun:sqlite'
import { normalizeCloudBase } from './nextcloud'

export function seedNextcloudShortcut(connection: Database, base: URL) {
  const key = 'nextcloud-family-shortcut-v1'
  const marked = connection.query('SELECT 1 FROM dashboard_setup WHERE key = ?')
  if (marked.get(key)) return

  connection.transaction(() => {
    if (!connection.query('INSERT OR IGNORE INTO dashboard_setup (key) VALUES (?)').run(key).changes) return
    const links = connection.query<{ url: string }, []>("SELECT url FROM links WHERE owner = ''").all()
    if (links.some(link => normalizeCloudBase(link.url)?.href === base.href)) return

    connection.query(`
      INSERT INTO links (id, owner, title, url, icon, color, position, section_id)
      SELECT ?, '', 'Nextcloud', ?, 'selfhst:nextcloud', 'blue',
        MIN(9999, COALESCE(MAX(position), -1) + 1), ''
      FROM links WHERE owner = '' AND section_id = ''
    `).run(crypto.randomUUID(), base.href)
  }).immediate()
}
