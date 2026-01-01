import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    // 👤 Customer who gave the review
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    // 🍛 Dish being reviewed
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dish",
      required: true,
    },

    // ⭐ Rating (1–5)
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    // 📝 Optional comment
    comment: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// 🚫 Prevent duplicate reviews from the same customer for the same dish
reviewSchema.index({ customerId: 1, dishId: 1 }, { unique: true });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
export default Review;
