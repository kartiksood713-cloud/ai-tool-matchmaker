"use client";

import { useState, useEffect } from "react";

export default function ChatUI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // SHOW WELCOME MESSAGE ON MOUNT
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          `“My friend… welcome.<br/><br/>
          I am the <b>BotFather</b>.<br/>
          And I’m gonna give you a bot you can’t refuse.”`
      }
    ]);
  }, []);

  const sendMessage = async () => {
    if (!input) return;

    const updatedMessages = [...messages, { role: "user", content: input }];
    setMessages(updatedMessages);

    const res = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: input,
        history: updatedMessages
      })
    });

    const data = await res.json();

    setMessages([
      ...updatedMessages,
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
        padding: "20px"
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
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: "20px",
              padding: "15px",
              borderRadius: "8px",
              background: msg.role === "assistant" ? "#1f1a17" : "#222",
              border: msg.role === "assistant" ? "1px solid #3a2e29" : "none",
            }}
            dangerouslySetInnerHTML={{
              __html: msg.content
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
          maxWidth: "900px",
          marginLeft: "auto",
          marginRight: "auto"
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Botfather anything..."
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#111",
            color: "white",
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
            fontWeight: "bold",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
