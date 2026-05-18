import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

export const moodLogs = sqliteTable("mood_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // ISO date string YYYY-MM-DD
  mood: integer("mood").notNull(), // 1-5
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // 'breathe' | 'meditate'
  exercise: text("exercise"), // e.g. '4-7-8', 'box', 'calm'
  duration: integer("duration").notNull(), // seconds
  completedAt: integer("completed_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  date: text("date").notNull(), // YYYY-MM-DD
});

export const streaks = sqliteTable("streaks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  activityCount: integer("activity_count").notNull().default(1),
});
