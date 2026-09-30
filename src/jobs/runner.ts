import { prisma } from "@/lib/db";
import { expireDueSubscriptions } from "@/lib/subscriptions";
import { queryPendingStk, retryActivation } from "@/lib/payments/service";
import { createLogger } from "@/lib/logger";
import { withLock } from "@/lib/redis";

const log = createLogger();

function isDependencyError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /P1001|P1017|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Can't reach database|Redis|Invalid environment|mock is not allowed|SESSION_SECRET|INTERNAL_API_TOKEN/i.test(
    message,
  );
}

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

let failStreak = 0;

export async function safeSchedulerTick(label: string) {
  try {
    await runSchedulerTick();
    failStreak = 0;
  } catch (err) {
    failStreak += 1;
    if (isDependencyError(err)) {
      if (failStreak === 1 || failStreak % 20 === 0) {
        log.warn(
          { err: err instanceof Error ? err.message : err, failStreak, label },
          "scheduler skipped; postgres or redis not ready",
        );
      }
      return;
    }
    log.error({ err, label }, "scheduler tick failed");
  }
}

export async function runWorkerLoop() {
  log.info("worker listening for activation retries");
  await safeSchedulerTick("worker");
}
