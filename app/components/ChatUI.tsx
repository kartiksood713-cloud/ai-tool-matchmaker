"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ------------------------------------------------------
// Custom Typing Animation
// ------------------------------------------------------
function TypingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 10); // typing speed
    return () => clearInterval(interval);
  }, [text]);

  return (
    <ReactMarkdown className="whitespace-pre-wrap leading-relaxed" remarkPlugins={[remarkGfm]}>
      {displayed}
    </ReactMarkdown>
  );
}

export default function ChatUI() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement | null>(null);

  // ------------------------------------------------------
  // Welcome message
  // ------------------------------------------------------
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "My child… I am The BotFather.\n\nI will give you a bot you cannot refuse.",
      },
    ]);
  }, []);

  // ------------------------------------------------------
  // Auto-scroll
  // ------------------------------------------------------
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // ------------------------------------------------------
  // Send message
  // ------------------------------------------------------
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

  // ------------------------------------------------------
  // UI
  // ------------------------------------------------------
  return (
    <div className="w-full h-screen flex flex-col justify-between p-6 bg-black text-white">
      
      {/* Title */}
      <div className="text-center text-4xl font-bold mb-5 text-[#b37a56] tracking-wide">
        BOTFATHER
      </div>

      {/* Chat Area */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto p-6 rounded-xl bg-[#111] shadow-inner space-y-6"
      >
        {messages.map((msg, i) => {
          const isAssistant = msg.role === "assistant";

          return (
            <div
              key={i}
              className={`max-w-3xl px-4 py-3 rounded-lg leading-relaxed ${
                isAssistant
                  ? "bg-[#222] text-[#ddd]"
                  : "bg-[#8a5a3a] text-white self-end ml-auto"
              }`}
            >
              {isAssistant ? (
                <TypingText text={msg.content} />
              ) : (
                <ReactMarkdown className="whitespace-pre-wrap leading-relaxed" remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
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

      {/* Footer */}
      <div className="text-center text-xs mt-3 text-[#666]">
        BotFather is an AI and may make mistakes. Use with caution.
      </div>
    </div>
  );
}
