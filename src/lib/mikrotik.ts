import { createLogger } from "@/lib/logger";

const log = createLogger();

export type DeviceConn = {
  id: string;
  name: string;
  host: string;
  apiPort: number;
  apiUsername: string;
  apiPassword: string;
};

export interface MikrotikAdapter {
  disconnectByMac(device: DeviceConn, mac: string): Promise<{ ok: boolean; detail: string }>;
  ping(device: DeviceConn): Promise<{ ok: boolean; detail: string }>;
}

class MockMikrotik implements MikrotikAdapter {
  async disconnectByMac(device: DeviceConn, mac: string) {
    log.info({ deviceId: device.id, mac }, "mock mikrotik disconnect");
    return { ok: true, detail: "mock-disconnect" };
  }
  async ping(device: DeviceConn) {
    return { ok: true, detail: `mock-ping ${device.host}` };
  }
}

/**
 * RouterOS API is optional. Production operators can replace this adapter
 * with a real TCP API client. Disconnect still works via RADIUS
 * Session-Timeout / Expiration even when API is unreachable.
 */
export function getMikrotikAdapter(): MikrotikAdapter {
  return new MockMikrotik();
}
