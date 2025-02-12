-- CreateTable
CREATE TABLE "ModList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "subscriptionCount" INTEGER NOT NULL DEFAULT 0,
    "localUserId" TEXT NOT NULL,
    "twitterUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModList_localUserId_fkey" FOREIGN KEY ("localUserId") REFERENCES "LocalUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ModList_twitterUserId_fkey" FOREIGN KEY ("twitterUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModListUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modListId" TEXT NOT NULL,
    "twitterUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModListUser_modListId_fkey" FOREIGN KEY ("modListId") REFERENCES "ModList" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ModListUser_twitterUserId_fkey" FOREIGN KEY ("twitterUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModListSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modListId" TEXT NOT NULL,
    "localUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModListSubscription_modListId_fkey" FOREIGN KEY ("modListId") REFERENCES "ModList" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ModListSubscription_localUserId_fkey" FOREIGN KEY ("localUserId") REFERENCES "LocalUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ModList_name_idx" ON "ModList"("name");

-- CreateIndex
CREATE INDEX "ModList_description_idx" ON "ModList"("description");
