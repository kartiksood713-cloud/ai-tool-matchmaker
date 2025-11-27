"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatUI() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement | null>(null);

  // Welcome Message
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "My child… I am The BotFather.\n\nI will give you a bot you cannot refuse.",
      },
    ]);
  }, []);

  // Auto Scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);

    const raw = input;
    setInput("");

    const res = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: raw,
        messages: updatedHistory,
      }),
    });

    const data = await res.json();
    const botReply = data.answer || "The BotFather speaks no further.";

    setMessages((prev) => [...prev, { role: "assistant", content: botReply }]);
  }

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center py-6">
      {/* Title */}
      <div className="text-4xl font-extrabold tracking-[0.25em] text-[#c49b66] mb-6">
        BOTFATHER
      </div>

      {/* Chat Container */}
      <div className="w-full max-w-3xl flex flex-col flex-1 bg-[#0d0d0d] rounded-2xl border border-[#1c1c1c] shadow-xl p-6 overflow-hidden">

        {/* Chat Scroll Area */}
        <div ref={chatRef} className="flex-1 overflow-y-auto space-y-6 pr-2">
          {messages.map((msg, i) => {
            const isAssistant = msg.role === "assistant";

            return (
              <div
                key={i}
                className={`max-w-[85%] px-5 py-4 rounded-2xl leading-relaxed shadow-md ${
                  isAssistant
                    ? "bg-[#1a1a1a] text-[#e5e5e5]"
                    : "bg-[#7b4a2b] text-white ml-auto"
                }`}
              >
                <ReactMarkdown
                  className="whitespace-pre-wrap"
                  remarkPlugins={[remarkGfm]}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <div className="w-full flex items-center gap-3 mt-4 border-t border-[#222] pt-4">
          <input
            className="flex-1 bg-[#111] text-white px-4 py-3 rounded-xl border border-[#2a2a2a] focus:border-[#c49b66] outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask the BotFather anything..."
          />
          <button
            onClick={sendMessage}
            className="px-6 py-3 rounded-xl bg-[#7b4a2b] text-white font-semibold hover:bg-[#643a22] transition"
          >
            Send
          </button>
        </div>

        {/* Footer */}
        <div className="text-xs text-[#777] text-center mt-3">
          BotFather is an AI and may make mistakes. Use with caution.
        </div>
      </div>
    </div>
  );
}
