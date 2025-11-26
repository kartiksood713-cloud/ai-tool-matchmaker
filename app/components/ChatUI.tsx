"use client";

import { useState } from "react";

export default function ChatUI() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!query.trim()) return;

    // User message
    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);

    // Call your hybrid RAG API
    const res = await fetch("/api/rag", {
      method: "POST",
      body: JSON.stringify({ query }),
    });

    const data = await res.json();

    const botMsg = { role: "assistant", content: data.answer };

    setMessages((prev) => [...prev, botMsg]);

    setQuery("");
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold mb-4">Hybrid RAG Chatbot</h1>

      <div
        className="border p-4 rounded-md h-[60vh] overflow-y-auto mb-4 bg-gray-50"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-4 p-2 rounded-md ${
              msg.role === "user" ? "bg-blue-100" : "bg-green-100"
            }`}
          >
            <strong>{msg.role === "user" ? "You" : "Bot"}:</strong>
            <p>{msg.content}</p>
          </div>
        ))}

        {loading && (
          <p className="italic text-gray-500">Thinking...</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 border p-2 rounded-md"
        />

        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Send
        </button>
      </div>
    </div>
  );
}
