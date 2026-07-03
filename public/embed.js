/**
 * Expexc AI Chatbot Widget Embed Script
 * 
 * Simply include this script on any webpage:
 * <script src="https://expectexception.com/embed.js"></script>
 */

(function () {
    const API_BASE = "https://expectexception.com";
    
    // Inject Styles
    const style = document.createElement("style");
    style.innerHTML = `
      #expexc-widget-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        border: none;
        outline: none;
      }
      #expexc-widget-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      }
      #expexc-widget-btn svg {
        width: 32px;
        height: 32px;
        fill: white;
      }
      #expexc-widget-window {
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 350px;
        height: 500px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        opacity: 0;
        transform: translateY(20px);
        pointer-events: none;
        transition: opacity 0.3s ease, transform 0.3s ease;
        border: 1px solid #e2e8f0;
      }
      #expexc-widget-window.expexc-open {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      #expexc-widget-header {
        background: linear-gradient(135deg, #475569 0%, #1e293b 100%);
        color: white;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 600;
        font-size: 16px;
      }
      #expexc-widget-close {
        cursor: pointer;
        background: none;
        border: none;
        color: white;
        font-size: 20px;
      }
      #expexc-widget-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #f8fafc;
      }
      .expexc-msg {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.4;
      }
      .expexc-msg.user {
        background: #6366f1;
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
      }
      .expexc-msg.assistant {
        background: #ffffff;
        color: #1e293b;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
      }
      #expexc-widget-input-area {
        padding: 12px;
        background: white;
        border-top: 1px solid #e2e8f0;
        display: flex;
        gap: 8px;
        align-items: center;
      }
      #expexc-widget-input {
        flex: 1;
        border: 1px solid #cbd5e1;
        border-radius: 20px;
        padding: 10px 16px;
        font-size: 14px;
        outline: none;
      }
      #expexc-widget-input:focus {
        border-color: #6366f1;
      }
      #expexc-widget-send {
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #expexc-widget-send svg {
        width: 16px;
        height: 16px;
        fill: white;
      }
    `;
    document.head.appendChild(style);

    // Create container
    const container = document.createElement("div");
    container.id = "expexc-chatbot-container";
    
    // Bubble Button
    const btn = document.createElement("button");
    btn.id = "expexc-widget-btn";
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>`;
    
    // Chat Window
    const win = document.createElement("div");
    win.id = "expexc-widget-window";
    win.innerHTML = `
      <div id="expexc-widget-header">
        <div style="display:flex; align-items:center; gap: 8px;">
          <svg style="width:20px;height:20px;fill:white;" viewBox="0 2 24 24"><path d="M11.66 4.31L16 8.65V7c0-1.1-.9-2-2-2h-3v1zM6.9 10H5c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h1.9c0 .7.31 1.34.8 1.77L11.5 24l5.37-5.37-3.95-3.95v-3H13v-3.35L6.9 10zm-1.1 8H5v-6h.8v6zm4.7-6v2h1v1h-1v2H9v-5h1.5zm6.5 1h-2v4h2v-4zm.13-2.91L21 6.2C20.62 5.51 19.89 5 19 5h-1v2h1c.55 0 1 .45 1 1s-.45 1-1 1h-2v2h2.2l-1.07 1.09-3.93-3.95V10h-2v3.35l4 4 5.37-5.37c-.38-.63-1.05-1.08-1.87-1.08z"/></svg>
          Legal Advocate AI
        </div>
        <button id="expexc-widget-close">&times;</button>
      </div>
      <div id="expexc-widget-messages">
        <div class="expexc-msg assistant">Hello! I am an AI Legal Assistant. Note: This is not formal legal advice. How can I help you today?</div>
      </div>
      <div id="expexc-widget-input-area">
        <input type="text" id="expexc-widget-input" placeholder="Type a message..." />
        <button id="expexc-widget-send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
        </button>
      </div>
    `;
    
    container.appendChild(btn);
    container.appendChild(win);
    document.body.appendChild(container);

    // State
    let conversationId = null;
    let widgetSession = localStorage.getItem("expexc_widget_session");
    if (!widgetSession) {
        // Generate pseudo-random session if none exists
        widgetSession = "ws_" + Math.random().toString(36).substring(2, 15);
        localStorage.setItem("expexc_widget_session", widgetSession);
    }
    
    const elements = {
        btn: document.getElementById("expexc-widget-btn"),
        win: document.getElementById("expexc-widget-window"),
        close: document.getElementById("expexc-widget-close"),
        input: document.getElementById("expexc-widget-input"),
        sendBtn: document.getElementById("expexc-widget-send"),
        msgLayer: document.getElementById("expexc-widget-messages")
    };

    // Toggle
    elements.btn.addEventListener("click", () => elements.win.classList.toggle("expexc-open"));
    elements.close.addEventListener("click", () => elements.win.classList.remove("expexc-open"));

    // Scroll to bottom
    const scrollToBottom = () => {
        elements.msgLayer.scrollTop = elements.msgLayer.scrollHeight;
    };

    // Add Msg bubble
    const addMessage = (role, text) => {
        const div = document.createElement("div");
        div.className = "expexc-msg " + role;
        // Basic Markdown stripping for simplicity
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/`(.*?)`/g, '<code style="background:#f1f5f9;padding:2px 4px;border-radius:4px;">$1</code>');
        text = text.replace(/\n/g, '<br>');
        div.innerHTML = text;
        elements.msgLayer.appendChild(div);
        scrollToBottom();
        return div;
    };

    const sendMessage = async () => {
        const text = elements.input.value.trim();
        if (!text) return;

        addMessage("user", text);
        elements.input.value = "";
        
        const loader = addMessage("assistant", "...");
        
        try {
            const res = await fetch(API_BASE + "/api/chatbot/widget/chat/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Widget-Session": widgetSession
                },
                body: JSON.stringify({
                    message: text,
                    conversation_id: conversationId,
                    persona: "advocate"
                })
            });

            if (!res.ok) throw new Error("Network error");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine.startsWith("data: ")) continue;
                    try {
                        const data = JSON.parse(trimmedLine.slice(6));
                        if (data.chunk) {
                            if (fullText === "") loader.innerHTML = "";
                            fullText += data.chunk;
                            // Clean markdown for widget
                            let htmlText = fullText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                            loader.innerHTML = htmlText;
                            scrollToBottom();
                        }
                        if (data.done) {
                            conversationId = data.conversation_id;
                            if (data.widget_session) widgetSession = data.widget_session;
                        }
                        if (data.error) {
                            loader.innerHTML = "Sorry, an error occurred: " + data.error;
                        }
                    } catch (e) { }
                }
            }

        } catch (err) {
            loader.innerHTML = "Failed to connect to AI server.";
        }
    };

    elements.sendBtn.addEventListener("click", sendMessage);
    elements.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });

})();
