import * as dotenv from "dotenv";
import connectDB from "./config/db.js";
import Food from "./models/Food.js";
import Owner from "./models/Owner.js";
import Dish from "./models/Dish.js";

dotenv.config({ path: "./.env" });

/* =====================================================
   🌱 SEED CLEANUP FUNCTION
===================================================== */
const seed = async () => {
  try {
    console.log("🚀 Connecting to MongoDB...");
    await connectDB();

    // Choose what you want to clear
    const CLEAR_FOOD = true;
    const CLEAR_OWNER = true;
    const CLEAR_DISH = true;

    console.log("🧹 Cleaning database collections...");
    if (CLEAR_FOOD) await Food.deleteMany();
    if (CLEAR_OWNER) await Owner.deleteMany();
    if (CLEAR_DISH) await Dish.deleteMany();

    console.log("✅ Database cleanup complete.");
    console.log("➡️ You can now run: npm run dev");
    process.exit(0);
  } catch (err) {
    console.error("❌ Cleanup Error:", err);
    process.exit(1);
  }
};

seed();
