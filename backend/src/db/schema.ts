import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("queued"),
  filePath: text("file_path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  error: text("error"),
  totalRows: integer("total_rows"),
  processedRows: integer("processed_rows"),
});

export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id),
  row: jsonb("row").notNull(),
  status: text("status").notNull().default("success"),
  error: text("error"),
  rowHash: text("row_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
