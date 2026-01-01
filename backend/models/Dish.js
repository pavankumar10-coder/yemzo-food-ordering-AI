import mongoose from "mongoose";

const dishSchema = new mongoose.Schema(
  {
    // 🏨 Reference to the hotel owner
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      required: [true, "Owner ID is required"],
    },

    // 🍛 Dish name
    name: {
      type: String,
      required: [true, "Dish name is required"],
      trim: true,
      minlength: [2, "Dish name must be at least 2 characters long"],
    },

    // 💰 Price
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [1, "Price must be at least 1"],
    },

    // 🖼️ Image URL
    image: {
      type: String,
      default: "https://via.placeholder.com/200",
      validate: {
        validator: function (v) {
          // Optional basic URL validation
          return !v || /^https?:\/\/.+\..+/.test(v);
        },
        message: "Invalid image URL format",
      },
    },

    // 📄 Description
    about: {
      type: String,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },

    // ⭐ Average Rating (new field)
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

const Dish = mongoose.models.Dish || mongoose.model("Dish", dishSchema);
export default Dish;
