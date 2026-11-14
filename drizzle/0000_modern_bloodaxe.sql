CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"muscle_group" text DEFAULT 'annat' NOT NULL,
	"equipment" text,
	"tracking" text DEFAULT 'weight_reps' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_favorites" (
	"user_id" uuid NOT NULL,
	"food_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"logged_on" date NOT NULL,
	"meal" text DEFAULT 'lunch' NOT NULL,
	"food_id" uuid,
	"name" text NOT NULL,
	"grams" numeric(8, 2) DEFAULT '0' NOT NULL,
	"servings" numeric(6, 2) DEFAULT '1' NOT NULL,
	"kcal" numeric(8, 2) NOT NULL,
	"protein" numeric(7, 2) DEFAULT '0' NOT NULL,
	"carbs" numeric(7, 2) DEFAULT '0' NOT NULL,
	"fat" numeric(7, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"barcode" text,
	"name" text NOT NULL,
	"brand" text,
	"kcal_100g" numeric(7, 2) NOT NULL,
	"protein_100g" numeric(6, 2) DEFAULT '0' NOT NULL,
	"carbs_100g" numeric(6, 2) DEFAULT '0' NOT NULL,
	"fat_100g" numeric(6, 2) DEFAULT '0' NOT NULL,
	"fiber_100g" numeric(6, 2),
	"sugar_100g" numeric(6, 2),
	"salt_100g" numeric(6, 3),
	"serving_grams" numeric(7, 2),
	"serving_label" text,
	"image_url" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"food_id" uuid NOT NULL,
	"grams" numeric(8, 2) NOT NULL,
	"servings" numeric(6, 2) DEFAULT '1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"rotation_index" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"rest_seconds" integer DEFAULT 90 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_exercise_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"weight_kg" numeric(6, 2),
	"reps" integer,
	"duration_sec" integer,
	"distance_m" integer,
	"rpe" numeric(3, 1),
	"set_type" text DEFAULT 'normal' NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid,
	"workout_id" uuid,
	"workout_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"notes" text,
	"client_id" uuid DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'Europe/Stockholm' NOT NULL,
	"units" text DEFAULT 'metric' NOT NULL,
	"theme" text DEFAULT 'dark' NOT NULL,
	"kcal_target" integer,
	"protein_target" integer,
	"carbs_target" integer,
	"fat_target" integer,
	"goal_mode" text DEFAULT 'auto' NOT NULL,
	"goal_rate_kg_week" numeric(3, 2) DEFAULT '-0.25' NOT NULL,
	"water_target_ml" integer DEFAULT 2000 NOT NULL,
	"weight_kg" numeric(5, 1),
	"height_cm" integer,
	"birth_year" integer,
	"sex" text,
	"activity_level" text DEFAULT 'moderate' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"password_updated_at" timestamp with time zone,
	"name" text,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "water_log" (
	"user_id" uuid NOT NULL,
	"logged_on" date NOT NULL,
	"ml" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"logged_on" date NOT NULL,
	"weight_kg" numeric(5, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"target_sets" integer DEFAULT 3 NOT NULL,
	"target_reps_low" integer,
	"target_reps_high" integer,
	"target_seconds" integer,
	"target_meters" integer,
	"rest_seconds" integer DEFAULT 90 NOT NULL,
	"superset_group" integer,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_favorites" ADD CONSTRAINT "food_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_favorites" ADD CONSTRAINT "food_favorites_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "food_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "food_log_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_template_items" ADD CONSTRAINT "meal_template_items_template_id_meal_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."meal_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_template_items" ADD CONSTRAINT "meal_template_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_templates" ADD CONSTRAINT "meal_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_workouts" ADD CONSTRAINT "program_workouts_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_sets" ADD CONSTRAINT "session_sets_session_exercise_id_session_exercises_id_fk" FOREIGN KEY ("session_exercise_id") REFERENCES "public"."session_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_workout_id_program_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."program_workouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_log" ADD CONSTRAINT "water_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_log" ADD CONSTRAINT "weight_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_program_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."program_workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_user_name_ux" ON "exercises" USING btree ("user_id","name") WHERE "exercises"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_global_name_ux" ON "exercises" USING btree ("name") WHERE "exercises"."user_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "food_favorites_ux" ON "food_favorites" USING btree ("user_id","food_id");--> statement-breakpoint
CREATE UNIQUE INDEX "food_log_client_ux" ON "food_log" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "food_log_user_day_ix" ON "food_log" USING btree ("user_id","logged_on");--> statement-breakpoint
CREATE UNIQUE INDEX "foods_user_barcode_ux" ON "foods" USING btree ("user_id","barcode") WHERE "foods"."barcode" is not null and "foods"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "foods_global_barcode_ux" ON "foods" USING btree ("barcode") WHERE "foods"."barcode" is not null and "foods"."user_id" is null;--> statement-breakpoint
CREATE INDEX "foods_name_ix" ON "foods" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_templates_user_name_ux" ON "meal_templates" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "program_workouts_pos_ux" ON "program_workouts" USING btree ("program_id","position");--> statement-breakpoint
CREATE INDEX "programs_user_ix" ON "programs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_exercises_pos_ux" ON "session_exercises" USING btree ("session_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "session_sets_client_ux" ON "session_sets" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_sets_pos_ux" ON "session_sets" USING btree ("session_exercise_id","set_number");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_client_ux" ON "sessions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "sessions_user_ix" ON "sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_ux" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "water_log_day_ux" ON "water_log" USING btree ("user_id","logged_on");--> statement-breakpoint
CREATE UNIQUE INDEX "weight_log_day_ux" ON "weight_log" USING btree ("user_id","logged_on");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_exercises_pos_ux" ON "workout_exercises" USING btree ("workout_id","position");