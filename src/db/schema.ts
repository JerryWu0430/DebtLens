import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const analyses = sqliteTable("analyses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repoUrl: text("repo_url").notNull(),
  painPoint: text("pain_point").notNull(),
  analysisType: text("analysis_type").notNull(),
  result: text("result", { mode: "json" }).$type<Record<string, unknown>>(),
  mermaidCode: text("mermaid_code"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const repoCache = sqliteTable("repo_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repoFullName: text("repo_full_name").notNull().unique(),
  fileTree: text("file_tree", { mode: "json" }).$type<string[]>(),
  dependencies: text("dependencies", { mode: "json" }).$type<Record<string, string>>(),
  fetchedAt: integer("fetched_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Analysis = typeof analyses.$inferSelect;
export type NewAnalysis = typeof analyses.$inferInsert;
export type RepoCache = typeof repoCache.$inferSelect;
export type NewRepoCache = typeof repoCache.$inferInsert;
