-- v4 (ADR-0006): the reader chose to start from an empty library rather than
-- migrate Reads into the new statuses, so everything is removed first.
DELETE FROM `shelf_books`;--> statement-breakpoint
DELETE FROM `shelves`;--> statement-breakpoint
DELETE FROM `book_tags`;--> statement-breakpoint
DELETE FROM `quotes`;--> statement-breakpoint
DELETE FROM `notes`;--> statement-breakpoint
DELETE FROM `reads`;--> statement-breakpoint
DELETE FROM `books`;--> statement-breakpoint
DELETE FROM `sqlite_sequence` WHERE `name` IN ('books', 'reads', 'quotes', 'notes', 'shelves');--> statement-breakpoint
DROP TABLE `reads`;--> statement-breakpoint
ALTER TABLE `books` ADD `want_since` text;--> statement-breakpoint
ALTER TABLE `books` ADD `reading_since` text;--> statement-breakpoint
ALTER TABLE `books` ADD `finished_since` text;--> statement-breakpoint
ALTER TABLE `books` ADD `rating` real;