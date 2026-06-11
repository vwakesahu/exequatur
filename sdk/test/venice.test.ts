import { afterEach, describe, expect, it, vi } from "vitest";
import { getAddress, parseUnits } from "viem";
import { erc20TransferAction } from "../src/actions.js";
import { makeVeniceBrain } from "../src/venice.js";

const TOKEN = getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e");
const MERCHANT = getAddress("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");

function action() {
  return erc20TransferAction({
    chainId: 84532n,
    delegationHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    token: TOKEN,
    recipient: MERCHANT,
    amount: parseUnits("25", 6),
    symbol: "mUSDC",
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("makeVeniceBrain (mocked fetch)", () => {
  it("posts an OpenAI-style chat request with a strict json_schema and parses the verdict", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ approved: true, reason: "matches intent", risk_flags: [] }) } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const brain = makeVeniceBrain({ apiKey: "vk-test", model: "llama-3.3-70b" });
    const verdict = await brain.evaluate("Pay the merchant up to 100 mUSDC", action());

    expect(verdict.approved).toBe(true);
    expect(verdict.reason).toBe("matches intent");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.venice.ai/api/v1/chat/completions");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe("llama-3.3-70b");
    expect(body.temperature).toBe(0);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect((init as RequestInit).headers).toMatchObject({ authorization: "Bearer vk-test" });
  });

  it("propagates a denial verdict", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              { message: { content: JSON.stringify({ approved: false, reason: "recipient not in intent", risk_flags: ["anomalous-recipient"] }) } },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const brain = makeVeniceBrain({ apiKey: "vk-test" });
    const verdict = await brain.evaluate("Pay the merchant", action());
    expect(verdict.approved).toBe(false);
    expect(verdict.riskFlags).toContain("anomalous-recipient");
  });

  it("throws on a non-200 response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429, statusText: "Too Many Requests" })));
    const brain = makeVeniceBrain({ apiKey: "vk-test" });
    await expect(brain.evaluate("x", action())).rejects.toThrow(/Venice request failed: 429/);
  });
});
