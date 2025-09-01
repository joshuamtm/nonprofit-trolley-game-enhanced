import { pgTable, uuid, varchar, timestamp, jsonb, boolean, text, integer, index, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const sessionStatusEnum = pgEnum('session_status', ['waiting', 'active', 'complete', 'cancelled']);
export const difficultyLevelEnum = pgEnum('difficulty_level', ['beginner', 'intermediate', 'advanced']);
export const voteTypeEnum = pgEnum('vote_type', ['pull', 'dont_pull']);

// Sessions table
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomCode: varchar('room_code', { length: 6 }).unique().notNull(),
  facilitatorId: uuid('facilitator_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  config: jsonb('config').default({}).notNull(),
  status: sessionStatusEnum('status').default('waiting').notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
}, (table) => ({
  roomCodeIdx: index('idx_sessions_room_code').on(table.roomCode),
  statusIdx: index('idx_sessions_status').on(table.status),
}));

// Participants table
export const participants = pgTable('participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  fingerprint: varchar('fingerprint', { length: 255 }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
  userAgent: text('user_agent'),
  ipHash: varchar('ip_hash', { length: 255 }),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
}, (table) => ({
  sessionIdIdx: index('idx_participants_session_id').on(table.sessionId),
  fingerprintIdx: index('idx_participants_fingerprint').on(table.fingerprint),
}));

// Scenarios table
export const scenarios = pgTable('scenarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  context: text('context').notNull(),
  aiOption: text('ai_option').notNull(),
  nonAiOption: text('non_ai_option').notNull(),
  assumptions: text('assumptions').array().default([]).notNull(),
  ethicalAxes: text('ethical_axes').array().default([]).notNull(),
  riskNotes: text('risk_notes'),
  metrics: jsonb('metrics').default({}).notNull(),
  contentWarnings: text('content_warnings').array().default([]).notNull(),
  difficultyLevel: difficultyLevelEnum('difficulty_level').default('intermediate').notNull(),
  discussionPrompts: text('discussion_prompts').array().default([]).notNull(),
  mitigations: text('mitigations').array().default([]),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Session Scenarios table (junction table)
export const sessionScenarios = pgTable('session_scenarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  scenarioId: uuid('scenario_id').references(() => scenarios.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  orderIndex: integer('order_index'),
});

// Votes table
export const votes = pgTable('votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  participantId: uuid('participant_id').references(() => participants.id, { onDelete: 'cascade' }).notNull(),
  scenarioId: uuid('scenario_id').references(() => scenarios.id, { onDelete: 'cascade' }).notNull(),
  vote: voteTypeEnum('vote').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  latencyMs: integer('latency_ms'),
}, (table) => ({
  sessionIdIdx: index('idx_votes_session_id').on(table.sessionId),
  scenarioIdIdx: index('idx_votes_scenario_id').on(table.scenarioId),
}));

// Rationales table
export const rationales = pgTable('rationales', {
  id: uuid('id').defaultRandom().primaryKey(),
  voteId: uuid('vote_id').references(() => votes.id, { onDelete: 'cascade' }).notNull(),
  originalText: text('original_text').notNull(),
  processedText: text('processed_text'),
  wordCount: integer('word_count'),
  moderated: boolean('moderated').default(false).notNull(),
  moderationReason: varchar('moderation_reason', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  voteIdIdx: index('idx_rationales_vote_id').on(table.voteId),
}));

// Mitigations table
export const mitigations = pgTable('mitigations', {
  id: uuid('id').defaultRandom().primaryKey(),
  voteId: uuid('vote_id').references(() => votes.id, { onDelete: 'cascade' }).notNull(),
  originalText: text('original_text').notNull(),
  processedText: text('processed_text'),
  wordCount: integer('word_count'),
  moderated: boolean('moderated').default(false).notNull(),
  moderationReason: varchar('moderation_reason', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  voteIdIdx: index('idx_mitigations_vote_id').on(table.voteId),
}));

// Relations
export const sessionsRelations = relations(sessions, ({ many }) => ({
  participants: many(participants),
  sessionScenarios: many(sessionScenarios),
  votes: many(votes),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  session: one(sessions, {
    fields: [participants.sessionId],
    references: [sessions.id],
  }),
  votes: many(votes),
}));

export const scenariosRelations = relations(scenarios, ({ many }) => ({
  sessionScenarios: many(sessionScenarios),
  votes: many(votes),
}));

export const sessionScenariosRelations = relations(sessionScenarios, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionScenarios.sessionId],
    references: [sessions.id],
  }),
  scenario: one(scenarios, {
    fields: [sessionScenarios.scenarioId],
    references: [scenarios.id],
  }),
}));

export const votesRelations = relations(votes, ({ one, many }) => ({
  session: one(sessions, {
    fields: [votes.sessionId],
    references: [sessions.id],
  }),
  participant: one(participants, {
    fields: [votes.participantId],
    references: [participants.id],
  }),
  scenario: one(scenarios, {
    fields: [votes.scenarioId],
    references: [scenarios.id],
  }),
  rationales: many(rationales),
  mitigations: many(mitigations),
}));

export const rationalesRelations = relations(rationales, ({ one }) => ({
  vote: one(votes, {
    fields: [rationales.voteId],
    references: [votes.id],
  }),
}));

export const mitigationsRelations = relations(mitigations, ({ one }) => ({
  vote: one(votes, {
    fields: [mitigations.voteId],
    references: [votes.id],
  }),
}));

// Type exports
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type Scenario = typeof scenarios.$inferSelect;
export type NewScenario = typeof scenarios.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type Rationale = typeof rationales.$inferSelect;
export type NewRationale = typeof rationales.$inferInsert;
export type Mitigation = typeof mitigations.$inferSelect;
export type NewMitigation = typeof mitigations.$inferInsert;