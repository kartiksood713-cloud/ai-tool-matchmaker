"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Typing animation
function TypingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 10);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <ReactMarkdown
      className="whitespace-pre-wrap leading-relaxed animate-fadeIn"
      remarkPlugins={[remarkGfm]}
    >
      {displayed}
    </ReactMarkdown>
  );
}

export default function ChatUI() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "My child… I am The BotFather.\n\nI will give you a bot you cannot refuse.",
      },
    ]);
  }, []);

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
      <div className="text-4xl font-extrabold tracking-widest text-[#c49b66] mb-8 drop-shadow-lg">
        BOTFATHER
      </div>

      {/* Chat Container */}
      <div className="
        w-full max-w-3xl 
        flex flex-col 
        bg-[#0d0d0d] 
        rounded-2xl 
        border border-[#2a2a2a]
        shadow-[0_0_25px_rgba(196,155,102,0.08)]
        backdrop-blur-sm
        overflow-hidden
      ">

        {/* Chat Scroll */}
        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll"
        >
          {messages.map((msg, i) => {
            const isAssistant = msg.role === "assistant";

            return (
              <div
                key={i}
                className={`
                  max-w-[85%] px-5 py-4 rounded-2xl leading-relaxed animate-fadeUp
                  ${isAssistant
                    ? "bg-[#1b1b1b] text-[#e7e7e7] shadow-[0_0_15px_rgba(255,215,160,0.05)]"
                    : "bg-[#8a5a3a] text-white ml-auto shadow-[0_0_12px_rgba(138,90,58,0.4)]"
                  }
                `}
              >
                {isAssistant ? (
                  <TypingText text={msg.content} />
                ) : (
                  <ReactMarkdown
                    className="whitespace-pre-wrap leading-relaxed"
                    remarkPlugins={[remarkGfm]}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-3 p-4 border-t border-[#2a2a2a] bg-[#0d0d0d]">
          <input
            className="
              flex-1 px-4 py-3 rounded-xl bg-[#111] text-white 
              border border-[#333]
              focus:border-[#c49b66] focus:shadow-[0_0_10px_rgba(196,155,102,0.4)]
              outline-none transition-all
            "
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask the BotFather anything..."
          />

          <button
            onClick={sendMessage}
            className="
              px-6 py-3 rounded-xl 
              bg-[#8a5a3a] text-white font-semibold 
              hover:bg-[#70462d] 
              shadow-[0_0_12px_rgba(138,90,58,0.4)]
              transition-all
            "
          >
            Send
          </button>
        </div>

        <div className="text-xs text-[#777] text-center py-2">
          BotFather is an AI and may make mistakes. Use with caution.
        </div>
      </div>
    </div>
  );
}
