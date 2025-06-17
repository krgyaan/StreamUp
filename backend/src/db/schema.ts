import { pgTable, serial, text, integer, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

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

export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  storeName: text('store_name').notNull(),
  storeAddress: text('store_address').notNull(),
  cityName: text('city_name').notNull(),
  regionName: text('region_name').notNull(),
  retailerName: text('retailer_name').notNull(),
  storeType: text('store_type').notNull(),
  storeLongitude: text('store_longitude').notNull(),
  storeLatitude: text('store_latitude').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
