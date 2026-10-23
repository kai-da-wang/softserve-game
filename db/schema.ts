import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  nickname: text('nickname').notNull(),
  bestScore: integer('best_score').notNull().default(0),
  bestAt: integer('best_at').notNull().default(0),
  skin: text('skin').notNull().default('vanilla'),
  createdAt: integer('created_at').notNull(),
}, table => [index('players_best_idx').on(table.bestScore, table.bestAt)]);
export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(), playerId: text('player_id').notNull().references(() => players.id),
  startedAt: integer('started_at').notNull(), completedAt: integer('completed_at'),
  score: integer('score'), day: text('day'), outcome: text('outcome'),
}, table => [index('runs_player_started_idx').on(table.playerId, table.startedAt)]);
export const dailyBests = sqliteTable('daily_bests', {
  playerId: text('player_id').notNull().references(() => players.id), day: text('day').notNull(),
  score: integer('score').notNull(), achievedAt: integer('achieved_at').notNull(),
}, table => [primaryKey({columns:[table.playerId,table.day]}),index('daily_best_idx').on(table.day,table.score,table.achievedAt)]);
