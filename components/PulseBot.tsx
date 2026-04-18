import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, User, Bot, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function PulseBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am Pulse Bot, your AI market assistant powered by Sarvam AI. How can I help you analyze the market today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error(error);
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, I am having trouble connecting to my servers. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full shadow-2xl z-50 transition-transform active:scale-95"
        style={{
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          boxShadow: "0 8px 32px rgba(59,130,246,0.5)",
        }}
        whileHover={{ scale: 1.05 }}
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[360px] h-[550px] shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden border"
            style={{
              background: "rgba(10, 10, 15, 0.95)",
              backdropFilter: "blur(24px)",
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                borderColor: "rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center p-1.5"
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  }}
                >
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pulse Bot</h3>
                  <p className="text-[10px] text-white/50">Powered by Sarvam AI</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-sm text-white"
                        : "rounded-bl-sm text-white/90"
                    }`}
                    style={{
                      background:
                        m.role === "user"
                          ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                          : "rgba(255, 255, 255, 0.08)",
                      border: m.role !== "user" ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div
                    className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm"
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSubmit}
              className="p-3 border-t"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                borderColor: "rgba(255,255,255,0.05)",
              }}
            >
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about stocks or market..."
                  disabled={isLoading}
                  className="w-full pl-4 pr-12 py-2.5 rounded-xl text-sm text-white outline-none placeholder-white/30 transition-all disabled:opacity-50"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(59,130,246,0.5)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 p-1.5 rounded-lg text-white/50 hover:text-blue-400 transition-colors disabled:opacity-50 disabled:hover:text-white/50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
