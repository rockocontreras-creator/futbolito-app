-- CreateEnum
CREATE TYPE "PlayerTag" AS ENUM ('GOLEADOR', 'MURALLA', 'PASADOR', 'HABILIDOSO', 'INCANSABLE', 'ATAJADOR', 'LIDER', 'FAIR_PLAY', 'CHUPON', 'MOCHILA', 'RECLAMON', 'PIERNA_FUERTE');

-- CreateEnum
CREATE TYPE "PlayerRequestStatus" AS ENUM ('OPEN', 'FILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequestResponseStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- AlterEnum
ALTER TYPE "ParticipantStatus" ADD VALUE 'KICKED';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "resultDueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PeerReview" ADD COLUMN     "tags" "PlayerTag"[] DEFAULT ARRAY[]::"PlayerTag"[];

-- CreateTable
CREATE TABLE "ProfileComment" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProfileComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultObjection" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultObjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRequest" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "comunaId" TEXT NOT NULL,
    "venueId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "playersNeeded" INTEGER NOT NULL,
    "positions" "Position"[] DEFAULT ARRAY[]::"Position"[],
    "minRating" INTEGER,
    "maxRating" INTEGER,
    "notes" TEXT,
    "status" "PlayerRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRequestResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "status" "RequestResponseStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerRequestResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileComment_targetUserId_createdAt_idx" ON "ProfileComment"("targetUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResultObjection_matchId_userId_key" ON "ResultObjection"("matchId", "userId");

-- CreateIndex
CREATE INDEX "PlayerRequest_comunaId_status_startsAt_idx" ON "PlayerRequest"("comunaId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "PlayerRequestResponse_userId_idx" ON "PlayerRequestResponse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRequestResponse_requestId_userId_key" ON "PlayerRequestResponse"("requestId", "userId");

-- AddForeignKey
ALTER TABLE "ProfileComment" ADD CONSTRAINT "ProfileComment_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileComment" ADD CONSTRAINT "ProfileComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultObjection" ADD CONSTRAINT "ResultObjection_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultObjection" ADD CONSTRAINT "ResultObjection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRequest" ADD CONSTRAINT "PlayerRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRequest" ADD CONSTRAINT "PlayerRequest_comunaId_fkey" FOREIGN KEY ("comunaId") REFERENCES "Comuna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRequest" ADD CONSTRAINT "PlayerRequest_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRequestResponse" ADD CONSTRAINT "PlayerRequestResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PlayerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRequestResponse" ADD CONSTRAINT "PlayerRequestResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
