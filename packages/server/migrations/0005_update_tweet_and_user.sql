-- AlterTable
ALTER TABLE "Tweet" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "Tweet" ADD COLUMN "inReplyToStatusId" TEXT;
ALTER TABLE "Tweet" ADD COLUMN "quotedStatusId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "screenName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "profileImageUrl" TEXT,
    "accountCreatedAt" DATETIME,
    "spamReportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "blueVerified" BOOLEAN NOT NULL DEFAULT false,
    "defaultProfile" BOOLEAN NOT NULL DEFAULT false,
    "defaultProfileImage" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("accountCreatedAt", "createdAt", "description", "id", "name", "profileImageUrl", "screenName", "spamReportCount", "updatedAt") SELECT "accountCreatedAt", "createdAt", "description", "id", "name", "profileImageUrl", "screenName", "spamReportCount", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
