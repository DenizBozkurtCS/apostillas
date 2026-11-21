-- Full-text search across Quotes and Notes (apostillas-v1/08).
--
-- A single FTS5 index covers both Quotes and Notes so one query box can search
-- them together. `content` is the searchable text (a Quote's verbatim text or a
-- Note's Markdown body); the other columns are carried for display and are not
-- indexed. Rows are identified by (kind, ref_id) rather than rowid so a Quote
-- and a Note that happen to share an id never collide.
CREATE VIRTUAL TABLE `annotations_fts` USING fts5(
	content,
	kind UNINDEXED,
	ref_id UNINDEXED,
	book_id UNINDEXED,
	tokenize = 'unicode61'
);
--> statement-breakpoint
-- Keep the index in sync automatically. These AFTER triggers also fire when a
-- Quote or Note is removed by the Book delete cascade, so deleting a Book clears
-- its annotations from the index too.
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
-- Backfill any Quotes and Notes that already exist.
INSERT INTO `annotations_fts` (content, kind, ref_id, book_id)
	SELECT `text`, 'quote', `id`, `book_id` FROM `quotes`;
--> statement-breakpoint
INSERT INTO `annotations_fts` (content, kind, ref_id, book_id)
	SELECT `body`, 'note', `id`, `book_id` FROM `notes`;
