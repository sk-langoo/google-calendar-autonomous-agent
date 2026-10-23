import { test, expect, vi, beforeAll } from "vitest";

const createMock = vi.fn();
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({ chat: { completions: { create: createMock } } }))
}));

process.env.OPENAI_API_KEY = "test-key";
process.env.PORT = "3199";

beforeAll(async () => {
  await import("../src/index.js");
});

test("a custom tool call is answered with a tool message, not silently skipped", async () => {
  createMock
    .mockResolvedValueOnce({ choices: [{ message: { role: "assistant", content: null, tool_calls: [
      { id: "call_custom_1", type: "custom", custom: { name: "freeform_tool", input: "hello" } }
    ] } }] })
    .mockResolvedValueOnce({ choices: [{ message: { role: "assistant", content: "done" } }] });

  const res = await fetch("http://localhost:3199/chat", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "hi" })
  });
  expect(res.status).toBe(200);
  const secondCallMessages = createMock.mock.calls[1][0].messages;
  const toolMsg = secondCallMessages.find((m: any) => m.role === "tool" && m.tool_call_id === "call_custom_1");
  expect(toolMsg).toBeTruthy();
  expect(JSON.parse(toolMsg.content)).toEqual({ error: "Unsupported tool type" });
});
