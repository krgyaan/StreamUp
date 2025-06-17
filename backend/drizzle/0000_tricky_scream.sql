CREATE TABLE "file_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_rows" integer,
	"processed_rows" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"file_path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"error" text,
	"total_rows" integer,
	"processed_rows" integer
);
--> statement-breakpoint
CREATE TABLE "processing_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_upload_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"row_number" integer NOT NULL,
	"error_message" text NOT NULL,
	"row_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer,
	"row" jsonb NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"error" text,
	"row_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_name" text NOT NULL,
	"store_address" text NOT NULL,
	"city_name" text NOT NULL,
	"region_name" text NOT NULL,
	"retailer_name" text NOT NULL,
	"store_type" text NOT NULL,
	"store_longitude" text NOT NULL,
	"store_latitude" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "processing_errors" ADD CONSTRAINT "processing_errors_file_upload_id_file_uploads_id_fk" FOREIGN KEY ("file_upload_id") REFERENCES "public"."file_uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;