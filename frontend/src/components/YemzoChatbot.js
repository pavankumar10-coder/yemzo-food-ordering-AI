// src/components/YemzoChatbot.js
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "../styles/YemzoChatbot.css";

export default function YemzoChatbot({ customerId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "👋 Hi! I can help you order food — try: “Order me a biryani under ₹180 with rating above 4.5.”" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingForAddress, setWaitingForAddress] = useState(null); // { originalMessage, parsed, foundDish }
  const [addressInput, setAddressInput] = useState("");
  const scrollRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!customerId) return;

    const s = io("http://localhost:5000", { transports: ["websocket"], reconnectionAttempts: 3 });
    setSocket(s);

    s.on("connect", () => {
      console.log("🟢 [Chatbot] socket connected:", s.id);
      s.emit("join-customer", customerId);
    });

    // when server emits confirmation (created via route or other)
    s.on("order-created", (data) => {
      console.log("🤖 [Chatbot] socket order-created:", data);
      const text =
        data.message ||
        `✅ Order placed: ${data.order?.items?.[0]?.name || "dish"} — ₹${data.order?.totalAmount || ""}.`;
      setMessages((prev) => [...prev, { from: "bot", text }]);
    });

    s.on("disconnect", () => {
      console.warn("🔴 [Chatbot] socket disconnected");
    });

    return () => s.disconnect();
  }, [customerId]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loading, waitingForAddress]);

  // Core send
  const sendMessageToBot = async (message, addressOverride = null) => {
    if (!message) return;
    setLoading(true);
    try {
      const payload = { customerId, message };
      if (addressOverride) payload.address = addressOverride;

      const res = await axios.post("http://localhost:5000/api/ai/order-bot", payload);
      const data = res.data;

      // Add bot reply if present
      if (data.reply) {
        setMessages((prev) => [...prev, { from: "bot", text: data.reply }]);
      }

      // If backend flagged needAddress, show inline prompt to user
      if (data.needAddress) {
        setWaitingForAddress({
          originalMessage: message,
          parsed: data.parsed || null,
          foundDish: data.foundDish || null,
        });
        // add a short instruction message (so user sees the request)
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: "Please type your delivery address below and press 'Send Address' so I can place the order." },
        ]);
        return;
      }

      // If an order object was returned, show confirmation and dish summary
      if (data.order) {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: `✅ Order placed: ${data.order._id.toString().slice(-6)} — total ₹${data.order.totalAmount}` },
        ]);
        if (data.foundDish) {
          setMessages((prev) => [
            ...prev,
            { from: "bot", text: `Ordered ${data.foundDish.name} from ${data.foundDish.hotelName || "restaurant"} — ₹${data.foundDish.price}` },
          ]);
        }
      }
    } catch (err) {
      console.error("AI bot error:", err);
      setMessages((prev) => [...prev, { from: "bot", text: "⚠️ An error occurred. Try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  // user pressed send in chat
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { from: "user", text: trimmed }]);
    setInput("");
    await sendMessageToBot(trimmed);
  };

  // If backend asked for address, we send address+original message
  const submitAddressAndPlaceOrder = async () => {
    if (!addressInput.trim()) return alert("Please enter your delivery address.");
    // show user address msg
    setMessages((m) => [...m, { from: "user", text: addressInput.trim() }]);
    const original = waitingForAddress?.originalMessage;
    setWaitingForAddress(null);
    setAddressInput("");
    // resend original message with address override
    await sendMessageToBot(original, addressInput.trim());
  };

  // keyboard Enter
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // if waiting for address, submit address (Enter behaves like send address)
      if (waitingForAddress) submitAddressAndPlaceOrder();
      else sendMessage();
    }
  };

  return (
    <div className={`yemzo-chatbot ${open ? "open" : ""}`}>
      <div className="chat-toggle" onClick={() => setOpen((v) => !v)}>
        {!open ? <div className="bubble"><span>💬</span></div> : <div className="close">✖</div>}
      </div>

      <div className="chat-window">
        <div className="chat-header">
          <strong>Yemzo Assistant</strong>
          <small className="ms-2 text-muted">AI Ordering</small>
        </div>

        <div className="chat-body" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.from === "user" ? "user" : "bot"}`}>
              <div className="msg-text">{m.text}</div>
            </div>
          ))}

          {waitingForAddress && (
            <div className="chat-msg bot">
              <div className="msg-text">
                <strong>Address required:</strong> Please enter your delivery address below and click <em>Send Address</em>.
              </div>
            </div>
          )}

          {loading && (
            <div className="chat-msg bot">
              <div className="msg-text"><span className="dots">• • •</span> Thinking...</div>
            </div>
          )}
        </div>

        <div className="chat-input">
          {waitingForAddress ? (
            <>
              <textarea
                placeholder="Enter delivery address..."
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
              />
              <button className="btn-send" onClick={submitAddressAndPlaceOrder} disabled={loading || !customerId}>
                Send Address
              </button>
            </>
          ) : (
            <>
              <textarea
                placeholder='Try: "Order me a biryani under 200"'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
              />
              <button className="btn-send" onClick={sendMessage} disabled={loading || !customerId}>
                {loading ? "..." : "Send"}
              </button>
            </>
          )}
        </div>

        {!customerId && (
          <div className="chat-footer text-center small text-muted">
            Please login to place orders.
          </div>
        )}
      </div>
    </div>
  );
}
