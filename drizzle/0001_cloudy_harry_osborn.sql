ALTER TABLE "session_exercises" ADD COLUMN "exercise_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD COLUMN "tracking" text DEFAULT 'weight_reps' NOT NULL;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD COLUMN "target_sets" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD COLUMN "target_reps_low" integer;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD COLUMN "target_reps_high" integer;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD COLUMN "target_seconds" integer;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD COLUMN "target_meters" integer;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD COLUMN "superset_group" integer;