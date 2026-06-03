-- CreateTable
CREATE TABLE "Hanja" (
    "character" TEXT NOT NULL,
    "meaningKo" TEXT NOT NULL,
    "meaningEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hanja_pkey" PRIMARY KEY ("character")
);
