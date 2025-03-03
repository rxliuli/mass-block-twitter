CREATE TABLE `ModListRule` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`modListId` text NOT NULL,
	`rule` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`modListId`) REFERENCES `ModList`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX `modListRule_modListId_idx` ON `ModListRule` (`modListId`);
