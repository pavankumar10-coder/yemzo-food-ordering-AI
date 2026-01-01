import mongoose from "mongoose";
import Owner from "./models/Owner.js";
import Dish from "./models/Dish.js";
import dotenv from "dotenv";

dotenv.config();

const cleanupOrphanDishes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const ownerIds = await Owner.find().distinct("_id");
    const result = await Dish.deleteMany({ ownerId: { $nin: ownerIds } });
    console.log(`🧹 Deleted ${result.deletedCount} orphan dishes.`);
    process.exit();
  } catch (error) {
    console.error("❌ Error cleaning up dishes:", error);
    process.exit(1);
  }
};

cleanupOrphanDishes();
