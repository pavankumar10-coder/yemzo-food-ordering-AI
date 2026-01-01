import express from "express";
import Owner from "../models/Owner.js";
import Dish from "../models/Dish.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

const router = express.Router();

/* =====================================================
   🏨 OWNER AUTH ROUTES
===================================================== */

// Helper: generate friendly owner codes (like OWN-AB12CD)
function generateOwnerCode() {
  return "OWN-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

// ✅ Register new owner
router.post("/register", async (req, res) => {
  try {
    const { hotelName, phone, email, password, ownerCode: providedCode } = req.body;

    if (!hotelName || !phone || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    // Check for duplicates
    const existingEmail = await Owner.findOne({ email });
    if (existingEmail)
      return res.status(400).json({ message: "Owner with this email already exists" });

    const existingPhone = await Owner.findOne({ phone });
    if (existingPhone)
      return res.status(400).json({ message: "Owner with this phone already exists" });

    // Decide the ownerCode
    let ownerCode = providedCode?.trim() || generateOwnerCode();
    while (await Owner.findOne({ ownerCode })) {
      ownerCode = generateOwnerCode();
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Save owner
    const newOwner = await Owner.create({
      hotelName,
      phone,
      email,
      password: hashed,
      ownerCode,
    });

    const safe = {
      _id: newOwner._id,
      hotelName: newOwner.hotelName,
      phone: newOwner.phone,
      email: newOwner.email,
      ownerCode: newOwner.ownerCode,
    };

    console.log("✅ New Owner Registered:", safe);
    res.status(201).json(safe);
  } catch (error) {
    console.error("❌ Owner registration error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Login owner (email OR ownerCode + password)
router.post("/login", async (req, res) => {
  try {
    const { email, ownerCode, password } = req.body;

    if ((!email && !ownerCode) || !password)
      return res.status(400).json({ message: "Email/OwnerCode and password are required" });

    // Find by either email or ownerCode
    const owner = await Owner.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(ownerCode ? [{ ownerCode }] : []),
      ],
    });

    if (!owner)
      return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, owner.password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials" });

    const safe = {
      _id: owner._id,
      hotelName: owner.hotelName,
      phone: owner.phone,
      email: owner.email,
      ownerCode: owner.ownerCode,
    };

    console.log("✅ Owner Login Success:", safe);
    res.json(safe);
  } catch (error) {
    console.error("❌ Owner login error:", error);
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   🍛 DISH MANAGEMENT
===================================================== */

// ✅ Add new dish
router.post("/add-dish", async (req, res) => {
  try {
    const { ownerId, name, price, image, about } = req.body;

    if (!ownerId || !name || !price)
      return res.status(400).json({ message: "Missing required fields" });

    const owner = await Owner.findById(ownerId);
    if (!owner)
      return res.status(404).json({ message: "Owner not found. Please re-login." });

    const newDish = await Dish.create({
      ownerId,
      name,
      price,
      image,
      about,
    });

    const populated = await newDish.populate("ownerId", "hotelName");

    res.status(201).json({
      _id: populated._id,
      name: populated.name,
      price: populated.price,
      image: populated.image,
      about: populated.about,
      hotelName: populated.ownerId?.hotelName,
    });
  } catch (error) {
    console.error("❌ Error adding dish:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Update dish
router.put("/dish/:id", async (req, res) => {
  try {
    const updates = req.body;
    const updated = await Dish.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Dish not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Delete dish
router.delete("/dish/:id", async (req, res) => {
  try {
    await Dish.findByIdAndDelete(req.params.id);
    res.json({ message: "Dish deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get all dishes for a specific owner
router.get("/dishes/:ownerId", async (req, res) => {
  try {
    const dishes = await Dish.find({ ownerId: req.params.ownerId });
    res.json(dishes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   🧹 OWNER DELETION & CLEANUP
===================================================== */

// ✅ Delete owner and all their dishes
router.delete("/owner/:id", async (req, res) => {
  try {
    await Dish.deleteMany({ ownerId: req.params.id });
    await Owner.findByIdAndDelete(req.params.id);
    res.json({ message: "Owner account and all dishes deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Cleanup orphan dishes (for admins)
router.delete("/cleanup-orphan-dishes", async (req, res) => {
  try {
    const validOwnerIds = await Owner.distinct("_id");
    const result = await Dish.deleteMany({ ownerId: { $nin: validOwnerIds } });
    res.json({
      message: `🧹 Cleanup complete! Deleted ${result.deletedCount} orphan dishes.`,
    });
  } catch (error) {
    res.status(500).json({ message: "Cleanup failed", error: error.message });
  }
});

/* =====================================================
   📊 PUBLIC ROUTES (for home & customer dashboard)
===================================================== */

// ✅ Get all owners (no passwords)
router.get("/all-hotels", async (req, res) => {
  try {
    const owners = await Owner.find().select("hotelName email phone ownerCode createdAt");
    res.json(owners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get all dishes (with hotel name)
router.get("/all-dishes", async (req, res) => {
  try {
    const dishes = await Dish.find().populate("ownerId", "hotelName");
    res.json(
      dishes.map((dish) => ({
        _id: dish._id,
        ownerId: dish.ownerId?._id,
        hotelName: dish.ownerId?.hotelName || "Unknown Hotel",
        name: dish.name,
        price: dish.price,
        image: dish.image,
        about: dish.about,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get dishes by hotel name
router.get("/hotel/:hotelName", async (req, res) => {
  try {
    const owner = await Owner.findOne({
      hotelName: { $regex: new RegExp(req.params.hotelName, "i") },
    });

    if (!owner)
      return res.status(404).json({ message: "Hotel not found" });

    const dishes = await Dish.find({ ownerId: owner._id });
    res.json({ hotelName: owner.hotelName, dishes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Search by hotel or dish name
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q || "";
    if (!query) return res.json([]);

    const owners = await Owner.find({
      hotelName: { $regex: query, $options: "i" },
    });

    const dishes = await Dish.find({
      name: { $regex: query, $options: "i" },
    }).populate("ownerId", "hotelName");

    const combined = [
      ...owners.map((o) => ({
        type: "hotel",
        name: o.hotelName,
        id: o._id,
      })),
      ...dishes.map((d) => ({
        type: "dish",
        name: d.name,
        price: d.price,
        image: d.image,
        hotelName: d.ownerId?.hotelName || "Unknown",
        id: d._id,
      })),
    ];

    res.json(combined);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
