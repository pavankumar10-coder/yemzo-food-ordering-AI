// models/Order.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    /* =====================================================
       👤 CUSTOMER INFO
    ===================================================== */
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    /* =====================================================
       🏨 OWNER (HOTEL) INFO
    ===================================================== */
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
    },

    /* =====================================================
       🍽️ ORDERED ITEMS
    ===================================================== */
    items: [
      {
        dishId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Dish",
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],

    /* =====================================================
       💰 ORDER DETAILS
    ===================================================== */
    totalAmount: { type: Number, required: true },
    address: { type: String, required: true },
    payment: { type: String, enum: ["COD", "UPI", "Card"], required: true },

    /* =====================================================
       📦 ORDER STATUS (Owner-side)
       - Owner handles: Pending → Preparing → Dish Picked by Delivery Boy
    ===================================================== */
    status: {
      type: String,
      enum: [
        "Pending", // created by customer
        "Preparing", // accepted & being prepared by hotel
        "Dish Picked by Delivery Boy", // marked by owner
        "Delivered", // final confirmation (by delivery boy)
        "Cancelled",
      ],
      default: "Pending",
    },

    /* =====================================================
       🚴 DELIVERY MANAGEMENT
       - For tracking who accepted, picked, or delivered the order
    ===================================================== */
    deliveryBoyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
      default: null,
    },

    deliveryStatus: {
      type: String,
      enum: [
        "Unassigned", // no delivery boy yet
        "Assigned", // accepted by delivery boy
        "PickedUp", // dish picked from hotel
        "OutForDelivery", // optional
        "Delivered", // reached customer
      ],
      default: "Unassigned",
    },

    // 🕒 Delivery timeline
    assignedAt: { type: Date },
    pickedAt: { type: Date },
    deliveredAt: { type: Date },

    /* =====================================================
       📝 EXTRA META INFO
    ===================================================== */
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
