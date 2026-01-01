import mongoose from "mongoose";

const foodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Food name is required"],
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [1, "Price must be greater than 0"],
    },

    image: {
      type: String,
      default: "https://via.placeholder.com/200",
    },

    about: {
      type: String,
      trim: true,
      maxlength: [250, "Description cannot exceed 250 characters"],
    },

    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
    },

    // ✅ Optional: tie food to an owner if needed
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      default: null,
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

const Food = mongoose.models.Food || mongoose.model("Food", foodSchema);
export default Food;
