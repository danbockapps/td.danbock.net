import {relations} from 'drizzle-orm'
import {index, integer, sqliteTable, text, unique} from 'drizzle-orm/sqlite-core'

export const tournaments = sqliteTable('tournaments', {
  id: integer('id').primaryKey({autoIncrement: true}),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  numRounds: integer('num_rounds').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
})

export const entries = sqliteTable(
  'entries',
  {
    id: integer('id').primaryKey({autoIncrement: true}),
    tournamentId: integer('tournament_id')
      .notNull()
      .references(() => tournaments.id),
    round: integer('round').notNull(),
    uscfId: text('uscf_id').notNull(),
    name: text('name').notNull(),
    rating: integer('rating'),
    team: text('team'),
    createdAt: integer('created_at')
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => [
    unique('entries_tournament_round_uscf_unique').on(
      table.tournamentId,
      table.round,
      table.uscfId,
    ),
    index('entries_tournament_round_idx').on(table.tournamentId, table.round),
  ],
)

export const pairings = sqliteTable(
  'pairings',
  {
    id: integer('id').primaryKey({autoIncrement: true}),
    tournamentId: integer('tournament_id')
      .notNull()
      .references(() => tournaments.id),
    round: integer('round').notNull(),
    board: integer('board').notNull(),
    whiteEntryId: integer('white_entry_id').references(() => entries.id),
    blackEntryId: integer('black_entry_id').references(() => entries.id),
    createdAt: integer('created_at')
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => [
    unique('pairings_tournament_round_board_unique').on(
      table.tournamentId,
      table.round,
      table.board,
    ),
    index('pairings_tournament_round_idx').on(table.tournamentId, table.round),
  ],
)

export const results = sqliteTable('results', {
  id: integer('id').primaryKey({autoIncrement: true}),
  pairingId: integer('pairing_id')
    .notNull()
    .unique()
    .references(() => pairings.id),
  outcome: text('outcome', {
    enum: ['white', 'black', 'draw', 'white_forfeit', 'black_forfeit', 'double_forfeit'],
  }).notNull(),
  enteredAt: integer('entered_at')
    .notNull()
    .$defaultFn(() => Date.now()),
})

export const tournamentsRelations = relations(tournaments, ({many}) => ({
  entries: many(entries),
  pairings: many(pairings),
}))

export const entriesRelations = relations(entries, ({one}) => ({
  tournament: one(tournaments, {
    fields: [entries.tournamentId],
    references: [tournaments.id],
  }),
}))

export const pairingsRelations = relations(pairings, ({one}) => ({
  tournament: one(tournaments, {
    fields: [pairings.tournamentId],
    references: [tournaments.id],
  }),
  white: one(entries, {
    fields: [pairings.whiteEntryId],
    references: [entries.id],
    relationName: 'whiteEntry',
  }),
  black: one(entries, {
    fields: [pairings.blackEntryId],
    references: [entries.id],
    relationName: 'blackEntry',
  }),
  result: one(results, {
    fields: [pairings.id],
    references: [results.pairingId],
  }),
}))

export const resultsRelations = relations(results, ({one}) => ({
  pairing: one(pairings, {
    fields: [results.pairingId],
    references: [pairings.id],
  }),
}))
