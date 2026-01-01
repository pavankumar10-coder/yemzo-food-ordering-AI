import express from "express";
import Cart from "../models/Cart.js";
import Dish from "../models/Dish.js";

const router = express.Router();

/* =====================================================
   🛒 ADD TO CART
===================================================== */
router.post("/add", async (req, res) => {
  try {
    const { customerId, dishId, quantity } = req.body;

    if (!customerId || !dishId)
      return res.status(400).json({ message: "Missing required fields" });

    // ✅ Verify that the dish exists
    const dish = await Dish.findById(dishId).populate("ownerId", "hotelName");
    if (!dish) return res.status(404).json({ message: "Dish not found" });

    // ✅ Check if dish already exists in the customer's cart
    let existing = await Cart.findOne({ customerId, dishId });
    if (existing) {
      existing.quantity += quantity || 1;
      await existing.save();
      return res.json({
        message: "🛒 Quantity updated in cart",
        cart: existing,
      });
    }

    // ✅ Add new dish to cart
    const newCart = await Cart.create({
      customerId,
      dishId,
      quantity: quantity || 1,
    });

    // ✅ Populate dish details before responding
    const populated = await newCart.populate({
      path: "dishId",
      select: "name price image about ownerId",
      populate: { path: "ownerId", select: "hotelName" },
    });

    res.status(201).json({
      message: `✅ Added ${dish.name} from ${dish.ownerId?.hotelName || "Hotel"} to cart`,
      cart: populated,
    });
  } catch (error) {
    console.error("❌ Error adding to cart:", error);
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   📦 GET CUSTOMER CART ITEMS
===================================================== */
router.get("/:customerId", async (req, res) => {
  try {
    const items = await Cart.find({ customerId: req.params.customerId })
      .populate({
        path: "dishId",
        select: "name price image about ownerId",
        populate: { path: "ownerId", select: "hotelName" },
      })
      .sort({ createdAt: -1 });

    // ✅ Include dishId and ownerId for order creation
    const cartItems = items.map((item) => ({
      _id: item._id, // Cart item ID
      dishId: item.dishId?._id || null, // Real dish ID
      ownerId: item.dishId?.ownerId?._id || null, // Real owner ID
      name: item.dishId?.name,
      price: item.dishId?.price,
      image: item.dishId?.image,
      about: item.dishId?.about,
      hotelName: item.dishId?.ownerId?.hotelName || "Unknown Hotel",
      quantity: item.quantity,
      subtotal: (item.dishId?.price || 0) * item.quantity,
    }));

    const total = cartItems.reduce((sum, i) => sum + i.subtotal, 0);

    res.json({ items: cartItems, total });
  } catch (error) {
    console.error("❌ Error fetching cart:", error);
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   🔢 UPDATE ITEM QUANTITY
===================================================== */
router.put("/update/:id", async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity < 1) {
      await Cart.findByIdAndDelete(req.params.id);
      return res.json({ message: "Item removed as quantity reached 0" });
    }

    const updated = await Cart.findByIdAndUpdate(
      req.params.id,
      { quantity },
      { new: true }
    ).populate({
      path: "dishId",
      select: "name price image about ownerId",
      populate: { path: "ownerId", select: "hotelName" },
    });

    if (!updated)
      return res.status(404).json({ message: "Item not found in cart" });

    const subtotal = (updated.dishId?.price || 0) * updated.quantity;

    res.json({
      message: "✅ Quantity updated successfully",
      item: {
        _id: updated._id,
        dishId: updated.dishId?._id || null,
        ownerId: updated.dishId?.ownerId?._id || null,
        name: updated.dishId?.name,
        price: updated.dishId?.price,
        image: updated.dishId?.image,
        about: updated.dishId?.about,
        hotelName: updated.dishId?.ownerId?.hotelName || "Unknown Hotel",
        quantity: updated.quantity,
        subtotal,
      },
    });
  } catch (error) {
    console.error("❌ Error updating quantity:", error);
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   ❌ REMOVE SINGLE ITEM
===================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Cart.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Item not found in cart" });

    res.json({ message: "🗑️ Item removed from cart" });
  } catch (error) {
    console.error("❌ Error removing item:", error);
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   🧹 CLEAR ENTIRE CART
===================================================== */
router.delete("/clear/:customerId", async (req, res) => {
  try {
    const result = await Cart.deleteMany({ customerId: req.params.customerId });
    res.json({
      message: `🧹 Cleared ${result.deletedCount} item(s) from cart`,
    });
  } catch (error) {
    console.error("❌ Error clearing cart:", error);
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   ✅ PLACE ORDER / CHECKOUT (Optional Future Use)
===================================================== */
router.post("/checkout/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const { paymentMethod } = req.body;

    const cartItems = await Cart.find({ customerId }).populate(
      "dishId",
      "name price"
    );

    if (!cartItems.length)
      return res.status(400).json({ message: "Your cart is empty!" });

    const total = cartItems.reduce(
      (sum, item) => sum + (item.dishId?.price || 0) * (item.quantity || 1),
      0
    );

    await Cart.deleteMany({ customerId });

    res.json({
      message: `✅ Order placed successfully! Total: ₹${total}`,
      paymentMethod: paymentMethod || "Cash on Delivery",
      total,
    });
  } catch (error) {
    console.error("❌ Checkout Error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
