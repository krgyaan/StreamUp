ALTER TABLE "processing_errors" ALTER COLUMN "chunk_index" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_errors" ALTER COLUMN "row_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_errors" ALTER COLUMN "row_data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_errors" ADD COLUMN "job_name" text;--> statement-breakpoint
ALTER TABLE "processing_errors" ADD COLUMN "error_source" text;