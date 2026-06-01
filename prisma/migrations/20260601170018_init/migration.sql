-- CreateEnum
CREATE TYPE "Category" AS ENUM ('PURE_KOREAN', 'HANJA', 'FOUR_CHAR_IDIOM', 'PROVERB', 'IDIOM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "korean" TEXT NOT NULL,
    "romanization" TEXT,
    "category" "Category" NOT NULL,
    "definitionEn" TEXT,
    "definitionKo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "timesSeen" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contextSentence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserWord_userId_wordId_key" ON "UserWord"("userId", "wordId");

-- AddForeignKey
ALTER TABLE "UserWord" ADD CONSTRAINT "UserWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWord" ADD CONSTRAINT "UserWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
