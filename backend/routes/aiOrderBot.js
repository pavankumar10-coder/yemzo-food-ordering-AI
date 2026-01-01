// backend/routes/aiOrderBot.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import Dish from "../models/Dish.js";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import Customer from "../models/Customer.js";

dotenv.config();
const router = express.Router();

/* =====================================================
   🧠 Helper: OpenAI Parser + Improved Local Fallback
   - stronger intent detection
   - supports "under|below|less than", "above|greater than", quantity extraction
   - hotel name extraction after 'from' or 'at' (improved)
===================================================== */
async function parseUserInstruction(message) {
  const systemPrompt = `You are an assistant that extracts structured constraints from a user's food-ordering instruction.
Return a JSON object only with these keys: dishName (string or empty), maxPrice (number or null), minRating (number or null),
hotelName (string or empty), quantity (integer, default 1), intent (one of "order", "search", "info").
Example input and outputs:
Input: "Order me a biryani with rating above 4.5 under ₹180" => {"dishName":"biryani","maxPrice":180,"minRating":4.5,"hotelName":"","quantity":1,"intent":"order"}
Input: "Get me the highest-rated pizza below 200 from Royal Treat hotel" => {"dishName":"pizza","maxPrice":200,"minRating":null,"hotelName":"Royal Treat","quantity":1,"intent":"order"}`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `User: "${message}"\n\nReturn the JSON only.` },
    ],
    temperature: 0,
    max_tokens: 400,
  };

  try {
    const res = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    });

    const text = res.data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty OpenAI response");

    const cleaned = text.replace(/^```json\s*|```$/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    // Local improved fallback parser
    console.warn("⚠️ OpenAI parse failed, using local fallback. Err:", err.message || err);

    const lower = message.toLowerCase();

    // Intent detection (order vs search/info)
    const orderWords = ["order", "buy", "i want", "get me", "place order", "please order", "deliver"];
    let intent = "search";
    for (const w of orderWords) {
      if (lower.includes(w)) {
        intent = "order";
        break;
      }
    }

    // Dish name: pick common tokens or words before price/hotel words
    // naive extraction: look for common dish words first, otherwise try a name chunk
    let dishName = "";
    const knownDishes = ["biryani", "pizza", "burger", "fried rice", "pasta", "sandwich", "noodles", "sushi"];
    for (const d of knownDishes) {
      if (lower.includes(d)) {
        dishName = d;
        break;
      }
    }
    // If none, attempt to grab word before 'from' or 'under' or 'below' or 'with rating'
    if (!dishName) {
      const beforeKeywords = lower.split(/from|under|below|with|rating|for|at/)[0];
      const tokens = beforeKeywords.trim().split(/\s+/);
      if (tokens.length > 0) {
        // take last token which might be dish
        const candidate = tokens.slice(-2).join(" ").trim();
        if (candidate.length && candidate.length <= 40) dishName = candidate;
      }
    }

    // price parsing: 'under 200', 'below 200', 'less than 200', '₹180'
    let maxPrice = null;
    const priceMatch = lower.match(/(?:under|below|less than|<|under\s?₹?)\s*₹?\s*([0-9]+(?:\.[0-9]+)?)/) ||
                       lower.match(/₹\s*([0-9]+(?:\.[0-9]+)?)/);
    if (priceMatch) {
      maxPrice = Math.floor(parseFloat(priceMatch[1]));
    }

    // rating parsing: 'above 4.5', 'rating > 4', 'at least 4'
    let minRating = null;
    const ratingMatch = lower.match(/(?:above|greater than|>=|>|at least|minimum)\s*([0-5](?:\.\d)?)/);
    if (ratingMatch) minRating = parseFloat(ratingMatch[1]);

    // hotel extraction: 'from Royal Treat', 'at Royal Treat Hotel'
    let hotelName = "";
    const hotelMatch = lower.match(/(?:from|at)\s+([A-Za-z0-9&\-\s']{2,60})(?:\s+hotel|\s+restaurant|$)/);
    if (hotelMatch) hotelName = hotelMatch[1].trim();

    // quantity: "2 biryani", "two pizzas"
    let quantity = 1;
    const qtyMatch = lower.match(/(\d+)\s*(?:x|pcs|pieces|plates|qty|quantity)?\s*(?:of)?\s*(?:[A-Za-z]+)/);
    if (qtyMatch) quantity = Math.max(1, parseInt(qtyMatch[1], 10));
    else {
      // words to numbers (one,two,three)
      const wordNums = { one: 1, two: 2, three: 3, four: 4, five: 5 };
      for (const w in wordNums) {
        if (lower.includes(`${w} `) && lower.match(new RegExp(`\\b${w}\\b\\s+${dishName}`))) {
          quantity = wordNums[w];
          break;
        }
      }
    }

    // if user uses "get me the highest-rated pizza below 200" but didn't say 'order', still interpret as order if phrasing is imperative
    // e.g., "get me", "book", "fetch". We already included 'get me' in orderWords.

    const parsed = {
      dishName: dishName || "",
      maxPrice: maxPrice ?? null,
      minRating: minRating ?? null,
      hotelName: hotelName || "",
      quantity: quantity || 1,
      intent: intent || "order",
    };

    console.log("🧩 [Fallback Parsed]:", parsed);
    return parsed;
  }
}

/* =====================================================
   🚀 AI ORDER BOT ENDPOINT
   - Accepts optional req.body.address override (so frontend can send address inline)
   - Returns structured flags: needAddress (bool) when address missing
   - Emits "order-created" to customer room with same payload
===================================================== */
router.post("/order-bot", async (req, res) => {
  try {
    const { message, customerId, address: overrideAddress } = req.body;

    if (!message) return res.status(400).json({ error: "No message provided" });
    if (!customerId) return res.status(400).json({ error: "CustomerId required (login)" });

    console.log("💬 [AI-BOT] Message:", message);
    console.log("👤 [AI-BOT] CustomerId:", customerId);

    // 1️⃣ parse
    const parsed = await parseUserInstruction(message);
    if (!parsed) {
      return res.json({ reply: "Sorry — I couldn't understand that. Try: 'Order me a biryani under 180'." });
    }

    const { dishName, maxPrice, minRating, hotelName, quantity = 1, intent = "order" } = parsed;
    console.log("🧠 Parsed:", parsed);

    // If not an ordering intent, behave as search
    if (intent !== "order") {
      const query = {};
      if (dishName) query.name = { $regex: dishName, $options: "i" };
      if (hotelName) query.hotelName = hotelName;

      let dishes = await Dish.find(query).limit(30).lean();
      const ids = dishes.map((d) => d._id);
      const ratings = await Review.aggregate([
        { $match: { dishId: { $in: ids } } },
        { $group: { _id: "$dishId", avg: { $avg: "$rating" } } },
      ]);
      const ratingMap = {};
      ratings.forEach((r) => (ratingMap[r._id.toString()] = Number(r.avg.toFixed(2))));
      dishes = dishes.map((d) => ({ ...d, avgRating: ratingMap[d._id.toString()] || 0 }));

      return res.json({
        reply: `Found ${dishes.length} dishes matching your query.`,
        results: dishes,
      });
    }

    // 2️⃣ Query DB for candidate dishes
    const dbQuery = {};
    if (dishName) dbQuery.name = { $regex: dishName, $options: "i" };
    if (hotelName) {
      // try case-insensitive match for hotelName by joining to Owner. But Dish model stores ownerId only.
      // We'll match ownerName by fetching all owners with name and then filter dishes below if necessary.
      // For simplicity: assume dish.hotelName present in dish (some endpoints populate it). If not, this is best-effort.
      dbQuery.hotelName = hotelName;
    }
    if (maxPrice) dbQuery.price = { $lte: maxPrice };

    let candidates = await Dish.find(dbQuery).lean();
    if (!candidates || candidates.length === 0) {
      // fallback: search without hotelName constraint or fuzzy match
      if (dbQuery.hotelName) {
        delete dbQuery.hotelName;
        candidates = await Dish.find(dbQuery).lean();
      }
    }

    if (!candidates || candidates.length === 0) {
      console.log("⚠️ No dishes found for:", dbQuery);
      return res.json({ reply: "I couldn't find any dishes matching that description." });
    }

    // 3️⃣ compute avg ratings
    const dishIds = candidates.map((d) => d._id);
    const agg = await Review.aggregate([
      { $match: { dishId: { $in: dishIds } } },
      { $group: { _id: "$dishId", avgRating: { $avg: "$rating" } } },
    ]);
    const avgMap = {};
    agg.forEach((a) => (avgMap[a._id.toString()] = Number(a.avgRating.toFixed(2))));
    const enriched = candidates.map((c) => ({ ...c, avgRating: avgMap[c._id.toString()] ?? 0 }));

    let filtered = enriched;
    if (minRating) filtered = filtered.filter((d) => (d.avgRating || 0) >= Number(minRating));

    if (!filtered.length) {
      return res.json({ reply: "No dishes meet your rating/price filters." });
    }

    // sort by rating desc then price asc
    filtered.sort((a, b) => {
      const rDiff = (b.avgRating || 0) - (a.avgRating || 0);
      if (Math.abs(rDiff) > 1e-6) return rDiff;
      return (a.price || 0) - (b.price || 0);
    });

    const chosen = filtered[0];
    console.log("✅ Chosen:", chosen);

    // 4️⃣ get delivery address (order may include overrideAddress)
    let deliveryAddress = overrideAddress && overrideAddress.trim() ? overrideAddress.trim() : "";
    const customer = await Customer.findById(customerId).lean();
    if (!deliveryAddress && customer?.address) deliveryAddress = customer.address;

    // If still no address: instruct frontend to ask user for address and return structured response
    if (!deliveryAddress) {
      return res.json({
        reply: "I don't have a delivery address for you. Please provide your delivery address so I can place the order.",
        needAddress: true, // frontend can use this flag to prompt user
        parsed,
        foundDish: chosen,
      });
    }

    // 5️⃣ Create order payload and persist
    const orderPayload = {
      customerId,
      ownerId: chosen.ownerId || chosen.owner || null,
      items: [
        {
          dishId: chosen._id,
          name: chosen.name,
          price: chosen.price,
          quantity: Number(quantity || 1),
        },
      ],
      totalAmount: (chosen.price || 0) * Number(quantity || 1),
      address: deliveryAddress,
      payment: "COD",
      status: "Pending",
      deliveryStatus: "Unassigned",
    };

    const createdOrder = await Order.create(orderPayload);
    console.log("✅ Order created:", createdOrder._id.toString());

    // 6️⃣ Emit socket event to customer room (and owner pool)
    try {
      const io = req.app.get("io");
      if (io) {
        const room = `customer_${customerId}`;
        io.to(room).emit("order-created", {
          success: true,
          message: `Order placed for ${chosen.name} — ₹${orderPayload.totalAmount}.`,
          order: createdOrder,
        });

        // also notify owners / delivery pool (optional)
        if (orderPayload.ownerId) {
          io.to(`owner_${orderPayload.ownerId}`).emit("new-order", createdOrder);
        }
        io.to("delivery_pool").emit("available-order", {
          orderId: createdOrder._id,
          hotel: orderPayload.ownerId,
          totalAmount: createdOrder.totalAmount,
          items: createdOrder.items.map((i) => ({ name: i.name, quantity: i.quantity })),
        });
      }
    } catch (e) {
      console.warn("⚠️ Socket emit failed:", e.message || e);
    }

    // 7️⃣ Respond
    return res.json({
      reply: `✅ Ordered ${chosen.name} from ${chosen.hotelName || "the selected restaurant"} for ₹${orderPayload.totalAmount}. Order ID: ${createdOrder._id.toString().slice(-6)}.`,
      order: createdOrder,
      foundDish: chosen,
    });
  } catch (err) {
    console.error("💥 AI Order Bot error:", err.response?.data || err.message || err);
    return res.status(500).json({ reply: "Sorry, I couldn't complete that. Try again later." });
  }
});

export default router;
