ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_note" text;--> statement-breakpoint
CREATE INDEX "users_status_ix" ON "users" USING btree ("status");