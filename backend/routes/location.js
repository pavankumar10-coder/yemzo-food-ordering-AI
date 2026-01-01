import express from "express";
import axios from "axios";
import Customer from "../models/Customer.js";

const router = express.Router();

/* =====================================================
   📍 SAVE LOCATION + REVERSE GEOCODE
===================================================== */
router.post("/save", async (req, res) => {
  try {
    const { customerId, latitude, longitude } = req.body;
    if (!customerId || !latitude || !longitude) {
      return res.status(400).json({ message: "Missing required data" });
    }

    // 🔁 Reverse geocode using OpenStreetMap (free API)
    const geoRes = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
    );

    const address = geoRes.data.display_name || "Unknown location";

    // 💾 Update customer record (include coordinates)
    const updated = await Customer.findByIdAndUpdate(
      customerId,
      {
        address,
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
      { new: true }
    );

    res.json({
      message: "✅ Location saved successfully!",
      address: updated.address,
      coordinates: { lat: latitude, lon: longitude },
    });
  } catch (err) {
    console.error("❌ Location error:", err.message);
    res.status(500).json({ message: "Failed to save location" });
  }
});

export default router;
