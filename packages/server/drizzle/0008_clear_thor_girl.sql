PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_UserSpamAnalysis` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`llmSpamRating` integer,
	`llmSpamExplanation` text,
	`llmAnalyzedAt` text,
	`isSpamByManualReview` integer,
	`manualReviewNotes` text,
	`manualReviewedAt` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_UserSpamAnalysis`("id", "userId", "llmSpamRating", "llmSpamExplanation", "llmAnalyzedAt", "isSpamByManualReview", "manualReviewNotes", "manualReviewedAt", "createdAt", "updatedAt") SELECT "id", "userId", "llmSpamRating", "llmSpamExplanation", "llmAnalyzedAt", "isSpamByManualReview", "manualReviewNotes", "manualReviewedAt", "createdAt", "updatedAt" FROM `UserSpamAnalysis`;--> statement-breakpoint
DROP TABLE `UserSpamAnalysis`;--> statement-breakpoint
ALTER TABLE `__new_UserSpamAnalysis` RENAME TO `UserSpamAnalysis`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `UserSpamAnalysis_userId_key` ON `UserSpamAnalysis` (`userId`);