import "dotenv/config";
import { runSchedulerTick } from "./runner";
import { createLogger } from "@/lib/logger";

const log = createLogger();

async function tick() {
  try {
    await runSchedulerTick();
  } catch (err) {
    log.error({ err }, "scheduler tick failed");
  }
}

void tick();
setInterval(() => void tick(), 30_000);
log.info("scheduler started");
