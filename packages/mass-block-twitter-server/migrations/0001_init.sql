-- CreateTable
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
);

-- CreateTable
CREATE TABLE "Tweet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "media" JSONB,
    "publishedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "spamReportCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Tweet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
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

-- CreateIndex
CREATE INDEX "SpamReport_spamUserId_reportUserId_idx" ON "SpamReport"("spamUserId", "reportUserId");

-- CreateIndex
CREATE INDEX "SpamReport_spamUserId_idx" ON "SpamReport"("spamUserId");

-- CreateIndex
CREATE INDEX "SpamReport_reportUserId_idx" ON "SpamReport"("reportUserId");

-- CreateIndex
CREATE INDEX "SpamReport_createdAt_idx" ON "SpamReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SpamReport_spamUserId_reportUserId_spamTweetId_key" ON "SpamReport"("spamUserId", "reportUserId", "spamTweetId");
