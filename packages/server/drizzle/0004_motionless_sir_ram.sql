CREATE TABLE `LLMRequestLog` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`requestType` text NOT NULL,
	`modelName` text NOT NULL,
	`requestTimestamp` text NOT NULL,
	`responseTimestamp` text,
	`latencyMs` integer,
	`promptTokens` integer,
	`completionTokens` integer,
	`totalTokens` integer,
	`estimatedCost` real,
	`prompt` text,
	`completion` text,
	`status` text NOT NULL,
	`errorMessage` text,
	`relatedRecordId` text,
	`relatedRecordType` text,
	`metadata` text,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX `LlmRequestLog_userId_idx` ON `LLMRequestLog` (`userId`);
CREATE INDEX `LlmRequestLog_requestTimestamp_idx` ON `LLMRequestLog` (`requestTimestamp`);
CREATE INDEX `LlmRequestLog_requestType_idx` ON `LLMRequestLog` (`requestType`);
CREATE TABLE `UserSpamAnalysis` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`llmSpamRating` integer NOT NULL,
	`llmSpamExplanation` text NOT NULL,
	`llmAnalyzedAt` text,
	`isSpamByManualReview` integer,
	`manualReviewNotes` text,
	`manualReviewedAt` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `UserSpamAnalysis_userId_key` ON `UserSpamAnalysis` (`userId`);
