CREATE TABLE `impressions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`date` text NOT NULL,
	`rating` real,
	`review` text,
	`reread` integer DEFAULT false NOT NULL,
	`did_not_finish` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
