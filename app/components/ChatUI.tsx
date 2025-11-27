"use client";

import { useState } from "react";

export default function ChatUI() {
  const [messages, setMessages] = useState([]);
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
        background: "#000",
        color: "#E6D3C3",
        height: "100vh",
        padding: "20px",
        fontFamily: "Inter, sans-serif"
      }}
    >
      <h1
        style={{
          textAlign: "center",
          fontSize: "2rem",
          fontWeight: "700",
          color: "#B28055",
          marginBottom: "20px",
          letterSpacing: "2px"
        }}
      >
        BOTFATHER
      </h1>

      {/* CHAT WINDOW */}
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "20px",
          borderRadius: "12px",
          background: "#111",
          height: "75vh",
          overflowY: "scroll",
          border: "1px solid #2d2d2d"
        }}
      >
        {/* ----------------------------- */}
        {/* STATIC WELCOME MESSAGE */}
        {/* ----------------------------- */}
        <div
          style={{
            marginBottom: "25px",
            padding: "20px",
            borderRadius: "8px",
            background: "#1f1a17",
            border: "1px solid #3a2e29",
            fontSize: "1.1rem",
            lineHeight: "1.6",
            color: "#d9c5b4"
          }}
        >
          <strong style={{ color: "#B28055" }}>BotFather:</strong>
          <br />
          <br />
          “My friend… welcome.  
          I am the BotFather.  
          And I’m gonna give you a bot you can’t refuse.”
        </div>

        {/* ----------------------------- */}
        {/* LIVE CONVERSATION MESSAGES */}
        {/* ----------------------------- */}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: "18px",
              padding: "12px 16px",
              borderRadius: "8px",
              background: m.role === "user" ? "#222" : "#1f1a17",
              border: m.role === "assistant" ? "1px solid #3a2e29" : "none",
              color: m.role === "assistant" ? "#E6D3C3" : "#fff"
            }}
            dangerouslySetInnerHTML={{
              __html: m.content
                .replace(/\n\n/g, "<br/><br/>")
                .replace(/\n/g, "<br/>")
            }}
          />
        ))}
      </div>

      {/* INPUT BAR */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginTop: "20px",
          maxWidth: "900px",
          marginLeft: "auto",
          marginRight: "auto"
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Botfather anything..."
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
            background: "#B28055",
            color: "black",
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
