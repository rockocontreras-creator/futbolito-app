-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Commendation" AS ENUM ('COMPANERO', 'LIDER', 'CRACK');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PeerReview" ADD COLUMN     "commends" "Commendation"[] DEFAULT ARRAY[]::"Commendation"[],
ALTER COLUMN "score" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MatchSeries" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchLineup" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "side" "Side" NOT NULL,
    "formation" TEXT NOT NULL,
    "slots" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JoinRequest_matchId_status_idx" ON "JoinRequest"("matchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_matchId_userId_key" ON "JoinRequest"("matchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchLineup_matchId_side_key" ON "MatchLineup"("matchId", "side");

-- CreateIndex
CREATE INDEX "AdminLog_createdAt_idx" ON "AdminLog"("createdAt");

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Las valoraciones antiguas con estrellas pasan a recomendaciones:
-- 4 o 5 estrellas (o "Fair play") = Buen compañero, etiqueta "Líder" = Líder, 5 estrellas = Crack.
UPDATE "PeerReview" SET "commends" =
  (CASE WHEN "score" >= 4 OR 'FAIR_PLAY' = ANY("tags") THEN ARRAY['COMPANERO']::"Commendation"[] ELSE ARRAY[]::"Commendation"[] END)
  || (CASE WHEN 'LIDER' = ANY("tags") THEN ARRAY['LIDER']::"Commendation"[] ELSE ARRAY[]::"Commendation"[] END)
  || (CASE WHEN "score" = 5 THEN ARRAY['CRACK']::"Commendation"[] ELSE ARRAY[]::"Commendation"[] END)
WHERE "score" IS NOT NULL;
