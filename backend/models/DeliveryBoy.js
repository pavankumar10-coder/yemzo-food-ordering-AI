// models/DeliveryBoy.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const deliveryBoySchema = new mongoose.Schema(
  {
    /* =====================================================
       👤 BASIC INFO
    ===================================================== */
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[6-9]\d{9}$/, "Please provide a valid 10-digit phone number"],
    },

    /* =====================================================
       🔒 AUTH INFO
    ===================================================== */
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    /* =====================================================
       📍 LOCATION TRACKING (optional)
    ===================================================== */
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
  },
  { timestamps: true }
);

/* =====================================================
   🔐 PASSWORD ENCRYPTION (PRE-SAVE HOOK)
===================================================== */
deliveryBoySchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/* =====================================================
   🔍 PASSWORD VALIDATION METHOD
===================================================== */
deliveryBoySchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/* =====================================================
   🗺️ GEO INDEX (optional)
===================================================== */
deliveryBoySchema.index({ location: "2dsphere" });

export default mongoose.model("DeliveryBoy", deliveryBoySchema);
