"use client";
// Chat panel for the travel-recovery deep agent.
// Shows the agent's live plan (todos), the files it wrote, and an approval card
// when it calls finalize_itinerary (human-in-the-loop).
import { useState, type FormEvent } from "react";

type AgentState = {
  threadId: string;
  messages: { role: "user" | "agent"; text: string }[];
  todos: { content: string; status: string }[];
  files: Record<string, string>;
  interrupts: unknown[];
};

const EXAMPLE =
  "My DSM to DEL flight tomorrow was cancelled. I need to be in Delhi by Tuesday 11pm, budget $1,800. I can drive or take a bus.";
const TODO_ICON: Record<string, string> = { completed: "✅", in_progress: "⏳", pending: "⬜" };

export default function AgentPanel() {
  const [state, setState] = useState<AgentState | null>(null);
  const [input, setInput] = useState(EXAMPLE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openFile, setOpenFile] = useState<string | null>(null);

  async function call(payload: { message?: string; decision?: { type: "approve" } | { type: "reject"; message: string } }) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: state?.threadId, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Agent request failed");
      setState(json);
      if (json.files?.["/itinerary.md"]) setOpenFile("/itinerary.md");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Agent request failed");
    } finally {
      setBusy(false);
    }
  }

  function send(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    call({ message: input });
    setInput("");
  }

    const fileNames = Object.keys(state?.files ?? {}).filter((f) => f === "/itinerary.md");
  const pending = (state?.interrupts.length ?? 0) > 0;

  return (
    <section className="trace" style={{ marginTop: 0, marginBottom: 21 }}>
      <h3>✦ Travel recovery agent</h3>
      <p style={{ fontSize: 12, color: "#71847a", marginBottom: 14 }}>
        Describe what went wrong. The agent plans, sends subagents to scout airports and search routes,
        and asks you to approve its recommendation. Every price comes from the search engine, not the AI.
      </p>

      {state && state.todos.length > 0 && (
        <div className="ai-panel">
          <strong>Agent plan</strong>
          <ul style={{ listStyle: "none", padding: 0, marginTop: 8, fontSize: 12 }}>
            {state.todos.map((t, i) => (
              <li key={i}>{TODO_ICON[t.status] ?? "⬜"} {t.content}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {state?.messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              background: m.role === "user" ? "#e5f8ee" : "#f5faf7",
              border: "1px solid #e1ebe7",
              borderRadius: 12,
              padding: "10px 13px",
              fontSize: 13,
              whiteSpace: "pre-wrap",
              lineHeight: 1.55,
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

      {pending && (
        <div className="urgent-note" style={{ margin: "0 0 14px" }}>
          <strong>The agent wants your approval for this itinerary</strong>
          <p>Approve to finalize, or reject and tell it what to change.</p>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="action-link" disabled={busy} onClick={() => call({ decision: { type: "approve" } })}>
              Approve
            </button>
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={() =>
                call({ decision: { type: "reject", message: input.trim() || "Not this one. Find a different option." } })
              }
            >
              Reject (uses the text box as your reason)
            </button>
          </div>
        </div>
      )}

      {fileNames.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <b style={{ fontSize: 12 }}>Agent files</b>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
            {fileNames.map((f) => (
              <button key={f} type="button" className={openFile === f ? "pill primary" : "pill"} onClick={() => setOpenFile(openFile === f ? null : f)}>
                📄 {f}
              </button>
            ))}
          </div>
          {openFile && state?.files[openFile] && (
            <pre style={{ fontSize: 11, background: "#f5faf7", border: "1px solid #e1ebe7", borderRadius: 10, padding: 12, whiteSpace: "pre-wrap", maxHeight: 320, overflow: "auto" }}>
              {state.files[openFile]}
            </pre>
          )}
        </div>
      )}

      {error && <div className="error-box"><b>Agent error</b><p>{error}</p></div>}

      <form onSubmit={send} className="form-fields" style={{ padding: 0 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder={state ? "Push back or add a constraint, e.g. \"I can't drive\"" : EXAMPLE}
          style={{ width: "100%", border: "1px solid #d9e5e0", borderRadius: 10, padding: 12, fontSize: 13 }}
        />
        <button className="submit-search" type="submit" disabled={busy || !input.trim()}>
          {busy ? "Agent is planning and searching… (can take a minute)" : state ? "Send to agent" : "Ask the agent"}
        </button>
      </form>
    </section>
  );
}
