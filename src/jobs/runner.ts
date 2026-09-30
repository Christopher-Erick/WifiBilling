import { prisma } from "@/lib/db";
import { expireDueSubscriptions } from "@/lib/subscriptions";
import { queryPendingStk, retryActivation } from "@/lib/payments/service";
import { createLogger } from "@/lib/logger";
import { withLock } from "@/lib/redis";

const log = createLogger();

export async function runSchedulerTick() {
  await withLock("scheduler", 50, async () => {
    const expired = await expireDueSubscriptions(prisma);
    const queried = await queryPendingStk(prisma);
    const stuck = await prisma.payment.findMany({
      where: { status: { in: ["PAID", "ACTIVATION_FAILED"] } },
      take: 20,
    });
    let retried = 0;
    for (const p of stuck) {
      try {
        await retryActivation(prisma, p.id);
        retried += 1;
      } catch (err) {
        log.warn({ err, paymentId: p.id }, "activation retry failed");
      }
    }
    log.info({ expired, queried, retried }, "scheduler tick");
  });
}

export async function runWorkerLoop() {
  log.info("worker listening for activation retries");
  await runSchedulerTick();
}

if (require.main === module) {
  const mode = process.argv[2] || "worker";
  if (mode === "scheduler") {
    const tick = async () => {
      try {
        await runSchedulerTick();
      } catch (err) {
        log.error({ err }, "scheduler tick failed");
      }
    };
    void tick();
    setInterval(() => void tick(), 30_000);
  } else {
    void runWorkerLoop().catch((err) => {
      log.error({ err }, "worker failed");
      process.exit(1);
    });
    setInterval(() => {
      void runSchedulerTick().catch((err) => log.error({ err }, "worker tick failed"));
    }, 15_000);
  }
}
