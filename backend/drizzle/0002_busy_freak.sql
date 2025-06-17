ALTER TABLE "jobs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "results" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "jobs" CASCADE;--> statement-breakpoint
DROP TABLE "results" CASCADE;--> statement-breakpoint
ALTER TABLE "processing_errors" ALTER COLUMN "chunk_index" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_errors" ALTER COLUMN "row_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_errors" ALTER COLUMN "row_data" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_errors" DROP COLUMN "job_name";--> statement-breakpoint
ALTER TABLE "processing_errors" DROP COLUMN "error_source";