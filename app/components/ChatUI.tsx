"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StreamDown } from "streamdown/react";

export default function ChatUI() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement | null>(null);

  // --------------------------------------
  // 1. Welcome message on first load
  // --------------------------------------
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "My child… I am **The BotFather**.\n\nI will give you a bot you cannot refuse.",
      },
    ]);
  }, []);

  // --------------------------------------
  // 2. Auto scroll
  // --------------------------------------
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // --------------------------------------
  // 3. Send a message
  // --------------------------------------
  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };

    // Add user message immediately
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);

    const raw = input;
    setInput("");

    // Make API call
    const res = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: raw,
        messages: newHistory, // <-- memory sent to backend
      }),
    });

    const data = await res.json();

    const botReply = data.answer || "The BotFather has no words…";

    // Add bot reply (will stream in UI)
    setMessages((old) => [...old, { role: "assistant", content: botReply }]);
  }

  // --------------------------------------
  // 4. Render UI
  // --------------------------------------
  return (
    <div className="w-full h-screen flex flex-col justify-between p-6 bg-black text-white">
      {/* Title */}
      <div className="text-center text-4xl font-bold mb-5 text-[#b37a56] tracking-wide">
        BOTFATHER
      </div>

      {/* Chat window */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto p-6 rounded-xl bg-[#111] shadow-inner space-y-6"
      >
        {messages.map((msg, i) => {
          const isAssistant = msg.role === "assistant";

          return (
            <div
              key={i}
              className={`max-w-3xl px-4 py-3 rounded-lg whitespace-pre-wrap ${
                isAssistant
                  ? "bg-[#222] text-[#ddd]"
                  : "bg-[#8a5a3a] text-white self-end ml-auto"
              }`}
            >
              {isAssistant ? (
                // --------------------------------------
                // STREAMDOWN FOR ASSISTANT MESSAGES
                // --------------------------------------
                <StreamDown
                  markdown={msg.content}
                  delay={12} // typing speed
                  cursor="▋" // blinking cursor
                />
              ) : (
                // Normal markdown for user messages
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          );
        })}
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
      <div className="text-center text-xs mt-3 text-[#666]">
        BotFather is an AI and may make mistakes. Use with caution.
      </div>
    </div>
  );
}
