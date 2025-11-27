"use client";

import { useState, useEffect } from "react";

export default function ChatUI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // ------------------------------------
  // 1. WELCOME MESSAGE ON FIRST LOAD
  // ------------------------------------
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `
        <b>“My friend… welcome.</b><br/>
        I am the <b>BotFather</b>.<br/><br/>
        And I’m gonna give you a bot you can’t refuse.”`
      }
    ]);
  }, []);

  // ------------------------------------
  // 2. SEND MESSAGE
  // ------------------------------------
  const sendMessage = async () => {
    if (!input.trim()) return;

    const updatedMessages = [...messages, { role: "user", content: input }];

    setMessages(updatedMessages);

    const res = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: input,
        history: updatedMessages, // MEMORY
      }),
    });

    const data = await res.json();

    setMessages([
      ...updatedMessages,
      { role: "assistant", content: data.answer },
    ]);

    setInput("");
  };

  return (
    <div style={{ background: "#000", minHeight: "100vh", padding: "20px" }}>
      <h1
        style={{
          textAlign: "center",
          color: "#B28055",
          fontWeight: 700,
          fontSize: "2rem",
          letterSpacing: "2px",
          marginBottom: "20px",
        }}
      >
        BOTFATHER
      </h1>

      {/* CHAT WINDOW */}
      <div
        style={{
          width: "90%",
          maxWidth: "900px",
          margin: "0 auto",
          background: "#111",
          padding: "20px",
          height: "70vh",
          overflowY: "scroll",
          borderRadius: "12px",
          border: "1px solid #333",
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: "18px",
              padding: "14px",
              borderRadius: "8px",
              background: msg.role === "assistant" ? "#1c1714" : "#543c29",
              color: "#f5f5f5",
              lineHeight: "1.5",
            }}
            dangerouslySetInnerHTML={{
              __html: msg.content
                .replace(/\n\n/g, "<br/><br/>") // bigger spaces
                .replace(/\n/g, "<br/>"), // normal newline
            }}
          />
        ))}
      </div>

      {/* INPUT BAR */}
      <div
        style={{
          width: "90%",
          maxWidth: "900px",
          margin: "20px auto 0",
          display: "flex",
          gap: "10px",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Botfather anything…"
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "8px",
            background: "#111",
            border: "1px solid #333",
            color: "#fff",
          }}
        />

        <button
          onClick={sendMessage}
          style={{
            background: "#B28055",
            padding: "14px 22px",
            borderRadius: "8px",
            border: "none",
            color: "black",
            fontWeight: 700,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
