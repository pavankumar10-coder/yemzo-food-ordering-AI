import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer ID is required"],
    },

    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dish",
      required: [true, "Dish ID is required"],
    },

    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity cannot be less than 1"],
    },

    status: {
      type: String,
      enum: ["in-cart", "ordered", "delivered"],
      default: "in-cart",
    },

    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);
export default Cart;
