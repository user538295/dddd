CREATE TYPE "public"."scan_status" AS ENUM('ready', 'metadata_incomplete', 'excluded', 'missing');--> statement-breakpoint
CREATE TABLE "pull_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"github_node_id" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"state" text NOT NULL,
	"is_draft" boolean DEFAULT false NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"github_updated_at" timestamp with time zone NOT NULL,
	"merged_at" timestamp with time zone,
	"url" text NOT NULL,
	"missing_jira_key" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pull_requests_repository_id_number_unique" UNIQUE("repository_id","number")
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"root_path" text NOT NULL,
	"remote_url" text,
	"owner" text,
	"repo" text,
	"remote_identity" text,
	"team" text,
	"scan_status" "scan_status" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_scanned_at" timestamp with time zone,
	"last_pr_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repositories_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "sync_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_run_id" uuid NOT NULL,
	"repository_id" uuid,
	"source" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"message" text,
	"error_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_errors" ADD CONSTRAINT "sync_errors_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_errors" ADD CONSTRAINT "sync_errors_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;