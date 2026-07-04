import type { ProvisioningContext } from "./ProvisioningContext";

export interface ProvisioningStep {
  name: string;

  provision(
    context: ProvisioningContext
  ): Promise<void>;
}