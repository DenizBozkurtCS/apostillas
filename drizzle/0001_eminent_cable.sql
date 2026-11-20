CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`read_id` integer,
	`body` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`read_id`) REFERENCES `reads`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`read_id` integer,
	`text` text NOT NULL,
	`location` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`read_id`) REFERENCES `reads`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `reads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`start_date` text,
	`end_date` text,
	`outcome` text NOT NULL,
	`rating` integer,
	`read_before` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `books` ADD `authors` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `books` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `books` ADD `work_id` text;--> statement-breakpoint
ALTER TABLE `books` ADD `why_recommended` text;--> statement-breakpoint
ALTER TABLE `books` ADD `isbn` text;--> statement-breakpoint
ALTER TABLE `books` ADD `page_count` integer;--> statement-breakpoint
ALTER TABLE `books` ADD `cover_path` text;