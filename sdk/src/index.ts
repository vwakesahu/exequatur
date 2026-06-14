/**
 * Public entrypoint for the firewall SDK. This barrel is server-oriented: it transitively imports
 * {env} (dotenv + private keys), so it must only be used from Node (the console's route handlers,
 * the e2e). Browser code imports the pure primitives it needs straight from
 * `@metamask/smart-accounts-kit` (createDelegation, toMetaMaskSmartAccount, getSmartAccountsEnvironment,
 * createCaveat) and shares the action-hash / policy definitions through the modules below.
 *
 * A later phase splits this into a browser-safe entry and a server-only entry; for now the split is
 * by convention (do not import this from a client component).
 */

// The canonical action hash both the contract's golden-vector test and the off-chain policy agree on.
export { computeActionHash } from "./actionHash.js";

// Off-chain firewall: policy service, brains, and the Venice-backed real brain.
export { PolicyService, makeRuleBrain, makeAllowAllBrain } from "./policy-service.js";
export type { PolicyServiceOptions } from "./policy-service.js";
export { buildPolicyService } from "./policy.js";
export { makeVeniceBrain, RISK_FLAGS, SYSTEM_PROMPT, buildUserMessage } from "./venice.js";

// Action construction + the agent decision loop (propose -> authorize -> redeem).
export { erc20TransferAction, transferCallData } from "./actions.js";
export { attemptPayment } from "./agent.js";
export type { PaymentResult, PaymentHooks } from "./agent.js";

// Delegation helpers (server / key-signed path) + on-chain glue.
export {
  createRootDelegation,
  createWorkerRedelegation,
  leafHash,
  attachAttestation,
  redeem,
} from "./delegation.js";

// Setup (server e2e) and shared environment/config.
export { setup } from "./setup.js";
export type { Context } from "./setup.js";
export { env, publicClient } from "./env.js";

// Server helpers the console route handlers call.
export {
  publicInfo,
  ensureContracts,
  sponsorDeploy,
  fundUsdc,
  usdcBalance,
  allowanceRemaining,
  redeemSignedDelegation,
  forceRedeem,
  redelegateAndPay,
  giftCardOffers,
  buyGiftCardFromVendor,
} from "./console.js";
export type { GiftCardOffer } from "./console.js";
export { screenAddress } from "./screening.js";
export type { ScreeningResult } from "./screening.js";

// Shared types.
export type {
  ProposedAction,
  Verdict,
  PolicyBrain,
  Attestation,
  AuthorizeResult,
} from "./types.js";

// Re-export the kit's Delegation type so consumers share one definition.
export type { Delegation } from "@metamask/smart-accounts-kit";
