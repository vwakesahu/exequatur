# Exequatur console — wallet signing spike

De-risks the one genuinely new surface: a delegation **signed by the connected MetaMask wallet**
(not a generated key) that the agent redeems on Base Sepolia through the frozen firewall flow.

Flow (`app/page.tsx`): connect MetaMask → build a Hybrid MetaMask Smart Account with the connected
wallet as signatory → deploy it (sponsored) → **sign the delegation** (spend-cap + AttestationEnforcer
caveats) → fund with MockUSDC (sponsored) → agent redeems on-chain. Deploy/fund/gas are sponsored from
the deployer key, so the user only signs.

The browser builds the smart account + delegation with `@metamask/smart-accounts-kit` directly; the
server routes (`app/api/*`) call `delegation-firewall-sdk` (file-linked, kept external) for the proven
redemption path. No firewall logic is duplicated.

## Run the live test

Keys/addresses are read by the SDK from `sdk/.env` (not this app's env). Today it has only
`PRIVATE_KEY` (the funded deployer) + Venice. `console/.env.local` points the SDK (resolved from a
pnpm `file:` store copy) at the real on-disk paths — no secrets there:

```
ENV_FILE=<abs>/sdk/.env                 # so the SDK loads PRIVATE_KEY etc.
CONTRACTS_OUT=<abs>/contracts/out       # so it can deploy MockUSDC + enforcer
RPC_URL=https://sepolia.base.org
```

For a stable session you can also pin `AGENT_PRIVATE_KEY` / `POLICY_PRIVATE_KEY` and
`MOCK_USDC_ADDRESS` / `ATTESTATION_ENFORCER_ADDRESS` in `sdk/.env` (else the keys regenerate each dev
restart and the contracts auto-deploy on the first run, sponsored by the deployer).

> After changing SDK source: `pnpm -C sdk build`, then re-sync the console's store copy with
> `pnpm -C console install --force` (the `file:` protocol copies `dist`, so a rebuild needs a re-sync).

```bash
pnpm dev          # http://localhost:3000  (restart after env/SDK changes)
```

Open in a browser with MetaMask, connect, switch to Base Sepolia, and click **Activate, grant & pay**.
MetaMask pops only for the delegation signature; each step shows a Basescan link.
