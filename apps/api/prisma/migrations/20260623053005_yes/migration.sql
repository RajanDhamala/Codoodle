/*
  Warnings:

  - You are about to drop the column `GithubProviderId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[githubProviderId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_GithubProviderId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "GithubProviderId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "githubProviderId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_githubProviderId_key" ON "User"("githubProviderId");
