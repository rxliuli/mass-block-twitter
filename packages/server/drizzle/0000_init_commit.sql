CREATE TABLE `LocalUser` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`lastLogin` text NOT NULL,
	`isPro` integer DEFAULT false,
	`emailVerified` integer DEFAULT false
);
--> statement-breakpoint
CREATE UNIQUE INDEX `LocalUser_email_unique` ON `LocalUser` (`email`);--> statement-breakpoint
CREATE TABLE `ModList` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`avatar` text,
	`userCount` integer DEFAULT 0,
	`subscriptionCount` integer DEFAULT 0,
	`localUserId` text NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`twitterUserId` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`localUserId`) REFERENCES `LocalUser`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`twitterUserId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `modList_name_idx` ON `ModList` (`name`);--> statement-breakpoint
CREATE INDEX `modList_description_idx` ON `ModList` (`description`);--> statement-breakpoint
CREATE TABLE `ModListSubscription` (
	`id` text PRIMARY KEY NOT NULL,
	`modListId` text NOT NULL,
	`localUserId` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`modListId`) REFERENCES `ModList`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`localUserId`) REFERENCES `LocalUser`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `modListSubscription_unique` ON `ModListSubscription` (`modListId`,`localUserId`);--> statement-breakpoint
CREATE TABLE `ModListUser` (
	`id` text PRIMARY KEY NOT NULL,
	`modListId` text NOT NULL,
	`twitterUserId` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`modListId`) REFERENCES `ModList`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`twitterUserId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `modListUser_unique` ON `ModListUser` (`id`,`twitterUserId`);--> statement-breakpoint
CREATE TABLE `Payment` (
	`id` text PRIMARY KEY NOT NULL,
	`localUserId` text NOT NULL,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`status` text NOT NULL,
	`countryCode` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`localUserId`) REFERENCES `LocalUser`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `SpamReport` (
	`id` text PRIMARY KEY NOT NULL,
	`spamUserId` text NOT NULL,
	`reportUserId` text NOT NULL,
	`spamTweetId` text NOT NULL,
	`pageType` text,
	`pageUrl` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`spamUserId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reportUserId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spamTweetId`) REFERENCES `Tweet`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spamReport_unique` ON `SpamReport` (`spamUserId`,`reportUserId`,`spamTweetId`);--> statement-breakpoint
CREATE INDEX `spamUser_idx` ON `SpamReport` (`spamUserId`);--> statement-breakpoint
CREATE INDEX `reportUser_idx` ON `SpamReport` (`reportUserId`);--> statement-breakpoint
CREATE INDEX `spamUser_report_idx` ON `SpamReport` (`spamUserId`,`reportUserId`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `SpamReport` (`createdAt`);--> statement-breakpoint
CREATE TABLE `Tweet` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text,
	`media` text,
	`publishedAt` text,
	`userId` text NOT NULL,
	`conversationId` text,
	`inReplyToStatusId` text,
	`quotedStatusId` text,
	`lang` text DEFAULT 'en',
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`spamReportCount` integer DEFAULT 0,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tweet_spamReportCount_idx` ON `Tweet` (`spamReportCount`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`screenName` text NOT NULL,
	`name` text,
	`description` text,
	`profileImageUrl` text,
	`accountCreatedAt` text,
	`spamReportCount` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`followersCount` integer DEFAULT 0 NOT NULL,
	`followingCount` integer DEFAULT 0 NOT NULL,
	`blueVerified` integer DEFAULT false NOT NULL,
	`defaultProfile` integer DEFAULT true NOT NULL,
	`defaultProfileImage` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `user_spamReportCount_idx` ON `User` (`spamReportCount`);