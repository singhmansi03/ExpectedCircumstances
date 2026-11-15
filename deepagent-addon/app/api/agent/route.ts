// Bridge between the browser and the deep agent server (`langgraph dev`, port 2024).
// Same calls as Module 2 of the HackPrinceton starter, in TypeScript:
//   new message  -> runs.wait(thread, "travel_agent", { input })
//   approval     -> runs.wait(thread, "travel_agent", { command: { resume } })
//   then         -> threads.getState(thread) for messages, todos and files.
import { NextResponse } from "next/server";
import { Client } from "@langchain/langgraph-sdk";

export const maxDuration = 300;

const client = new Client({ apiUrl: process.env.LANGGRAPH_URL || "http://127.0.0.1:2024" });
const ASSISTANT = "travel_agent";

type Msg = { type?: string; content?: unknown; tool_calls?: unknown[] };
type FileData = { content?: string | string[] };
type Decision = { type: "approve" } | { type: "reject"; message?: string };

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => (b && typeof b === "object" && "text" in b ? String((b as { text: unknown }).text) : ""))
      .join("");
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { threadId?: string; message?: string; decision?: Decision };
    const threadId = body.threadId || (await client.threads.create()).thread_id;

    if (body.decision) {
      await client.runs.wait(threadId, ASSISTANT, {
        command: { resume: { decisions: [body.decision] } },
      });
    } else if (typeof body.message === "string" && body.message.trim()) {
      await client.runs.wait(threadId, ASSISTANT, {
        input: { messages: [{ role: "user", content: body.message.slice(0, 2000) }] },
      });
    } else {
      return NextResponse.json({ error: "Send a message or a decision." }, { status: 400 });
    }

    const state = await client.threads.getState(threadId);
    const values = (state.values ?? {}) as {
      messages?: Msg[];
      todos?: { content: string; status: string }[];
      files?: Record<string, FileData>;
    };

    // Chat bubbles: user messages and AI text (skip tool-call-only steps and tool results).
    const messages = (values.messages ?? [])
      .filter((m) => m.type === "human" || m.type === "ai")
      .map((m) => ({ role: m.type === "human" ? "user" : "agent", text: textOf(m.content) }))
      .filter((m) => m.text.trim());

    const files = Object.fromEntries(
      Object.entries(values.files ?? {}).map(([path, f]) => [
        path,
        Array.isArray(f.content) ? f.content.join("\n") : String(f.content ?? ""),
      ])
    );

    // A pending approval shows up as an interrupt on the thread's next task.
    const interrupts = (state.tasks ?? []).flatMap((t) => t.interrupts ?? []).map((i) => i.value);

    return NextResponse.json({ threadId, messages, todos: values.todos ?? [], files, interrupts });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Agent route:", msg);
    const hint = /ECONNREFUSED|fetch failed/.test(msg)
      ? "The agent server isn't running. In a second terminal: cd agent && uv run langgraph dev"
      : msg;
    return NextResponse.json({ error: hint }, { status: 502 });
  }
}
