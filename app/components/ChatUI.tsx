"use client";

import { useState } from "react";

export default function ChatUI() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I am the BotFather… and I'm gonna give you a bot you can't refuse."
    }
  ]);

  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);

    const res = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: input,
        history: newMessages
      })
    });

    const data = await res.json();

    setMessages([
      ...newMessages,
      { role: "assistant", content: data.answer }
    ]);

    setInput("");
  };

  return (
    <div
      style={{
        background: "#0d0d0d",
        color: "#f2f2f2",
        height: "100vh",
        padding: "20px",
        fontFamily: "Inter, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "20px",
          borderRadius: "12px",
          background: "#1a1a1a",
          height: "85vh",
          overflowY: "scroll"
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: "18px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: m.role === "user" ? "#333" : "#2a1f1a"
            }}
            dangerouslySetInnerHTML={{
              __html: m.content
                .replace(/\n\n/g, "<br/><br/>")
                .replace(/\n/g, "<br/>")
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginTop: "20px",
          maxWidth: "700px",
          marginLeft: "auto",
          marginRight: "auto"
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask the BotFather anything…"
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#111",
            color: "white"
          }}
        />

        <button
          onClick={sendMessage}
          style={{
            background: "#5a4638",
            color: "white",
            borderRadius: "8px",
            padding: "14px 20px",
            border: "none",
            fontWeight: "bold"
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
