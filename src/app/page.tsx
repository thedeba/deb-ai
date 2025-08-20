"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "bot";
  content: string;
}

interface Conversation {
  id: number;
  messages: Message[];
}

interface ApiResponse {
  response?: string;
  generated_text?: string;
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined in .env.local");
  }

  // Load saved conversations
  useEffect(() => {
    const saved = localStorage.getItem("debai_conversations");
    if (saved) {
      const parsed: Conversation[] = JSON.parse(saved);
      setConversations(parsed);
      if (parsed.length > 0) setActiveConvId(parsed[0].id);
    } else {
      createConversation();
    }
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    localStorage.setItem("debai_conversations", JSON.stringify(conversations));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

  const createConversation = () => {
    const conv: Conversation = { id: Date.now(), messages: [] };
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(conv.id);
  };

  const activeConv = conversations.find((c) => c.id === activeConvId) || null;

  const updateConversation = (convId: number, msg: Message) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, msg] } : c))
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConv) return;

    abortController.current = new AbortController();

    const userMsg: Message = { role: "user", content: input };
    updateConversation(activeConv.id, userMsg);
    setInput("");
    setLoading(true);

    const typingMsg: Message = { role: "bot", content: "" };
    updateConversation(activeConv.id, typingMsg);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
        signal: abortController.current.signal,
      });

      const data: ApiResponse = await res.json();

      let botMessage = data.response || "⚠️ No response";
      if (data.generated_text) {
        try {
          const parsed = JSON.parse(data.generated_text);
          botMessage = parsed.response || JSON.stringify(parsed);
        } catch {}
      }

      // Smooth typing animation
      let index = 0;
      const typingInterval = setInterval(() => {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeConv.id) {
              const msgs = [...c.messages];
              const dots = ["", ".", "..", "..."];
              const dot = dots[index % 4];
              msgs[msgs.length - 1] = {
                role: "bot",
                content: botMessage.slice(0, index) + dot,
              };
              return { ...c, messages: msgs };
            }
            return c;
          })
        );
        index++;
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        if (index > botMessage.length) clearInterval(typingInterval);
      }, 30);
    } catch (err: unknown) {
      console.error(err);

      if (err instanceof DOMException && err.name === "AbortError") {
        // Stopped by user
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeConv.id) {
              const msgs = [...c.messages];
              msgs[msgs.length - 1] = { role: "bot", content: "⏹️ Stopped by user" };
              return { ...c, messages: msgs };
            }
            return c;
          })
        );
      } else {
        // Other errors
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeConv.id) {
              const msgs = [...c.messages];
              msgs[msgs.length - 1] = { role: "bot", content: "❌ Error fetching response" };
              return { ...c, messages: msgs };
            }
            return c;
          })
        );
      }
    } finally {
      setLoading(false);
      abortController.current = null;
    }
  };

  const stopMessage = () => {
    if (abortController.current) {
      abortController.current.abort();
      setLoading(false);
      abortController.current = null;
    }
  };

  return (
    <div
      className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"} flex h-screen`}
    >
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-72" : "w-16"} transition-all duration-300 flex flex-col bg-gray-800 text-white`}>
        <div className="flex justify-between items-center p-2">
          {sidebarOpen && (
            <button className="px-2 py-1 bg-blue-500 rounded" onClick={createConversation}>
              + New Chat
            </button>
          )}
          <div className="flex items-center gap-2">
            {sidebarOpen && (
              <button onClick={() => setDarkMode(!darkMode)} className="px-2 py-1 border rounded text-sm">
                {darkMode ? "Light" : "Dark"}
              </button>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="px-4 py-1 border rounded text-sm">
              ☰
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-none flex flex-col items-center relative">
          {conversations.map((conv) => {
            const title = conv.messages.find((m) => m.role === "user")?.content.slice(0, 25) || "New Chat";
            const previewMessages = conv.messages.slice(-3)
              .map((m) => `${m.role === "user" ? "You" : "AI"}: ${m.content}`)
              .join("\n");

            return sidebarOpen ? (
              <div
                key={conv.id}
                className={`p-2 rounded cursor-pointer mb-1 w-full ${conv.id === activeConvId ? "bg-blue-500 text-white" : "bg-gray-700"}`}
                onClick={() => setActiveConvId(conv.id)}
              >
                {title}
              </div>
            ) : (
              <div key={conv.id} className="relative w-full flex justify-center group mb-2">
                <div
                  className={`w-8 h-8 mt-3 rounded-full bg-gray-600 flex items-center justify-center cursor-pointer ${conv.id === activeConvId ? "ring-2 ring-blue-500" : ""}`}
                  onClick={() => setActiveConvId(conv.id)}
                >
                  {conv.messages.find((m) => m.role === "user")?.content[0]?.toUpperCase() || "N"}
                </div>
                <div className="absolute left-12 top-0 hidden group-hover:block bg-gray-800 text-white p-2 rounded shadow-lg w-64 z-50 whitespace-pre-line">
                  {previewMessages || "No messages yet"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 flex items-center px-4 border-b border-gray-700 bg-gray-800">
          <h1 className="text-xl font-bold">deb AI</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeConv?.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${msg.role === "user" ? "" : "bg-gray-600"}`}>
                {msg.role === "user" ? "" : "AI"}
              </div>
              <div className={`px-4 py-2 rounded-2xl max-w-xs break-words ${msg.role === "user" ? "bg-blue-500 text-white rounded-br-none" : "bg-gray-700 text-white rounded-bl-none fade-in"}`}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 bg-gray-800 border-t flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && !loading) sendMessage();
            }}
            placeholder="Type your message..."
            className="flex-1 border rounded-2xl px-4 py-2 focus:outline-none bg-gray-900 text-white border-gray-700"
            disabled={loading}
          />
          <button
            onClick={loading ? stopMessage : sendMessage}
            className={`px-4 py-2 rounded-2xl ${loading ? "bg-red-500" : "bg-blue-500"} text-white`}
          >
            {loading ? "Stop" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
