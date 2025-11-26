"use client";

import { useState } from "react";

export default function ChatUI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, newMsg]);
    const userInput = input;
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: userInput }),
    });

    const data = await res.json();
    setMessages((prev) => [...prev, data]);
  };

  return (
    <>
      <h2>🤖 AI Tool Matchmaker</h2>

      <div className="chat-window">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "msg-user" : "msg-ai"}
          >
            <strong>{m.role === "user" ? "You" : "AI"}:</strong> {m.content}
          </div>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder="Describe your use case..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <button className="chat-button" onClick={sendMessage}>
          Send
        </button>
      </div>
    </>
  );
}
