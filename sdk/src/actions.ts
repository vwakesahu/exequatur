import { type Address, type Hex, encodeFunctionData, erc20Abi, formatUnits } from "viem";
import type { ProposedAction } from "./types.js";

/** Encodes an ERC-20 transfer and packages it as a ProposedAction for the policy service. */
export function erc20TransferAction(params: {
  chainId: bigint;
  delegationHash: Hex;
  token: Address;
  recipient: Address;
  amount: bigint;
  decimals?: number;
  symbol?: string;
  context?: string;
}): ProposedAction {
  const callData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [params.recipient, params.amount],
  });
  return {
    chainId: params.chainId,
    delegationHash: params.delegationHash,
    target: params.token,
    value: 0n,
    callData,
    description: {
      kind: "erc20-transfer",
      token: params.token,
      recipient: params.recipient,
      amount: formatUnits(params.amount, params.decimals ?? 6),
      symbol: params.symbol,
    },
    context: params.context,
  };
}

/** The transfer calldata for an action — what gets executed if the firewall approves. */
export function transferCallData(recipient: Address, amount: bigint): Hex {
  return encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [recipient, amount] });
}
