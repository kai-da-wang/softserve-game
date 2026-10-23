CREATE TABLE `daily_bests` (
	`player_id` text NOT NULL,
	`day` text NOT NULL,
	`score` integer NOT NULL,
	`achieved_at` integer NOT NULL,
	PRIMARY KEY(`player_id`, `day`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `daily_best_idx` ON `daily_bests` (`day`,`score`,`achieved_at`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`best_score` integer DEFAULT 0 NOT NULL,
	`best_at` integer DEFAULT 0 NOT NULL,
	`skin` text DEFAULT 'vanilla' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `players_best_idx` ON `players` (`best_score`,`best_at`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`score` integer,
	`day` text,
	`outcome` text,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `runs_player_started_idx` ON `runs` (`player_id`,`started_at`);