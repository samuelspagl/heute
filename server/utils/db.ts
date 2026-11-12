import { initializeMedia } from './media/storage'
import { defaultAppearance } from '~~/shared/appearance'
import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { H3Event } from 'h3'

let database: Database | undefined

export function db(event: H3Event) {
  if (database) return database
  const path = useRuntimeConfig(event).databasePath
  mkdirSync(dirname(path), { recursive: true })
  const connection = new Database(path, { create: true })
  connection.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL,
      url TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL, position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS link_sections (
      id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS appearance (
      owner TEXT PRIMARY KEY, wallpaper TEXT NOT NULL,
      image BLOB, image_version TEXT
    );
    CREATE TABLE IF NOT EXISTS dashboard_setup (key TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS nextcloud_connections (
      owner TEXT PRIMARY KEY, base_url TEXT NOT NULL,
      nonce BLOB NOT NULL, tag BLOB NOT NULL, ciphertext BLOB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS favorites (
      owner TEXT NOT NULL, link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      PRIMARY KEY (owner, link_id)
    );
    CREATE TABLE IF NOT EXISTS widget_settings (
      owner TEXT NOT NULL, widget_id TEXT NOT NULL, settings TEXT NOT NULL,
      PRIMARY KEY (owner, widget_id)
    );
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY, owner TEXT NOT NULL, type TEXT NOT NULL,
      title TEXT NOT NULL, position INTEGER NOT NULL,
      show_all INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS page_widgets (
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      widget_id TEXT NOT NULL, settings TEXT NOT NULL, position INTEGER NOT NULL,
      PRIMARY KEY (page_id, widget_id)
    );
  `)
  connection.transaction(() => {
    const linkColumns = connection.query<{ name: string }, []>('PRAGMA table_info(links)').all()
    if (!linkColumns.some(column => column.name === 'section_id')) {
      connection.exec("ALTER TABLE links ADD COLUMN section_id TEXT NOT NULL DEFAULT ''")
    }
    const favoriteColumns = connection.query<{ name: string }, []>('PRAGMA table_info(favorites)').all()
    if (!favoriteColumns.some(column => column.name === 'position')) {
      connection.exec(`
        ALTER TABLE favorites ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
        UPDATE favorites SET position = rowid;
        INSERT OR IGNORE INTO favorites (owner, link_id, position)
        SELECT owner, id, (SELECT COALESCE(MAX(position), 0) FROM favorites) +
          ROW_NUMBER() OVER (ORDER BY owner, position, title COLLATE NOCASE, id)
        FROM links WHERE owner <> '';
      `)
    }
    const columns = connection.query<{ name: string }, []>('PRAGMA table_info(appearance)').all()
    const appearanceColumns = [
      ['icon_size', defaultAppearance.iconSize],
      ['label_size', defaultAppearance.labelSize],
      ['widget_width', defaultAppearance.widgetWidth],
      ['overlay_opacity', defaultAppearance.overlayOpacity]
    ] as const
    for (const [column, value] of appearanceColumns) {
      if (!columns.some(entry => entry.name === column)) {
        connection.exec(`ALTER TABLE appearance ADD COLUMN ${column} INTEGER NOT NULL DEFAULT ${value}`)
      }
    }
  }).immediate()
  try { initializeMedia(connection, path) }
  catch (error) { connection.close(); throw error }
  database = connection
  return connection
}
