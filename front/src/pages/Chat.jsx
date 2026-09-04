import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { toast } from "react-hot-toast";

export default function ChatPage() {
    const [messages, setMessages] = useState([
        { role: "ai", content: "Hi! I'm your personal AI Career Mentor. I've reviewed your profile. How can I help you advance your career today?" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    // Auto-resize textarea as user types
    const autoResize = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }, []);

    useEffect(() => {
        autoResize();
    }, [input, autoResize]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/chat/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg.content }),
                credentials: "include"
            });

            const data = await res.json();
            if (data.ok) {
                setMessages(prev => [...prev, { role: "ai", content: data.reply }]);
            } else {
                toast.error(data.error || "Failed to get response");
            }
        } catch (err) {
            console.error(err);
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div style={layout.page}>
            <Sidebar />
            <main style={layout.main}>
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.h1}>🤖 AI Career Mentor</h1>
                        <p style={styles.subtitle}>Powered by advanced LLM · Knows your profile · Ready to guide you</p>
                    </div>
                </div>

                {/* Chat Window */}
                <div style={styles.chatWindow}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                            <div style={msg.role === "ai" ? styles.aiBubble : styles.userBubble}>
                                {msg.role === "ai" && (
                                    <div style={styles.aiAvatar}>🤖</div>
                                )}
                                <div
                                    style={styles.bubbleText}
                                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                                />
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: "flex", justifyContent: "flex-start" }}>
                            <div style={styles.aiBubble}>
                                <div style={styles.aiAvatar}>🤖</div>
                                <div style={styles.thinkingDots}>
                                    <span>●</span><span>●</span><span>●</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={styles.inputArea}>
                    <div style={styles.inputWrapper}>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about jobs, skills, career advice... (Shift+Enter for new line)"
                            disabled={loading}
                            rows={1}
                            style={styles.textarea}
                        />
                        <button onClick={handleSend} disabled={loading || !input.trim()} style={styles.sendBtn}>
                            {loading ? "..." : "➤"}
                        </button>
                    </div>
                    <p style={styles.inputHint}>Press Enter to send · Shift+Enter for new line</p>
                </div>

                <style>{`
                    @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
                    @keyframes bounce { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }
                    .thinking-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #f97316; margin: 0 2px; animation: bounce 1.4s infinite ease-in-out both; }
                    .thinking-dot:nth-child(1) { animation-delay: -0.32s; }
                    .thinking-dot:nth-child(2) { animation-delay: -0.16s; }
                `}</style>
            </main>
        </div>
    );
}



function formatMessage(text) {
    if (!text) return "";

    // Strip raw JSON objects/arrays (when AI accidentally returns JSON)
    text = text.replace(/```json\s*([\s\S]*?)```/gi, (_, json) => {
        try {
            const parsed = JSON.parse(json.trim());
            const lines = Object.entries(parsed).map(([k, v]) =>
                `<div style="margin:4px 0"><span style="color:#fdba74;font-weight:600">${k.replace(/_/g,' ')}:</span> <span style="color:#111827">${Array.isArray(v) ? v.join(', ') : v}</span></div>`
            ).join('');
            return `<div style="background:#f5f6f8;border:1px solid #e2e6ee;border-radius:8px;padding:12px 16px;margin:8px 0;font-size:13px">${lines}</div>`;
        } catch { return `<pre style="background:#f5f6f8;padding:12px;border-radius:8px;overflow-x:auto;font-size:12px;color:#a3e635">${json}</pre>`; }
    });

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code style="background:#f5f6f8;color:#a3e635;padding:2px 6px;border-radius:4px;font-size:13px">$1</code>');

    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#111827">$1</strong>');

    // Headers (##, ###)
    text = text.replace(/^### (.+)$/gm, '<div style="font-size:15px;font-weight:700;color:#f59e0b;margin:14px 0 6px">$1</div>');
    text = text.replace(/^## (.+)$/gm, '<div style="font-size:17px;font-weight:800;color:#111827;margin:16px 0 8px">$1</div>');

    // Numbered list
    text = text.replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:#fdba74;font-weight:700;min-width:20px">$1.</span><span style="color:#d7e0ec">$2</span></div>');

    // Bullet list  
    text = text.replace(/^[-*] (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:#fdba74">•</span><span style="color:#d7e0ec">$1</span></div>');

    // Newlines
    text = text.replace(/\n\n/g, '<div style="margin:8px 0"></div>');
    text = text.replace(/\n/g, '<br />');

    return text;
}

const layout = {
    page: { display: "flex", minHeight: "100vh", background: "#f5f6f8" },
    main: {
        flex: 1,
        marginLeft: 240,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
    },
};

const styles = {
    header: {
        padding: "24px 36px 16px",
        borderBottom: "1px solid rgba(17,24,39,0.06)",
        background: "#f5f6f8",
        flexShrink: 0,
    },
    h1: { margin: 0, fontSize: 24, color: "#111827", fontWeight: 800 },
    subtitle: { margin: "4px 0 0", color: "#6b7280", fontSize: 13 },
    chatWindow: {
        flex: 1,
        overflowY: "auto",
        padding: "24px 36px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    aiBubble: {
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        maxWidth: "80%",
    },
    userBubble: {
        padding: "14px 20px",
        background: "linear-gradient(135deg, #f97316, #ea580c)",
        borderRadius: "16px 16px 4px 16px",
        color: "#fff",
        fontSize: 15,
        lineHeight: 1.6,
        maxWidth: "80%",
        boxShadow: "0 4px 12px rgba(234,88,12,0.3)",
    },
    aiAvatar: {
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #ffffff, #e2e6ee)",
        border: "1px solid rgba(17,24,39,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
    },
    bubbleText: {
        padding: "14px 18px",
        background: "#ffffff",
        borderRadius: "4px 16px 16px 16px",
        color: "#111827",
        fontSize: 15,
        lineHeight: 1.7,
        border: "1px solid rgba(17,24,39,0.06)",
        flex: 1,
    },
    thinkingDots: {
        padding: "14px 18px",
        background: "#ffffff",
        borderRadius: "4px 16px 16px 16px",
        color: "#f97316",
        fontSize: 22,
        letterSpacing: 4,
        border: "1px solid rgba(17,24,39,0.06)",
        animation: "pulse 1.5s infinite",
    },
    inputArea: {
        padding: "16px 36px 24px",
        borderTop: "1px solid rgba(17,24,39,0.06)",
        background: "#f5f6f8",
        flexShrink: 0,
    },
    inputWrapper: {
        display: "flex",
        gap: 12,
        alignItems: "flex-end",
        background: "#ffffff",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "12px 16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        transition: "border-color 0.2s",
    },
    textarea: {
        flex: 1,
        background: "transparent",
        color: "#111827",
        border: "none",
        outline: "none",
        fontFamily: "Inter, sans-serif",
        fontSize: 15,
        lineHeight: 1.6,
        resize: "none",
        minHeight: 24,
        maxHeight: 160,
        overflowY: "auto",
        padding: 0,
    },
    sendBtn: {
        padding: "0 16px",
        height: 38,
        background: "linear-gradient(135deg, #f97316, #ea580c)",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        fontSize: 18,
        fontWeight: 700,
        flexShrink: 0,
        transition: "all 0.2s",
        boxShadow: "0 4px 10px rgba(234,88,12,0.3)",
    },
    inputHint: {
        margin: "8px 0 0",
        fontSize: 11,
        color: "#475569",
        textAlign: "center",
    },
};
