"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatUI() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  // SHOW WELCOME MESSAGE ON FIRST LOAD
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "My child… I am **The BotFather**.\n\nI will give you a bot you cannot refuse.",
      },
    ]);
  }, []);

  // SEND MESSAGE
  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    const res = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: input,
        messages: newMessages, // <-- MEMORY
      }),
    });

    const data = await res.json();

    setMessages([
      ...newMessages,
      { role: "assistant", content: data.answer || "..." },
    ]);

    setInput("");
  }

  return (
    <div className="w-full h-screen flex flex-col justify-between p-6 bg-black">
      <div className="text-center text-4xl font-bold mb-5 text-[#b37a56] tracking-wide">
        BOTFATHER
      </div>

      {/* CHAT WINDOW */}
      <div className="flex-1 overflow-y-auto p-6 rounded-xl bg-[#111] shadow-inner space-y-6">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-3xl px-4 py-3 rounded-lg whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-[#8a5a3a] text-white self-end ml-auto"
                : "bg-[#222] text-[#ddd]"
            }`}
          >
            {/* MARKDOWN RENDERING FIX */}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        ))}
      </div>

      {/* INPUT BAR */}
      <div className="flex gap-3 mt-4">
        <input
          className="flex-1 px-4 py-3 rounded-lg bg-[#111] text-white border border-[#333]"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask the BotFather anything..."
        />
        <button
          onClick={sendMessage}
          className="px-6 py-3 rounded-lg bg-[#8a5a3a] text-white hover:bg-[#724a2d]"
        >
          Send
        </button>
      </div>

      {/* FOOTER */}
      <div className="text-center text-xs mt-2 text-[#666]">
        BotFather is an AI and may make mistakes. Use with caution.
      </div>
    </div>
  );
}
