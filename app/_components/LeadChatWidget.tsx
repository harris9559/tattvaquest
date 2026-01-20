"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type MessageRole = "bot" | "user";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  buttons?: QuickReplyButton[];
}

interface QuickReplyButton {
  label: string;
  value: string;
}

type ConversationStep =
  | "initial"
  | "ai_chat"
  | "collect_name"
  | "collect_email"
  | "collect_phone"
  | "collect_message"
  | "submitting"
  | "complete";

interface LeadData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeApiBaseUrl(input: string) {
  return input.replace(/\/+$/, "");
}

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

const INITIAL_BUTTONS: QuickReplyButton[] = [
  { label: "General Inquiry", value: "general" },
  { label: "Consultation", value: "consultation" },
  { label: "Something Else", value: "other" },
];

export default function LeadChatWidget() {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const apiBaseUrl = useMemo(() => {
    const fromEnv = process.env.NEXT_PUBLIC_API_URL;
    return normalizeApiBaseUrl(fromEnv && fromEnv.length > 0 ? fromEnv : "http://localhost:3001");
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [step, setStep] = useState<ConversationStep>("initial");
  const [leadData, setLeadData] = useState<LeadData>({ name: "", email: "", phone: "", message: "" });
  const [isTyping, setIsTyping] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (isOpen && !hasInitialized) {
      setMessages([
        {
          id: generateId(),
          role: "bot",
          content: "Hi 👋 Got any questions? I'm here to help.",
        },
        {
          id: generateId(),
          role: "bot",
          content: "What would you like to do?",
          buttons: INITIAL_BUTTONS,
        },
      ]);
      setHasInitialized(true);
    }
  }, [isOpen, hasInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, step]);

  function addBotMessage(content: string, buttons?: QuickReplyButton[]) {
    setMessages((prev) => [...prev, { id: generateId(), role: "bot", content, buttons }]);
  }

  function addUserMessage(content: string) {
    setMessages((prev) => [...prev, { id: generateId(), role: "user", content }]);
  }

  async function handleAiChat(userMessage: string) {
    setIsTyping(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await response.json().catch(() => null);
      const reply = data?.reply || "I'd be happy to help. Would you like to speak with one of our consultants?";
      setIsTyping(false);
      addBotMessage(reply);
      setTimeout(() => {
        addBotMessage("Would you like to leave your contact details so our team can follow up?", [
          { label: "Yes, let's do that", value: "start_lead" },
          { label: "I have another question", value: "continue_chat" },
        ]);
      }, 500);
    } catch {
      setIsTyping(false);
      addBotMessage("I apologize for the inconvenience. Would you like to leave your contact details instead?", [
        { label: "Yes, let's do that", value: "start_lead" },
        { label: "I have another question", value: "continue_chat" },
      ]);
    }
  }

  async function submitLead() {
    setStep("submitting");
    setIsTyping(true);
    try {
      const currentPageUrl = typeof window !== "undefined" ? window.location.href : "";
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

      const response = await fetch(`${apiBaseUrl}/api/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadData.name.trim(),
          email: leadData.email.trim(),
          phone: leadData.phone.trim(),
          message: leadData.message.trim(),
          pageUrl: currentPageUrl,
          userAgent,
        }),
      });

      setIsTyping(false);

      if (response.ok) {
        setStep("complete");
        addBotMessage("Thank you! A member of our team will get back to you shortly. 🙌");
      } else {
        addBotMessage("I'm sorry, there was an issue submitting your information. Please try again or contact us directly.");
        setStep("collect_message");
      }
    } catch {
      setIsTyping(false);
      addBotMessage("I'm sorry, there was a connection issue. Please try again.");
      setStep("collect_message");
    }
  }

  function startLeadCapture() {
    setStep("collect_name");
    addBotMessage("Before we proceed, what's your name?");
  }

  function handleQuickReply(value: string) {
    if (value === "general" || value === "consultation" || value === "other") {
      const labelMap: Record<string, string> = {
        general: "General Inquiry",
        consultation: "Consultation",
        other: "Something Else",
      };
      addUserMessage(labelMap[value]);
      setStep("ai_chat");
      addBotMessage("Great! Feel free to type your question below, or I can connect you with a consultant.");
    } else if (value === "start_lead") {
      addUserMessage("Yes, let's do that");
      startLeadCapture();
    } else if (value === "continue_chat") {
      addUserMessage("I have another question");
      addBotMessage("Of course! What would you like to know?");
    }
  }

  function handleInputSubmit() {
    const value = inputValue.trim();
    if (!value) return;

    addUserMessage(value);
    setInputValue("");

    switch (step) {
      case "initial":
      case "ai_chat":
        handleAiChat(value);
        break;

      case "collect_name":
        setLeadData((prev) => ({ ...prev, name: value }));
        setStep("collect_email");
        setTimeout(() => addBotMessage(`Thanks ${value}! What's your email address?`), 300);
        break;

      case "collect_email":
        if (!isValidEmail(value)) {
          addBotMessage("That doesn't look like a valid email. Could you please try again?");
          return;
        }
        setLeadData((prev) => ({ ...prev, email: value }));
        setStep("collect_phone");
        setTimeout(() => addBotMessage("Optional — would you like to share a phone number? (Type 'skip' to skip)"), 300);
        break;

      case "collect_phone":
        const phone = value.toLowerCase() === "skip" ? "" : value;
        setLeadData((prev) => ({ ...prev, phone }));
        setStep("collect_message");
        setTimeout(() => addBotMessage("Please describe your query or how we can help you."), 300);
        break;

      case "collect_message":
        setLeadData((prev) => {
          const updated = { ...prev, message: value };
          setTimeout(() => {
            addBotMessage("By continuing, you agree to our Privacy Policy.");
            setTimeout(() => submitLeadWithData(updated), 500);
          }, 300);
          return updated;
        });
        break;

      default:
        break;
    }
  }

  async function submitLeadWithData(data: LeadData) {
    setStep("submitting");
    setIsTyping(true);
    try {
      const currentPageUrl = typeof window !== "undefined" ? window.location.href : "";
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

      const response = await fetch(`${apiBaseUrl}/api/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          message: data.message.trim(),
          pageUrl: currentPageUrl,
          userAgent,
        }),
      });

      setIsTyping(false);

      if (response.ok) {
        setStep("complete");
        addBotMessage("Thank you! A member of our team will get back to you shortly. 🙌");
      } else {
        addBotMessage("I'm sorry, there was an issue submitting your information. Please try again.");
        setStep("collect_message");
      }
    } catch {
      setIsTyping(false);
      addBotMessage("I'm sorry, there was a connection issue. Please try again.");
      setStep("collect_message");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    }
  }

  function resetChat() {
    setMessages([]);
    setStep("initial");
    setLeadData({ name: "", email: "", phone: "", message: "" });
    setHasInitialized(false);
    setInputValue("");
  }

  function handleClose() {
    setIsOpen(false);
  }

  function handleOpen() {
    setIsOpen(true);
  }

  const isInputDisabled = step === "submitting" || step === "complete";

  function getInputPlaceholder(): string {
    switch (step) {
      case "collect_name":
        return "Enter your name...";
      case "collect_email":
        return "Enter your email...";
      case "collect_phone":
        return "Enter phone or type 'skip'...";
      case "collect_message":
        return "Describe your query...";
      case "complete":
        return "Chat complete";
      default:
        return "Type your message...";
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {isOpen ? (
        <div className="flex h-[500px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">TattvaQuest Assistant</div>
                <div className="text-[11px] text-white/70">We typically reply instantly</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Close chat"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-sky-500 text-white"
                        : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {msg.content}
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.buttons.map((btn) => (
                          <button
                            key={btn.value}
                            type="button"
                            onClick={() => handleQuickReply(btn.value)}
                            className="rounded-full border border-sky-400/50 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 transition hover:bg-sky-500/20 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-zinc-800 px-4 py-3 text-sm text-zinc-400">
                    <span className="inline-flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-white/10 bg-zinc-900/50 px-4 py-3">
            {step === "complete" ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Chat complete</span>
                <button
                  type="button"
                  onClick={resetChat}
                  className="text-xs font-medium text-sky-400 hover:text-sky-300"
                >
                  Start new chat
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isInputDisabled}
                  placeholder={getInputPlaceholder()}
                  className="flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleInputSubmit}
                  disabled={isInputDisabled || !inputValue.trim()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            )}
            <div className="mt-2 text-center text-[10px] text-zinc-500">
              By continuing, you agree to our{" "}
              <Link href="/privacy" className="text-zinc-400 underline hover:text-zinc-300">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:shadow-sky-500/50 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label="Open chat"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span>Chat with us</span>
        </button>
      )}
    </div>
  );
}
