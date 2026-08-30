import Database from 'better-sqlite3'
import {drizzle} from 'drizzle-orm/better-sqlite3'
import {migrate} from 'drizzle-orm/better-sqlite3/migrator'
import fs from 'node:fs'
import path from 'node:path'

const dbUrl = process.env.DATABASE_URL || './data/td.sqlite'
fs.mkdirSync(path.dirname(dbUrl), {recursive: true})

const sqlite = new Database(dbUrl)
const db = drizzle(sqlite)

migrate(db, {migrationsFolder: './drizzle'})
console.log('Migrations applied.')
sqlite.close()
