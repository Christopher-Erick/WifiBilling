-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'NETWORK_OPERATOR', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'STK_SENT', 'STK_FAILED', 'PAID', 'FAILED', 'CANCELLED', 'ACTIVATING', 'ACTIVATED', 'ACTIVATION_FAILED');

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('STK_PUSH', 'C2B_PAYBILL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'QUEUED', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RenewalMode" AS ENUM ('EXTEND', 'QUEUE');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceKes" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "downloadKbps" INTEGER NOT NULL,
    "uploadKbps" INTEGER NOT NULL,
    "burstDownloadKbps" INTEGER,
    "simultaneousUse" INTEGER NOT NULL DEFAULT 1,
    "renewalMode" "RenewalMode" NOT NULL DEFAULT 'EXTEND',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mikrotik_devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "apiPort" INTEGER NOT NULL DEFAULT 8728,
    "apiUsername" TEXT NOT NULL,
    "apiPassword" TEXT NOT NULL,
    "radiusSecret" TEXT NOT NULL,
    "nasIdentifier" TEXT NOT NULL,
    "walledGarden" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mikrotik_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "channel" "PaymentChannel" NOT NULL DEFAULT 'STK_PUSH',
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "amountKes" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "merchantRequestId" TEXT,
    "checkoutRequestId" TEXT,
    "mpesaReceipt" TEXT,
    "resultCode" TEXT,
    "resultDesc" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "hotspot" JSONB NOT NULL,
    "rawCallback" JSONB,
    "failureReason" TEXT,
    "radiusProvisionedAt" TIMESTAMP(3),
    "accessConfirmedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "renewalMode" "RenewalMode" NOT NULL,
    "radiusUsername" TEXT NOT NULL,
    "radiusPassword" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "nas" (
    "id" SERIAL NOT NULL,
    "nasname" VARCHAR(128) NOT NULL,
    "shortname" VARCHAR(32),
    "type" VARCHAR(30) DEFAULT 'other',
    "ports" INTEGER,
    "secret" VARCHAR(60) NOT NULL DEFAULT 'secret',
    "server" VARCHAR(64),
    "community" VARCHAR(50),
    "description" VARCHAR(200),

    CONSTRAINT "nas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radcheck" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(64) NOT NULL DEFAULT '',
    "attribute" VARCHAR(64) NOT NULL DEFAULT '',
    "op" CHAR(2) NOT NULL DEFAULT ':=',
    "value" VARCHAR(253) NOT NULL DEFAULT '',

    CONSTRAINT "radcheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radreply" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(64) NOT NULL DEFAULT '',
    "attribute" VARCHAR(64) NOT NULL DEFAULT '',
    "op" CHAR(2) NOT NULL DEFAULT ':=',
    "value" VARCHAR(253) NOT NULL DEFAULT '',

    CONSTRAINT "radreply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radusergroup" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(64) NOT NULL DEFAULT '',
    "groupname" VARCHAR(64) NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "radusergroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radacct" (
    "radacctid" BIGSERIAL NOT NULL,
    "acctsessionid" VARCHAR(64) NOT NULL DEFAULT '',
    "acctuniqueid" VARCHAR(32) NOT NULL DEFAULT '',
    "username" VARCHAR(64) NOT NULL DEFAULT '',
    "realm" VARCHAR(64),
    "nasipaddress" VARCHAR(15) NOT NULL DEFAULT '',
    "nasportid" VARCHAR(32),
    "nasporttype" VARCHAR(32),
    "acctstarttime" TIMESTAMP(3),
    "acctupdatetime" TIMESTAMP(3),
    "acctstoptime" TIMESTAMP(3),
    "acctinterval" INTEGER,
    "acctsessiontime" INTEGER,
    "acctauthentic" VARCHAR(32),
    "connectinfo_start" VARCHAR(128),
    "connectinfo_stop" VARCHAR(128),
    "acctinputoctets" BIGINT,
    "acctoutputoctets" BIGINT,
    "calledstationid" VARCHAR(50) NOT NULL DEFAULT '',
    "callingstationid" VARCHAR(50) NOT NULL DEFAULT '',
    "acctterminatecause" VARCHAR(32) NOT NULL DEFAULT '',
    "servicetype" VARCHAR(32),
    "framedprotocol" VARCHAR(32),
    "framedipaddress" VARCHAR(15) NOT NULL DEFAULT '',
    "framedipv6address" VARCHAR(45),
    "framedipv6prefix" VARCHAR(45),
    "framedinterfaceid" VARCHAR(44),
    "delegatedipv6prefix" VARCHAR(45),
    "class" VARCHAR(64),

    CONSTRAINT "radacct_pkey" PRIMARY KEY ("radacctid")
);

-- CreateTable
CREATE TABLE "radpostauth" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "pass" VARCHAR(64) NOT NULL,
    "reply" VARCHAR(32) NOT NULL,
    "authdate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "class" VARCHAR(64),

    CONSTRAINT "radpostauth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radgroupcheck" (
    "id" SERIAL NOT NULL,
    "groupname" VARCHAR(64) NOT NULL DEFAULT '',
    "attribute" VARCHAR(64) NOT NULL DEFAULT '',
    "op" CHAR(2) NOT NULL DEFAULT ':=',
    "value" VARCHAR(253) NOT NULL DEFAULT '',

    CONSTRAINT "radgroupcheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radgroupreply" (
    "id" SERIAL NOT NULL,
    "groupname" VARCHAR(64) NOT NULL DEFAULT '',
    "attribute" VARCHAR(64) NOT NULL DEFAULT '',
    "op" CHAR(2) NOT NULL DEFAULT ':=',
    "value" VARCHAR(253) NOT NULL DEFAULT '',

    CONSTRAINT "radgroupreply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "mikrotik_devices_nasIdentifier_key" ON "mikrotik_devices"("nasIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "payments_checkoutRequestId_key" ON "payments"("checkoutRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_mpesaReceipt_key" ON "payments"("mpesaReceipt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payments_phone_createdAt_idx" ON "payments"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "payments_deviceId_status_idx" ON "payments"("deviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paymentId_key" ON "subscriptions"("paymentId");

-- CreateIndex
CREATE INDEX "subscriptions_status_expiresAt_idx" ON "subscriptions"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "subscriptions_radiusUsername_idx" ON "subscriptions"("radiusUsername");

-- CreateIndex
CREATE INDEX "subscriptions_customerId_deviceId_status_idx" ON "subscriptions"("customerId", "deviceId", "status");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "radcheck_username" ON "radcheck"("username");

-- CreateIndex
CREATE INDEX "radreply_username" ON "radreply"("username");

-- CreateIndex
CREATE INDEX "radusergroup_username" ON "radusergroup"("username");

-- CreateIndex
CREATE UNIQUE INDEX "radacct_acctuniqueid_key" ON "radacct"("acctuniqueid");

-- CreateIndex
CREATE INDEX "radacct_username" ON "radacct"("username");

-- CreateIndex
CREATE INDEX "radacct_framedipaddress" ON "radacct"("framedipaddress");

-- CreateIndex
CREATE INDEX "radacct_acctsessionid" ON "radacct"("acctsessionid");

-- CreateIndex
CREATE INDEX "radacct_acctstarttime" ON "radacct"("acctstarttime");

-- CreateIndex
CREATE INDEX "radacct_acctstoptime" ON "radacct"("acctstoptime");

-- CreateIndex
CREATE INDEX "radacct_nasipaddress" ON "radacct"("nasipaddress");

-- CreateIndex
CREATE INDEX "radacct_callingstationid" ON "radacct"("callingstationid");

-- CreateIndex
CREATE INDEX "radgroupcheck_groupname" ON "radgroupcheck"("groupname");

-- CreateIndex
CREATE INDEX "radgroupreply_groupname" ON "radgroupreply"("groupname");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "mikrotik_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "mikrotik_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
