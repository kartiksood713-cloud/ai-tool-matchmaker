"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatUI() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement | null>(null);

  // Welcome
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "My child… I am The BotFather.\n\nI will give you a bot you cannot refuse.",
      },
    ]);
  }, []);

  // Autosroll
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    const raw = input;
    setInput("");

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: raw, messages: updatedHistory }),
      });

      const data = await res.json();
      const botReply = data.answer || "The BotFather speaks no further.";

      setMessages((prev) => [...prev, { role: "assistant", content: botReply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error." },
      ]);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        justifyContent: "center",
        paddingTop: 40,
        paddingBottom: 40,
        boxSizing: "border-box",
        color: "white",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* CHAT WINDOW */}
      <div
        style={{
          width: "100%",
          maxWidth: 820,
          background: "#0d0d0d",
          borderRadius: 24,
          border: "1px solid #1f1f1f",
          padding: "24px 0 12px 0",
          boxShadow: "0 0 25px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* TITLE */}
        <div
          style={{
            textAlign: "center",
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: "0.22em",
            marginBottom: 10,
            color: "#c49b66",
          }}
        >
          BOTFATHER
        </div>

        {/* CHAT SCROLL AREA */}
        <div
          ref={chatRef}
          style={{
            flex: 1,
            padding: "10px 32px 10px 32px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxHeight: "65vh",
          }}
        >
          {messages.map((m, idx) => {
            const isAssistant = m.role === "assistant";

            return (
              <div
                key={idx}
                style={{
                  alignSelf: isAssistant ? "flex-start" : "flex-end",
                  maxWidth: "78%",
                  background: isAssistant ? "#1a1a1a" : "#8a5a3a",
                  color: isAssistant ? "#e6e6e6" : "white",
                  padding: "14px 18px",
                  fontSize: 15.5,
                  lineHeight: 1.55,
                  borderRadius: 16,
                  boxShadow: isAssistant
                    ? "0 4px 12px rgba(0,0,0,0.4)"
                    : "0 4px 12px rgba(138,90,58,0.35)",
                  whiteSpace: "pre-wrap",
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.content}
                </ReactMarkdown>
              </div>
            );
          })}
        </div>

        {/* INPUT AREA */}
        <div
          style={{
            padding: "16px 20px 10px",
            display: "flex",
            gap: 12,
            borderTop: "1px solid #1c1c1c",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask the BotFather anything…"
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: 14,
              background: "#111",
              border: "1px solid #2a2a2a",
              color: "white",
              fontSize: 15,
              outline: "none",
            }}
          />

          <button
            onClick={sendMessage}
            style={{
              padding: "14px 24px",
              borderRadius: 14,
              background: "#8a5a3a",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
            }}
          >
            Send
          </button>
        </div>

        {/* FOOTER */}
        <div
          style={{
            textAlign: "center",
            color: "#777",
            fontSize: 12,
            marginTop: 6,
            marginBottom: 4,
          }}
        >
          BotFather is an AI and may make mistakes. Use with caution.
        </div>
      </div>
    </div>
  );
}
