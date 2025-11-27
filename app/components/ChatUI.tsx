"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Welcome message on mount (client-side)
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          `“Hi, I am the BotFather. I'm gonna give you a bot you can't refuse.”\n\n` +
          `*Say hi to begin — or ask me anything.*`
      }
    ]);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const updated = [...messages, { role: "user", content: trimmed }];
    setMessages(updated);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          messages: updated
        })
      });

      const payload = await res.json();
      const assistantText = payload?.answer || payload?.error || "Sorry, an error occurred.";

      setMessages((m) => [...m, { role: "assistant", content: assistantText }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${err?.message || "unknown error"}` }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={styles.app}>
      <h1 style={styles.title}>BOTFATHER</h1>

      <div style={styles.container}>
        <div style={styles.chatWindow} ref={scrollRef}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                ...styles.message,
                ...(msg.role === "assistant" ? styles.assistantMsg : styles.userMsg)
              }}
            >
              <div style={styles.markdownWrapper}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Small tweak: render code blocks and tables with nicer defaults
                    table: ({ node, ...props }) => (
                      <table className="bot-table" {...(props as any)} />
                    ),
                    th: ({ node, ...props }) => <th {...(props as any)} />,
                    td: ({ node, ...props }) => <td {...(props as any)} />
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.controls}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask Botfather anything..."
            style={styles.input}
            aria-label="Chat input"
          />
          <button onClick={handleSend} style={styles.button} disabled={isSending}>
            {isSending ? "Sending…" : "Send"}
          </button>
        </div>

        <div style={styles.footer}>
          <small style={{ color: "#9a9a9a" }}>
            BotFather is an AI, and can make mistakes. Use with appropriate caution.
          </small>
        </div>
      </div>

      {/* Markdown + table styling for premium look */}
      <style jsx>{`
        .bot-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          margin-bottom: 8px;
          font-size: 0.95rem;
        }
        .bot-table th,
        .bot-table td {
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 8px 10px;
          text-align: left;
          vertical-align: middle;
          white-space: nowrap; /* encourage single-line cells as preferred */
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bot-table thead th {
          background: rgba(255, 255, 255, 0.03);
          font-weight: 600;
        }
        /* nice striped rows */
        .bot-table tr:nth-child(even) td {
          background: rgba(255, 255, 255, 0.01);
        }
        /* code blocks */
        pre {
          background: #0f0f0f;
          border-radius: 6px;
          padding: 10px;
          overflow: auto;
        }
        code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Helvetica Neue", monospace;
        }
      `}</style>
    </div>
  );
}

const styles: { [k: string]: React.CSSProperties } = {
  app: {
    background: "#000",
    minHeight: "100vh",
    color: "#fff",
    padding: 20,
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
  },
  title: {
    textAlign: "center",
    color: "#B28055",
    fontWeight: 800,
    letterSpacing: "2px",
    margin: "8px 0 20px",
    fontSize: 28
  },
  container: {
    maxWidth: 1000,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const
  },
  chatWindow: {
    background: "#0f0f0f",
    border: "1px solid #1f1f1f",
    borderRadius: 12,
    padding: 18,
    height: "68vh",
    overflowY: "auto" as const,
    boxShadow: "0 6px 20px rgba(0,0,0,0.6)"
  },
  message: {
    maxWidth: "100%",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    display: "block"
  },
  assistantMsg: {
    background: "#1b1716",
    color: "#f3f2f1",
    alignSelf: "flex-start"
  },
  userMsg: {
    background: "#8C5734",
    color: "#111",
    alignSelf: "flex-end"
  },
  markdownWrapper: {
    fontSize: 15,
    lineHeight: 1.6
  },
  controls: {
    display: "flex",
    gap: 12,
    marginTop: 14,
    alignItems: "center"
  },
  input: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #333",
    background: "#0f0f0f",
    color: "#fff"
  },
  button: {
    background: "#B28055",
    color: "#111",
    padding: "12px 18px",
    borderRadius: 8,
    border: "none",
    fontWeight: 700,
    cursor: "pointer"
  },
  footer: {
    marginTop: 10,
    textAlign: "center" as const
  }
};
