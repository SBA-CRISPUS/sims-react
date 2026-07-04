import type { School } from "../../types";

export interface ProvisioningContext {
  school: School;

  schoolCode: string;

  startedAt: Date;

  logs: string[];
}