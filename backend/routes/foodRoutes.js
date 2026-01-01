import express from "express";
import Food from "../models/Food.js";

const router = express.Router();

/* =====================================================
   🍴 GLOBAL FOOD ROUTES
===================================================== */

// ✅ Get all foods
router.get("/", async (req, res) => {
  try {
    const foods = await Food.find();
    res.json(foods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Search foods by name (optional)
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q || "";
    const foods = await Food.find({
      name: { $regex: query, $options: "i" },
    });
    res.json(foods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get single food by ID
router.get("/:id", async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ message: "Food not found" });
    res.json(food);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
