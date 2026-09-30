import "dotenv/config";
import { safeSchedulerTick } from "./runner";
import { createLogger } from "@/lib/logger";

const log = createLogger();

void safeSchedulerTick("scheduler-initial");
setInterval(() => {
  void safeSchedulerTick("scheduler");
}, 30_000);
log.info("scheduler started");
