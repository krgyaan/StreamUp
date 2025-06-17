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
DROP TABLE "file_chunks" CASCADE;