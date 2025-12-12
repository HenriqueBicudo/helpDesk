CREATE TABLE "sla_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" varchar(255) NOT NULL,
	"priority" varchar(20) NOT NULL,
	"response_time_minutes" integer NOT NULL,
	"solution_time_minutes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"contract_number" varchar(255) NOT NULL,
	"company_id" integer NOT NULL,
	"service_package_id" varchar(255),
	"type" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"renewal_date" timestamp,
	"monthly_value" numeric(10, 2) NOT NULL,
	"setup_value" numeric(10, 2),
	"hourly_rate" numeric(10, 2),
	"included_hours" integer NOT NULL,
	"used_hours" numeric(10, 2) NOT NULL,
	"reset_day" integer NOT NULL,
	"last_reset" timestamp NOT NULL,
	"allow_overage" boolean NOT NULL,
	"auto_renewal" boolean NOT NULL,
	"notify_threshold" integer,
	"description" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"calendar_id" integer
);
--> statement-breakpoint
CREATE TABLE "calendars" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"working_hours" jsonb NOT NULL,
	"holidays" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_templates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sla_templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(100) NOT NULL,
	"rules" text NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_interactions" ADD COLUMN "contract_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "company_id" integer;--> statement-breakpoint
ALTER TABLE "sla_rules" ADD CONSTRAINT "sla_rules_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;