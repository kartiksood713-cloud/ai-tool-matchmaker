"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatUI() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
      const botText = data.answer || data.error || "No answer.";

      const botMsg = { role: "assistant", content: botText };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const botMsg = { role: "assistant", content: "Request failed." };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
      // scroll to bottom after a short delay
      setTimeout(() => {
        containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    }
  }

  // Press Enter to send
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-3xl font-bold mb-4 text-center">Hybrid RAG Chatbot</h1>

      <div
        ref={containerRef}
        className="bg-gray-900 border border-gray-700 rounded-xl p-4 h-[60vh] overflow-y-auto space-y-4"
        aria-live="polite"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg max-w-[90%] ${msg.role === "user" ? "bg-blue-600 ml-auto" : "bg-gray-700 mr-auto"}`}
          >
            {msg.role === "assistant" ? (
              // Render assistant content as Markdown (so tables render)
              <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert">
                {msg.content}
              </ReactMarkdown>
            ) : (
              <div>{msg.content}</div>
            )}
          </div>
        ))}

        {loading && (
          <div className="p-3 rounded-lg bg-gray-700 w-fit mr-auto animate-pulse">
            Thinking...
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything..."
          className="flex-1 border border-gray-600 bg-gray-800 text-white p-3 rounded-lg"
        />

        <button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg">
          Send
        </button>
      </div>
    </div>
  );
}
