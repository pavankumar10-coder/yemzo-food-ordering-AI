
// server.js
import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import morgan from "morgan";
import connectDB from "./config/db.js";

// 🧩 Import route modules
import foodRoutes from "./routes/foodRoutes.js";
import ownerRoutes from "./routes/ownerRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import chatbotRoutes from "./routes/aiOrderBot.js"; // AI order bot\
import locationRoutes from "./routes/location.js";

// =====================================================
// ⚙️ ENV + DATABASE SETUP
// =====================================================
dotenv.config({ path: "./.env" });

console.log("🔍 Checking MongoDB connection...");
await connectDB();

// =====================================================
// 🚀 EXPRESS INITIALIZATION
// =====================================================
const app = express();
const server = http.createServer(app);

// ⚡ Real-time communication setup (Socket.io)
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
});

// 🧠 Attach io to app (so we can use inside routes)
app.set("io", io);

// =====================================================
// 🔌 SOCKET.IO HANDLER
// =====================================================
io.on("connection", (socket) => {
  console.log(`🟢 Socket connected: ${socket.id}`);

  // Primary: explicit join events
  socket.on("join-customer", (customerId) => {
    if (!customerId) return;
    const room = `customer_${customerId}`;
    socket.join(room);
    console.log(`👤 Customer joined: ${room} (socket ${socket.id})`);
  });

  socket.on("join-owner", (ownerId) => {
    if (!ownerId) return;
    const room = `owner_${ownerId}`;
    socket.join(room);
    console.log(`🏨 Owner joined: ${room} (socket ${socket.id})`);
  });

  socket.on("join-delivery", (deliveryBoyId) => {
    if (!deliveryBoyId) return;
    const room = `delivery_${deliveryBoyId}`;
    socket.join(room);
    console.log(`🚴 Delivery joined: ${room} (socket ${socket.id})`);
  });

  socket.on("join-delivery-pool", () => {
    socket.join("delivery_pool");
    console.log(`🚴‍♂️ Delivery joined pool for new order notifications (socket ${socket.id})`);
  });

  // Backwards-compatible: accept raw room name via 'join-room'
  // frontend sometimes emits join-room with a room string (e.g., "customer_<id>")
  socket.on("join-room", (roomName) => {
    if (!roomName || typeof roomName !== "string") return;
    socket.join(roomName);
    console.log(`🔁 Joined generic room: ${roomName} (socket ${socket.id})`);
  });

  // Optional: helpful debug listener to check rooms this socket is in
  socket.on("list-rooms", () => {
    console.log(`📚 Rooms for socket ${socket.id}:`, Array.from(socket.rooms));
  });

  socket.on("disconnect", (reason) => {
    console.log(`🔴 Socket disconnected: ${socket.id} — reason: ${reason}`);
  });
});

// =====================================================
// 🧱 MIDDLEWARES
// =====================================================
app.use(cors());
app.use(express.json());

// 🧾 Log incoming API requests in development
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// =====================================================
// 📦 API ROUTES
// =====================================================
app.use("/api/foods", foodRoutes);          // 🍴 Food routes
app.use("/api/owner", ownerRoutes);         // 🏨 Owner routes
app.use("/api/customers", customerRoutes);  // 👤 Customer routes
app.use("/api/cart", cartRoutes);           // 🛒 Cart routes
app.use("/api/orders", orderRoutes);        // 🧾 Orders
app.use("/api/delivery", deliveryRoutes);   // 🚴 Delivery routes
app.use("/api/reviews", reviewRoutes);      // ⭐ Reviews
app.use("/api/location", locationRoutes);

// ✅ NEW AI ORDERING CHATBOT ROUTE
app.use("/api/ai", chatbotRoutes);          // 🤖 Smart AI Order Bot (Yemzo Assistant)

// =====================================================
// 🩺 HEALTH CHECK
// =====================================================
app.get("/", (req, res) => {
  res.status(200).send("🍴 Yemzo Backend is running successfully with real-time tracking + AI ordering!");
});

// =====================================================
// ⚠️ 404 HANDLER
// =====================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "⚠️ API route not found. Please check your endpoint URL.",
  });
});

// =====================================================
// 💣 GLOBAL ERROR HANDLER
// =====================================================
app.use((err, req, res, next) => {
  console.error("❌ Global Server Error:", err.stack || err);
  res.status(500).json({
    success: false,
    message: "💥 Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong on the server.",
  });
});

// =====================================================
// 🚀 START SERVER
// =====================================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n✅ Yemzo Server is live → http://localhost:${PORT}`);
  console.log("🌿 Environment:", process.env.NODE_ENV || "development");
  console.log("🧠 Connected Routes:");
  console.log("   /api/foods");
  console.log("   /api/owner");
  console.log("   /api/customers");
  console.log("   /api/cart");
  console.log("   /api/orders");
  console.log("   /api/delivery");
  console.log("   /api/reviews");
  console.log("   /api/ai  ← 🤖 Smart AI Order Bot integrated!");
  console.log("⚡ Real-time communication ready (customers, owners, delivery boys)");
  console.log("-------------------------------------------");
});
