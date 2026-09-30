import "dotenv/config";
import { safeSchedulerTick } from "./runner";
import { createLogger } from "@/lib/logger";

const log = createLogger();

log.info("worker started");
void safeSchedulerTick("worker-initial");
setInterval(() => {
  void safeSchedulerTick("worker");
}, 15_000);
