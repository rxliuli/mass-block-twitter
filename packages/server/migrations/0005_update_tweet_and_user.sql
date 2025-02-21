-- AlterTable
ALTER TABLE "Tweet" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "Tweet" ADD COLUMN "inReplyToStatusId" TEXT;
ALTER TABLE "Tweet" ADD COLUMN "quotedStatusId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "blueVerified" BOOLEAN;
ALTER TABLE "User" ADD COLUMN "defaultProfile" BOOLEAN;
ALTER TABLE "User" ADD COLUMN "defaultProfileImage" BOOLEAN;
ALTER TABLE "User" ADD COLUMN "followersCount" INTEGER;
ALTER TABLE "User" ADD COLUMN "followingCount" INTEGER;
