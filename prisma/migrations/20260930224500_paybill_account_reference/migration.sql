-- AlterTable
ALTER TABLE "payments" ADD COLUMN "accountReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_accountReference_key" ON "payments"("accountReference");
