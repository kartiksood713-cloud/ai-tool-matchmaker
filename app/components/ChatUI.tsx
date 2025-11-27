"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatUI() {
  console.log("CHATUI LOADED"); // <- Verify this shows in browser console

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 1) Welcome message on mount (client-side)
  useEffect(() => {
    // If messages already present (hot reload), don't re-add welcome.
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            `“Hi, I am the BotFather. I'm gonna give you a bot you can't refuse.”\n\n` +
            `I speak with calm authority. Ask me anything.`
        }
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run only once

  // 2) Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 3) Send message -> API call
  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;

    // append user message locally (optimistic)
    const newHistory = [...messages, { role: "user", content: text }];
    setMessages(newHistory);
    setInput("");
    setIsSending(true);

    try {
      const r = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, messages: newHistory })
      });

      const data = await r.json();
      const answer = data?.answer ?? data?.error ?? "Sorry — something went wrong.";

      // Ensure we preserve blank-line separation in display:
      // The backend is instructed to put blank lines between bullets/paragraphs.
      setMessages((m) => [...m, { role: "assistant", content: String(answer) }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${err?.message ?? "network error"}` }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Helper - convert Markdown newlines to visible spacing is handled by react-markdown.
  // We do not need to dangerouslySetInnerHTML — react-markdown renders correctly.
  return (
    <div style={styles.app}>
      <h1 style={styles.title}>BOTFATHER</h1>

      <div style={styles.container}>
        <div style={styles.chatWindow} ref={scrollRef}>
          {messages.map((m, i) => {
            const isAssistant = m.role === "assistant";
            return (
              <div
                key={i}
                style={{
                  ...styles.bubble,
                  ...(isAssistant ? styles.assistantBubble : styles.userBubble)
                }}
              >
                <div style={styles.markdownWrapper}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.controls}>
          <input
            aria-label="chat-input"
            placeholder="Ask Botfather anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.input}
          />
          <button onClick={handleSend} disabled={isSending} style={styles.button}>
            {isSending ? "Sending…" : "Send"}
          </button>
        </div>

        <div style={styles.footer}>
          <small style={{ color: "#9a9a9a" }}>
            BotFather is an AI, and can make mistakes. Use with appropriate caution.
          </small>
        </div>
      </div>

      {/* Inline premium markdown/table styling */}
      <style jsx>{`
        .bot-table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          font-size: 0.95rem;
        }
        .bot-table th,
        .bot-table td {
          border: 1px solid rgba(255,255,255,0.06);
          padding: 8px 10px;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bot-table thead th {
          background: rgba(255,255,255,0.03);
          font-weight: 600;
        }
        .bot-table tr:nth-child(even) td {
          background: rgba(255,255,255,0.01);
        }
        pre {
          background: #0f0f0f;
          border-radius: 6px;
          padding: 10px;
          overflow: auto;
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
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
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
    flexDirection: "column"
  },
  chatWindow: {
    background: "#0f0f0f",
    border: "1px solid #1f1f1f",
    borderRadius: 12,
    padding: 18,
    height: "68vh",
    overflowY: "auto",
    boxShadow: "0 6px 20px rgba(0,0,0,0.6)"
  },
  bubble: {
    maxWidth: "100%",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    display: "block"
  },
  assistantBubble: {
    background: "#1b1716",
    color: "#f3f2f1",
    alignSelf: "flex-start"
  },
  userBubble: {
    background: "#8C5734",
    color: "#111",
    alignSelf: "flex-end"
  },
  markdownWrapper: {
    fontSize: 15,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap"
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
    textAlign: "center"
  }
};
