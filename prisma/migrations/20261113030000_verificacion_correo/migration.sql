-- CreateTable
CREATE TABLE "EmailCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailCode_email_createdAt_idx" ON "EmailCode"("email", "createdAt");

-- Las cuentas con contraseña creadas antes de pedir el código quedan como confirmadas,
-- para que puedan seguir entrando.
UPDATE "User" SET "emailVerified" = "createdAt" WHERE "passwordHash" IS NOT NULL AND "emailVerified" IS NULL;
