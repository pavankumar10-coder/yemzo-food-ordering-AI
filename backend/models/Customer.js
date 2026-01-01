import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    // 👤 Customer full name
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters long"],
    },

    // 📞 Mobile number (must start with 6–9)
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      match: [
        /^[6-9]\d{9}$/,
        "Invalid phone number. Must be 10 digits starting with 6–9.",
      ],
    },

    // 📧 Email (unique, lowercase, must contain '@')
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/@/, "Invalid email format"],
    },

    // 🔒 Password
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },

    // 🏠 Delivery Address (auto-detected or manually entered)
    address: {
      type: String,
      trim: true,
      default: "",
    },

    // 🌍 Geo Coordinates (used for location tracking)
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },

    // 📅 Account creation date
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// ✅ Prevent Mongoose OverwriteModelError in development
const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);

export default Customer;
