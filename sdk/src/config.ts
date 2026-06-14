import { getAddress, type Address } from "viem";

/**
 * Pinned, deployed-once Base Sepolia fixtures - the single source of truth the console, verify-spike,
 * and the e2e all read. Deployed by scripts/deploy-fixtures.ts; never redeployed at runtime. Env vars
 * (MOCK_USDC_ADDRESS / ATTESTATION_ENFORCER_ADDRESS) still override for local forks.
 *
 * AttestationEnforcer is the project's firewall contract; MockUSDC is the one allowed mock. The
 * canonical DelegationManager + built-in enforcers come from the Kit (getSmartAccountsEnvironment),
 * not from here.
 */
export const DEPLOYED: { mockUsdc: Address; attestationEnforcer: Address } = {
  mockUsdc: getAddress("0xb04e3063545f6a8658a0421c66fa3977ae3235dd"),
  attestationEnforcer: getAddress("0xf16c36b6c2a3b539074f56697947a8d931d253c9"),
};
