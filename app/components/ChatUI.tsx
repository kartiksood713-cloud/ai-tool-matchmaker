"use client";

import { useState, useRef, useEffect } from "react";

export default function ChatUI() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  async function sendMessage() {
    if (!query.trim()) return;

    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      const botMsg = { role: "assistant", content: data.answer || "No answer." };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        boxRef.current?.scrollTo({
          top: boxRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }

  function onKey(e: any) {
    if (e.key === "Enter") sendMessage();
  }

  return (
    <div className="chat-container">
      <div className="bot-title">BOTFATHER</div>

      <div className="chat-box" ref={boxRef}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message ${msg.role === "user" ? "user" : "bot"}`}
          >
            {msg.content}
          </div>
        ))}

        {loading && (
          <div className="message bot">Typing...</div>
        )}
      </div>

      <div className="input-row">
        <input
          className="chat-input"
          placeholder="Ask Botfather anything..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
        />
        <button className="send-button" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
