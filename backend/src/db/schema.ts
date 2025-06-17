import { pgTable, serial, text, integer, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

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

export const fileUploads = pgTable('file_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  status: text('status').notNull().default('pending'),
  totalRows: integer('total_rows'),
  processedRows: integer('processed_rows').default(0),
  errorCount: integer('error_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const processingErrors = pgTable('processing_errors', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileUploadId: uuid('file_upload_id').references(() => fileUploads.id).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  rowNumber: integer('row_number').notNull(),
  errorMessage: text('error_message').notNull(),
  rowData: jsonb('row_data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const fileChunks = pgTable('file_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileUploadId: uuid('file_upload_id').references(() => fileUploads.id).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  status: text('status').notNull().default('pending'),
  rowCount: integer('row_count').notNull(),
  errorCount: integer('error_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
