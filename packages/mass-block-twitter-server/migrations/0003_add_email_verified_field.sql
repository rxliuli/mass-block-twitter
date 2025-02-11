-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LocalUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLogin" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_LocalUser" ("createdAt", "email", "id", "isPro", "lastLogin", "password", "updatedAt") SELECT "createdAt", "email", "id", "isPro", "lastLogin", "password", "updatedAt" FROM "LocalUser";
DROP TABLE "LocalUser";
ALTER TABLE "new_LocalUser" RENAME TO "LocalUser";
CREATE UNIQUE INDEX "LocalUser_email_key" ON "LocalUser"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
