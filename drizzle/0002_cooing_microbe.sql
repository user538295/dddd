ALTER TABLE "pull_requests" ADD COLUMN "additions" integer;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "deletions" integer;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "changed_files" integer;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "merge_commit_sha" text;