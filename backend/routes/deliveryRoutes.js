// routes/deliveryRoutes.js
import express from "express";
import bcrypt from "bcrypt";
import DeliveryBoy from "../models/DeliveryBoy.js";
import Order from "../models/Order.js";

const router = express.Router();

/* =====================================================
   🧾 DELIVERY BOY AUTHENTICATION
===================================================== */

// ✅ Register new delivery boy
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    if (!name || !email || !phone || !password || !confirmPassword)
      return res.status(400).json({ message: "All fields are required." });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match." });

    const existing = await DeliveryBoy.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered." });

    const hashed = await bcrypt.hash(password, 10);

    const newDeliveryBoy = await DeliveryBoy.create({
      name,
      email,
      phone,
      password: hashed,
    });

    res.status(201).json({
      message: "✅ Registration successful!",
      deliveryBoy: newDeliveryBoy,
    });
  } catch (err) {
    console.error("❌ DeliveryBoy register error:", err);
    res.status(500).json({ message: "Failed to register delivery boy." });
  }
});

// ✅ Login delivery boy
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const deliveryBoy = await DeliveryBoy.findOne({ email });
    if (!deliveryBoy)
      return res.status(400).json({ message: "Invalid email or password." });

    const valid = await bcrypt.compare(password, deliveryBoy.password);
    if (!valid)
      return res.status(400).json({ message: "Invalid email or password." });

    res.status(200).json({
      message: "✅ Login successful!",
      deliveryBoy,
    });
  } catch (err) {
    console.error("❌ DeliveryBoy login error:", err);
    res.status(500).json({ message: "Login failed." });
  }
});

/* =====================================================
   🚴 DELIVERY ACTIONS
===================================================== */

// ✅ Delivery boy accepts an order
router.post("/accept/:orderId", async (req, res) => {
  try {
    const { deliveryBoyId } = req.body;
    if (!deliveryBoyId)
      return res.status(400).json({ message: "Delivery boy ID is required." });

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.deliveryStatus !== "Unassigned")
      return res.status(400).json({ message: "Order already assigned." });

    order.deliveryBoyId = deliveryBoyId;
    order.deliveryStatus = "Assigned";
    order.assignedAt = new Date();
    await order.save();

    const io = req.app.get("io");

    // ✅ Notify all parties
    io.to(`customer_${order.customerId}`).emit("order-updated", order);
    io.to(`owner_${order.ownerId}`).emit("order-updated", order);
    io.to(`delivery_${deliveryBoyId}`).emit("order-assigned", order);

    res.status(200).json({ message: "✅ Order accepted successfully!", order });
  } catch (err) {
    console.error("❌ Accept order error:", err);
    res.status(500).json({ message: "Failed to accept order." });
  }
});

// ✅ Delivery boy picks up order
router.put("/pickup/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.deliveryStatus !== "Assigned")
      return res.status(400).json({ message: "Order not yet assigned." });

    order.deliveryStatus = "PickedUp";
    order.pickedAt = new Date();
    await order.save();

    const io = req.app.get("io");
    io.to(`customer_${order.customerId}`).emit("order-updated", order);
    io.to(`owner_${order.ownerId}`).emit("order-updated", order);
    io.to(`delivery_${order.deliveryBoyId}`).emit("order-updated", order);

    res.status(200).json({ message: "✅ Order picked up!", order });
  } catch (err) {
    console.error("❌ Pickup error:", err);
    res.status(500).json({ message: "Failed to update pickup status." });
  }
});

// ✅ Delivery boy marks order as delivered
router.put("/delivered/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.deliveryStatus !== "PickedUp")
      return res.status(400).json({ message: "Order not picked yet." });

    order.deliveryStatus = "Delivered";
    order.deliveredAt = new Date();
    order.status = "Delivered";
    await order.save();

    const io = req.app.get("io");
    io.to(`customer_${order.customerId}`).emit("order-updated", order);
    io.to(`owner_${order.ownerId}`).emit("order-updated", order);
    io.to(`delivery_${order.deliveryBoyId}`).emit("order-updated", order);

    res.status(200).json({ message: "✅ Order delivered successfully!", order });
  } catch (err) {
    console.error("❌ Delivery error:", err);
    res.status(500).json({ message: "Failed to mark as delivered." });
  }
});

/* =====================================================
   🧹 FETCH ORDERS FOR DELIVERY BOY
===================================================== */
router.get("/my-orders/:deliveryBoyId", async (req, res) => {
  try {
    const orders = await Order.find({ deliveryBoyId: req.params.deliveryBoyId })
      .populate("customerId", "name phone email")
      .populate("ownerId", "hotelName phone email")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    console.error("❌ Fetch delivery orders error:", err);
    res.status(500).json({ message: "Failed to fetch delivery orders." });
  }
});

export default router;
