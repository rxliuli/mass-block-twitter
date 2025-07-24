DROP TABLE IF EXISTS "UserSpamAnalysis" CASCADE;
DROP TABLE IF EXISTS "Feedback" CASCADE;
DROP TABLE IF EXISTS "LLMRequestLog" CASCADE;
DROP TABLE IF EXISTS "ModListRule" CASCADE;
DROP TABLE IF EXISTS "ModListSubscription" CASCADE;
DROP TABLE IF EXISTS "ModListUser" CASCADE;
DROP TABLE IF EXISTS "ModList" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;
DROP TABLE IF EXISTS "SpamReport" CASCADE;
DROP TABLE IF EXISTS "Tweet" CASCADE;
DROP TABLE IF EXISTS "LocalUser" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "screenName" TEXT NOT NULL,
    -- "name" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "profileImageUrl" TEXT,
    "accountCreatedAt" TIMESTAMP,
    "spamReportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "blueVerified" BOOLEAN,
    "defaultProfile" BOOLEAN,
    "defaultProfileImage" BOOLEAN,
    "followersCount" INTEGER,
    "followingCount" INTEGER,
    "location" TEXT,
    "url" TEXT
);

CREATE TABLE IF NOT EXISTS "LocalUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "lastLogin" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "Tweet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    -- "text" TEXT NOT NULL,
    "text" TEXT,
    "media" JSONB,
    "publishedAt" TIMESTAMPTZ NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "spamReportCount" INTEGER NOT NULL DEFAULT 0,
    "conversationId" TEXT,
    "inReplyToStatusId" TEXT,
    "quotedStatusId" TEXT,
    "lang" TEXT
    -- CONSTRAINT "Tweet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SpamReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spamUserId" TEXT NOT NULL,
    "reportUserId" TEXT NOT NULL,
    "spamTweetId" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "SpamReport_spamUserId_fkey" FOREIGN KEY ("spamUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SpamReport_reportUserId_fkey" FOREIGN KEY ("reportUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SpamReport_spamTweetId_fkey" FOREIGN KEY ("spamTweetId") REFERENCES "Tweet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "localUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "Payment_localUserId_fkey" FOREIGN KEY ("localUserId") REFERENCES "LocalUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ModList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "subscriptionCount" INTEGER NOT NULL DEFAULT 0,
    "localUserId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "twitterUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ModList_localUserId_fkey" FOREIGN KEY ("localUserId") REFERENCES "LocalUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ModList_twitterUserId_fkey" FOREIGN KEY ("twitterUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ModListUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modListId" TEXT NOT NULL,
    "twitterUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ModListUser_modListId_fkey" FOREIGN KEY ("modListId") REFERENCES "ModList" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ModListUser_twitterUserId_fkey" FOREIGN KEY ("twitterUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ModListSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modListId" TEXT NOT NULL,
    "localUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "action" TEXT NOT NULL,
    CONSTRAINT "ModListSubscription_modListId_fkey" FOREIGN KEY ("modListId") REFERENCES "ModList" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ModListSubscription_localUserId_fkey" FOREIGN KEY ("localUserId") REFERENCES "LocalUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ModListRule" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "modListId" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    FOREIGN KEY ("modListId") REFERENCES "ModList"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "LLMRequestLog" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "userId" TEXT,
    "requestType" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "requestTimestamp" TIMESTAMPTZ NOT NULL,
    "responseTimestamp" TIMESTAMP,
    "latencyMs" INTEGER,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "estimatedCost" DOUBLE PRECISION,
    "prompt" TEXT,
    "completion" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "relatedRecordId" TEXT,
    "relatedRecordType" TEXT,
    "metadata" TEXT,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "Feedback" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "localUserId" TEXT,
    "reason" TEXT NOT NULL,
    "suggestion" TEXT,
    "context" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "email" TEXT,
    FOREIGN KEY ("localUserId") REFERENCES "LocalUser"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "UserSpamAnalysis" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "userId" TEXT NOT NULL,
    "llmSpamRating" INTEGER,
    "llmSpamExplanation" TEXT,
    "llmAnalyzedAt" TIMESTAMP,
    "isSpamByManualReview" BOOLEAN,
    "manualReviewNotes" TEXT,
    "manualReviewedAt" TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

-- 创建索引
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
CREATE INDEX "tweet_spamReportCount_idx" ON "Tweet" ("spamReportCount");
CREATE INDEX "user_spamReportCount_idx" ON "User" ("spamReportCount");
CREATE INDEX "modListRule_modListId_idx" ON "ModListRule" ("modListId");
CREATE INDEX "LlmRequestLog_userId_idx" ON "LLMRequestLog" ("userId");
CREATE INDEX "LlmRequestLog_requestTimestamp_idx" ON "LLMRequestLog" ("requestTimestamp");
CREATE INDEX "LlmRequestLog_requestType_idx" ON "LLMRequestLog" ("requestType");
CREATE INDEX "ModListUser_modListId_id_idx" ON "ModListUser" ("modListId","id");
CREATE UNIQUE INDEX "UserSpamAnalysis_userId_key" ON "UserSpamAnalysis" ("userId");
CREATE INDEX "tweet_userId_idx" ON "Tweet" ("userId");