import express from "express";
import Review from "../models/Review.js";
import Dish from "../models/Dish.js";

const router = express.Router();

/* =====================================================
   🟢 Add a New Review (Customer)
===================================================== */
router.post("/add", async (req, res) => {
  try {
    const { customerId, dishId, rating, comment } = req.body;

    if (!customerId || !dishId || !rating) {
      return res.status(400).json({ message: "All required fields missing." });
    }

    // 🔒 Prevent duplicate review per customer per dish
    const existing = await Review.findOne({ customerId, dishId });
    if (existing) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this dish." });
    }

    // 📝 Create new review
    const newReview = await Review.create({ customerId, dishId, rating, comment });

    // ✅ Recalculate average rating for the dish
    const reviews = await Review.find({ dishId });
    const avgRating = reviews.length
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : 0;

    // Update avgRating in Dish model
    await Dish.findByIdAndUpdate(dishId, { avgRating });

    res.status(201).json({
      message: "✅ Review added successfully!",
      review: newReview,
      avgRating,
    });
  } catch (err) {
    console.error("❌ Add review error:", err);
    res.status(500).json({ message: "Failed to add review.", error: err.message });
  }
});

/* =====================================================
   📦 Get All Reviews for a Dish
===================================================== */
router.get("/:dishId", async (req, res) => {
  try {
    const reviews = await Review.find({ dishId: req.params.dishId })
      .populate("customerId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (err) {
    console.error("❌ Fetch reviews error:", err);
    res.status(500).json({ message: "Failed to fetch reviews." });
  }
});

/* =====================================================
   ⭐ Get Average Ratings for All Dishes
===================================================== */
/* =====================================================
   ⭐ Get Average Ratings for All Dishes
===================================================== */
router.get("/averages/all", async (req, res) => {
  try {
    const results = await Review.aggregate([
      {
        $group: {
          _id: "$dishId",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    // 🔁 Populate dish names for easier debugging (optional)
    const populated = await Promise.all(
      results.map(async (r) => {
        const dish = await Dish.findById(r._id).select("name");
        return {
          dishId: r._id,
          dishName: dish ? dish.name : "Unknown Dish",
          avgRating: Number(r.avgRating.toFixed(1)),
          count: r.count,
        };
      })
    );

    res.status(200).json(populated);
  } catch (err) {
    console.error("❌ Average rating fetch error:", err);
    res.status(500).json({ message: "Failed to fetch average ratings." });
  }
});

export default router;
