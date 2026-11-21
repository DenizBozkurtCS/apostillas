CREATE TABLE `book_tags` (
	`book_id` integer NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`book_id`, `name`),
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
