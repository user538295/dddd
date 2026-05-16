CREATE TABLE "pull_request_review_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"github_comment_id" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pull_request_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"github_review_id" bigint NOT NULL,
	"state" text NOT NULL,
	"submitted_at" timestamp with time zone,
	"author_login" text,
	"author_type" text,
	"is_bot" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "last_review_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pull_request_review_comments" ADD CONSTRAINT "pull_request_review_comments_pull_request_id_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_reviews" ADD CONSTRAINT "pull_request_reviews_pull_request_id_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pull_request_review_comments_unique_github_comment" ON "pull_request_review_comments" USING btree ("pull_request_id","github_comment_id");--> statement-breakpoint
CREATE INDEX "idx_pull_request_review_comments_pr_id" ON "pull_request_review_comments" USING btree ("pull_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pull_request_reviews_unique_github_review" ON "pull_request_reviews" USING btree ("pull_request_id","github_review_id");--> statement-breakpoint
CREATE INDEX "pull_request_reviews_pr_id_idx" ON "pull_request_reviews" USING btree ("pull_request_id");