import "dotenv/config";
import { runSchedulerTick } from "./runner";
import { createLogger } from "@/lib/logger";

const log = createLogger();

log.info("worker started");
void runSchedulerTick().catch((err) => log.error({ err }, "worker initial tick failed"));
setInterval(() => {
  void runSchedulerTick().catch((err) => log.error({ err }, "worker tick failed"));
}, 15_000);
