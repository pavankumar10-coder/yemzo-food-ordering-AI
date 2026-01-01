// routes/orderRoutes.js
import express from "express";
import Order from "../models/Order.js";

const router = express.Router();

/* =====================================================
   🧾 CREATE ORDER (Customer)
===================================================== */
router.post("/create", async (req, res) => {
  try {
    const { customerId, ownerId, items, totalAmount, address, payment } = req.body;

    if (!customerId || !ownerId || !items?.length || !totalAmount || !address || !payment) {
      return res.status(400).json({ message: "All order fields are required." });
    }

    const newOrder = await Order.create({
      customerId,
      ownerId,
      items,
      totalAmount,
      address,
      payment,
      status: "Pending",
      deliveryStatus: "Unassigned",
    });

    const io = req.app.get("io");

    // Notify owner instantly
    io.to(`owner_${ownerId}`).emit("new-order", newOrder);

    // Notify all delivery boys in pool
    io.to("delivery_pool").emit("available-order", {
      orderId: newOrder._id,
      hotel: ownerId,
      totalAmount: newOrder.totalAmount,
      items: newOrder.items.map((i) => ({ name: i.name, quantity: i.quantity })),
    });

    res.status(201).json({
      message: "✅ Order placed successfully!",
      order: newOrder,
    });
  } catch (err) {
    console.error("❌ Order creation error:", err);
    res.status(500).json({ message: "Failed to create order." });
  }
});

/* =====================================================
   🏨 GET ORDERS (Owner)
===================================================== */
router.get("/owner/:ownerId", async (req, res) => {
  try {
    const orders = await Order.find({ ownerId: req.params.ownerId })
      .populate("customerId", "name phone email")
      .populate("deliveryBoyId", "name phone email")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    console.error("❌ Fetch owner orders error:", err);
    res.status(500).json({ message: "Failed to fetch owner orders." });
  }
});

/* =====================================================
   👤 GET ORDERS (Customer)
===================================================== */
router.get("/customer/:customerId", async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.customerId })
      .populate("ownerId", "hotelName email phone")
      .populate("deliveryBoyId", "name phone email")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    console.error("❌ Fetch customer orders error:", err);
    res.status(500).json({ message: "Failed to fetch customer orders." });
  }
});

/* =====================================================
   🧾 UPDATE ORDER STATUS (Owner)
   - Owner marks: Pending → Preparing → Dish Picked by Delivery Boy
===================================================== */
router.put("/status/:orderId", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required." });

    const updateData = { status };

    // If owner marks "Dish Picked by Delivery Boy", update delivery status too
    if (status === "Dish Picked by Delivery Boy") {
      updateData.deliveryStatus = "PickedUp";
      updateData.pickedAt = new Date();
    }

    const updatedOrder = await Order.findByIdAndUpdate(req.params.orderId, updateData, {
      new: true,
    })
      .populate("customerId", "name email phone")
      .populate("ownerId", "hotelName email")
      .populate("deliveryBoyId", "name email phone");

    if (!updatedOrder) return res.status(404).json({ message: "Order not found." });

    const io = req.app.get("io");

    // Emit updates to all relevant parties
    io.to(`customer_${updatedOrder.customerId._id}`).emit("order-updated", updatedOrder);
    io.to(`owner_${updatedOrder.ownerId._id}`).emit("order-updated", updatedOrder);
    if (updatedOrder.deliveryBoyId) {
      io.to(`delivery_${updatedOrder.deliveryBoyId._id}`).emit("order-updated", updatedOrder);
    }

    res.status(200).json({
      message: `✅ Order updated to '${status}'`,
      order: updatedOrder,
    });
  } catch (err) {
    console.error("❌ Update order status error:", err);
    res.status(500).json({ message: "Failed to update order status." });
  }
});

/* =====================================================
   🚴 DELIVERY BOY ACTIONS
===================================================== */

// ✅ Accept Order (assigns delivery boy)
router.put("/assign/:orderId", async (req, res) => {
  try {
    const { deliveryBoyId } = req.body;
    if (!deliveryBoyId)
      return res.status(400).json({ message: "Delivery boy ID is required." });

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        deliveryBoyId,
        deliveryStatus: "Assigned",
        assignedAt: new Date(),
      },
      { new: true }
    )
      .populate("customerId", "name email phone")
      .populate("ownerId", "hotelName email")
      .populate("deliveryBoyId", "name email phone");

    if (!updatedOrder) return res.status(404).json({ message: "Order not found." });

    const io = req.app.get("io");

    // Notify all roles
    io.to(`customer_${updatedOrder.customerId._id}`).emit("order-updated", updatedOrder);
    io.to(`owner_${updatedOrder.ownerId._id}`).emit("order-updated", updatedOrder);
    io.to(`delivery_${deliveryBoyId}`).emit("order-updated", updatedOrder);

    res.status(200).json({
      message: "✅ Order assigned to delivery boy.",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("❌ Assign delivery boy error:", err);
    res.status(500).json({ message: "Failed to assign order." });
  }
});

// ✅ Delivery Boy picks up order
router.put("/pickup/:orderId", async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        status: "Dish Picked by Delivery Boy",
        deliveryStatus: "PickedUp",
        pickedAt: new Date(),
      },
      { new: true }
    )
      .populate("customerId", "name email phone")
      .populate("ownerId", "hotelName email")
      .populate("deliveryBoyId", "name email phone");

    const io = req.app.get("io");
    io.emit("order-updated", updatedOrder); // Notify all

    res.status(200).json({
      message: "✅ Order picked up successfully.",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("❌ Pickup error:", err);
    res.status(500).json({ message: "Failed to update pickup status." });
  }
});

// ✅ Delivery Boy marks as Delivered
router.put("/delivered/:orderId", async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        status: "Delivered",
        deliveryStatus: "Delivered",
        deliveredAt: new Date(),
      },
      { new: true }
    )
      .populate("customerId", "name email phone")
      .populate("ownerId", "hotelName email")
      .populate("deliveryBoyId", "name email phone");

    const io = req.app.get("io");
    io.emit("order-updated", updatedOrder); // Notify all

    res.status(200).json({
      message: "✅ Order delivered successfully.",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("❌ Deliver error:", err);
    res.status(500).json({ message: "Failed to mark order delivered." });
  }
});

/* =====================================================
   🧹 ADMIN / DEBUG (Optional)
===================================================== */
router.get("/all", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customerId", "name email")
      .populate("ownerId", "hotelName email")
      .populate("deliveryBoyId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    console.error("❌ Fetch all orders error:", err);
    res.status(500).json({ message: "Failed to fetch all orders." });
  }
});

export default router;
