
import mongoose from "mongoose";
import crypto from "crypto";

// Helper function to generate short friendly owner codes (like: OWN-AB12CD)
function generateOwnerCode() {
  return "OWN-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

const ownerSchema = new mongoose.Schema(
  {
    hotelName: {
      type: String,
      required: [true, "Hotel name is required"],
      trim: true,
      match: [/^[A-Z][A-Za-z\s]*$/, "Hotel name must start with a capital letter"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+$/, "Invalid email format (must include '@')"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[6-9]\d{9}$/, "Invalid phone number format"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    address: {
      type: String,
      default: "",
    },

    // ✅ Friendly Owner Code (for dashboard / login display)
    ownerCode: {
      type: String,
      unique: true,
      default: generateOwnerCode,
      index: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Ensure unique ownerCode before saving (just in case of collision)
ownerSchema.pre("save", async function (next) {
  if (!this.ownerCode) {
    let newCode = generateOwnerCode();
    while (await mongoose.models.Owner.findOne({ ownerCode: newCode })) {
      newCode = generateOwnerCode();
    }
    this.ownerCode = newCode;
  }
  next();
});

const Owner = mongoose.models.Owner || mongoose.model("Owner", ownerSchema);
export default Owner;
