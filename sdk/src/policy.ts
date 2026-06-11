import { parseUnits } from "viem";
import { PolicyService, makeRuleBrain } from "./policy-service.js";
import { makeVeniceBrain } from "./venice.js";
import { env } from "./env.js";
import type { Context } from "./setup.js";

/**
 * Builds the policy service for the demo. If VENICE_API_KEY is set, the real Venice brain gates
 * every payment (M4); otherwise the deterministic rule stub is used so the flow runs offline.
 */
export function buildPolicyService(ctx: Context): { service: PolicyService; mode: "venice" | "stub" } {
  if (env.veniceApiKey) {
    const brain = makeVeniceBrain({
      apiKey: env.veniceApiKey,
      baseUrl: env.veniceBaseUrl,
      model: env.veniceModel,
    });
    return { service: new PolicyService(ctx.policyKey, brain), mode: "venice" };
  }
  const brain = makeRuleBrain({ allowRecipients: [ctx.merchant], maxAmount: parseUnits("100", 6) });
  return { service: new PolicyService(ctx.policyKey, brain), mode: "stub" };
}
