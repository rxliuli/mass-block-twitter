PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "screenName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "profileImageUrl" TEXT,
    "accountCreatedAt" DATETIME,
    "spamReportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
, "blueVerified" BOOLEAN, "defaultProfile" BOOLEAN, "defaultProfileImage" BOOLEAN, "followersCount" INTEGER, "followingCount" INTEGER, `location` text, `url` text);
CREATE TABLE "Tweet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "media" JSONB,
    "publishedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "spamReportCount" INTEGER NOT NULL DEFAULT 0, "conversationId" TEXT, "inReplyToStatusId" TEXT, "quotedStatusId" TEXT, "lang" TEXT,
    CONSTRAINT "Tweet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "SpamReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spamUserId" TEXT NOT NULL,
    "reportUserId" TEXT NOT NULL,
    "spamTweetId" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SpamReport_spamUserId_fkey" FOREIGN KEY ("spamUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SpamReport_reportUserId_fkey" FOREIGN KEY ("reportUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SpamReport_spamTweetId_fkey" FOREIGN KEY ("spamTweetId") REFERENCES "Tweet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "localUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_localUserId_fkey" FOREIGN KEY ("localUserId") REFERENCES "LocalUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "LocalUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLogin" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE "ModList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "subscriptionCount" INTEGER NOT NULL DEFAULT 0,
    "localUserId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "twitterUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModList_localUserId_fkey" FOREIGN KEY ("localUserId") REFERENCES "LocalUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ModList_twitterUserId_fkey" FOREIGN KEY ("twitterUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "ModListUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modListId" TEXT NOT NULL,
    "twitterUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModListUser_modListId_fkey" FOREIGN KEY ("modListId") REFERENCES "ModList" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ModListUser_twitterUserId_fkey" FOREIGN KEY ("twitterUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "ModListSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modListId" TEXT NOT NULL,
    "localUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL, `action` text,
    CONSTRAINT "ModListSubscription_modListId_fkey" FOREIGN KEY ("modListId") REFERENCES "ModList" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ModListSubscription_localUserId_fkey" FOREIGN KEY ("localUserId") REFERENCES "LocalUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE `ModListRule` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`modListId` text NOT NULL,
	`rule` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`modListId`) REFERENCES `ModList`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE "__drizzle_migrations" (
			id SERIAL PRIMARY KEY,
			hash text NOT NULL,
			created_at numeric
		);
CREATE INDEX "SpamReport_spamUserId_reportUserId_idx" ON "SpamReport"("spamUserId", "reportUserId");
CREATE INDEX "SpamReport_spamUserId_idx" ON "SpamReport"("spamUserId");
CREATE INDEX "SpamReport_reportUserId_idx" ON "SpamReport"("reportUserId");
CREATE INDEX "SpamReport_createdAt_idx" ON "SpamReport"("createdAt");
CREATE UNIQUE INDEX "SpamReport_spamUserId_reportUserId_spamTweetId_key" ON "SpamReport"("spamUserId", "reportUserId", "spamTweetId");
CREATE UNIQUE INDEX "LocalUser_email_key" ON "LocalUser"("email");
CREATE INDEX "ModList_name_idx" ON "ModList"("name");
CREATE INDEX "ModList_description_idx" ON "ModList"("description");
CREATE UNIQUE INDEX "ModListUser_modListId_twitterUserId_key" ON "ModListUser"("modListId", "twitterUserId");
CREATE UNIQUE INDEX "ModListSubscription_modListId_localUserId_key" ON "ModListSubscription"("modListId", "localUserId");
CREATE INDEX `tweet_spamReportCount_idx` ON `Tweet` (`spamReportCount`);
CREATE INDEX `user_spamReportCount_idx` ON `User` (`spamReportCount`);
CREATE INDEX `modListRule_modListId_idx` ON `ModListRule` (`modListId`);
