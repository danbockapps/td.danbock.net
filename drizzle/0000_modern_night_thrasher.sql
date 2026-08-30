CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tournament_id` integer NOT NULL,
	`round` integer NOT NULL,
	`uscf_id` text NOT NULL,
	`name` text NOT NULL,
	`rating` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entries_tournament_round_idx` ON `entries` (`tournament_id`,`round`);--> statement-breakpoint
CREATE UNIQUE INDEX `entries_tournament_round_uscf_unique` ON `entries` (`tournament_id`,`round`,`uscf_id`);--> statement-breakpoint
CREATE TABLE `pairings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tournament_id` integer NOT NULL,
	`round` integer NOT NULL,
	`board` integer NOT NULL,
	`white_entry_id` integer,
	`black_entry_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`white_entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`black_entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pairings_tournament_round_idx` ON `pairings` (`tournament_id`,`round`);--> statement-breakpoint
CREATE UNIQUE INDEX `pairings_tournament_round_board_unique` ON `pairings` (`tournament_id`,`round`,`board`);--> statement-breakpoint
CREATE TABLE `results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pairing_id` integer NOT NULL,
	`outcome` text NOT NULL,
	`entered_at` integer NOT NULL,
	FOREIGN KEY (`pairing_id`) REFERENCES `pairings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `results_pairing_id_unique` ON `results` (`pairing_id`);--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`num_rounds` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tournaments_slug_unique` ON `tournaments` (`slug`);