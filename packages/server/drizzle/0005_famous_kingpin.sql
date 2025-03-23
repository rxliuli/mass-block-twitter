CREATE TABLE `Feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`localUserId` text,
	`reason` text NOT NULL,
	`suggestion` text,
	`context` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`localUserId`) REFERENCES `LocalUser`(`id`) ON UPDATE no action ON DELETE no action
);