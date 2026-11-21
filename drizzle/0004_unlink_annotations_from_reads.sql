-- Quotes and Notes no longer link to a Read: drop their read_id columns.
-- SQLite rebuilds both tables to do that, which drops the search triggers
-- from 0003, so they are recreated below and the index is refilled.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_notes`("id", "book_id", "body", "created_at") SELECT "id", "book_id", "body", "created_at" FROM `notes`;--> statement-breakpoint
DROP TABLE `notes`;--> statement-breakpoint
ALTER TABLE `__new_notes` RENAME TO `notes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`text` text NOT NULL,
	`location` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_quotes`("id", "book_id", "text", "location", "created_at") SELECT "id", "book_id", "text", "location", "created_at" FROM `quotes`;--> statement-breakpoint
DROP TABLE `quotes`;--> statement-breakpoint
ALTER TABLE `__new_quotes` RENAME TO `quotes`;--> statement-breakpoint
CREATE TRIGGER `quotes_fts_ai` AFTER INSERT ON `quotes` BEGIN
	INSERT INTO `annotations_fts` (content, kind, ref_id, book_id)
	VALUES (new.`text`, 'quote', new.`id`, new.`book_id`);
END;
--> statement-breakpoint
CREATE TRIGGER `quotes_fts_ad` AFTER DELETE ON `quotes` BEGIN
	DELETE FROM `annotations_fts` WHERE kind = 'quote' AND ref_id = old.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `quotes_fts_au` AFTER UPDATE ON `quotes` BEGIN
	DELETE FROM `annotations_fts` WHERE kind = 'quote' AND ref_id = old.`id`;
	INSERT INTO `annotations_fts` (content, kind, ref_id, book_id)
	VALUES (new.`text`, 'quote', new.`id`, new.`book_id`);
END;
--> statement-breakpoint
CREATE TRIGGER `notes_fts_ai` AFTER INSERT ON `notes` BEGIN
	INSERT INTO `annotations_fts` (content, kind, ref_id, book_id)
	VALUES (new.`body`, 'note', new.`id`, new.`book_id`);
END;
--> statement-breakpoint
CREATE TRIGGER `notes_fts_ad` AFTER DELETE ON `notes` BEGIN
	DELETE FROM `annotations_fts` WHERE kind = 'note' AND ref_id = old.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `notes_fts_au` AFTER UPDATE ON `notes` BEGIN
	DELETE FROM `annotations_fts` WHERE kind = 'note' AND ref_id = old.`id`;
	INSERT INTO `annotations_fts` (content, kind, ref_id, book_id)
	VALUES (new.`body`, 'note', new.`id`, new.`book_id`);
END;
--> statement-breakpoint
DELETE FROM `annotations_fts`;
--> statement-breakpoint
INSERT INTO `annotations_fts` (content, kind, ref_id, book_id)
	SELECT `text`, 'quote', `id`, `book_id` FROM `quotes`;
--> statement-breakpoint
INSERT INTO `annotations_fts` (content, kind, ref_id, book_id)
	SELECT `body`, 'note', `id`, `book_id` FROM `notes`;
