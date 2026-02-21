CREATE TABLE `analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_url` text NOT NULL,
	`pain_point` text NOT NULL,
	`analysis_type` text NOT NULL,
	`result` text,
	`mermaid_code` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repo_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_full_name` text NOT NULL,
	`file_tree` text,
	`dependencies` text,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repo_cache_repo_full_name_unique` ON `repo_cache` (`repo_full_name`);