import express from "express";
import Customer from "../models/Customer.js";
import bcrypt from "bcrypt";

const router = express.Router();

/* =====================================================
   👤 CUSTOMER AUTH ROUTES
===================================================== */

// ✅ Customer Registration
router.post("/register", async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    // Basic field validation
    if (!name || !phone || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    // Validate name (must start with capital letter)
    if (!/^[A-Z][a-zA-Z\s]*$/.test(name))
      return res.status(400).json({ message: "Name must start with a capital letter" });

    // Validate phone (10 digits, starts with 6–9)
    if (!/^[6-9]\d{9}$/.test(phone))
      return res.status(400).json({ message: "Invalid phone number format" });

    // Accept any valid email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: "Enter a valid email address" });

    // Check existing customer
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer)
      return res.status(400).json({ message: "Customer already exists" });

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    const newCustomer = await Customer.create({
      name,
      phone,
      email,
      password: hashed,
    });

    // Send safe response
    const safeCustomer = {
      _id: newCustomer._id,
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email,
    };

    res.status(201).json(safeCustomer);
  } catch (error) {
    console.error("❌ Registration Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Customer Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const customer = await Customer.findOne({ email });
    if (!customer)
      return res.status(400).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, customer.password);
    if (!match)
      return res.status(400).json({ message: "Invalid email or password" });

    const safeCustomer = {
      _id: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    };

    res.status(200).json(safeCustomer);
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   🧾 CUSTOMER UTILITIES
===================================================== */

// ✅ Get all customers (for admin/testing)
router.get("/all", async (req, res) => {
  try {
    const customers = await Customer.find().select("-password");
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get a single customer by ID
router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).select("-password");
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   🧑‍💼 UPDATE CUSTOMER PROFILE (used in ⚙️ Settings)
===================================================== */
router.put("/profile/:id", async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    const updates = {};

    if (name) {
      if (!/^[A-Z][a-zA-Z\s]*$/.test(name))
        return res.status(400).json({ message: "Name must start with a capital letter" });
      updates.name = name;
    }

    if (phone) {
      if (!/^[6-9]\d{9}$/.test(phone))
        return res.status(400).json({ message: "Invalid phone number format" });
      updates.phone = phone;
    }

    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ message: "Invalid email format" });
      const existing = await Customer.findOne({ email, _id: { $ne: req.params.id } });
      if (existing)
        return res.status(400).json({ message: "Email already in use" });
      updates.email = email;
    }

    if (address !== undefined) updates.address = address;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).select("-password");

    if (!updatedCustomer)
      return res.status(404).json({ message: "Customer not found" });

    res.json({
      success: true,
      message: "Profile updated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("❌ Profile Update Error:", error);
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   🔒 CHANGE PASSWORD (used in ⚙️ Settings)
===================================================== */
router.put("/change-password/:id", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both current and new passwords are required" });

    const customer = await Customer.findById(req.params.id);
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    const match = await bcrypt.compare(currentPassword, customer.password);
    if (!match)
      return res.status(400).json({ message: "Current password is incorrect" });

    if (newPassword.length < 6)
      return res.status(400).json({ message: "New password must be at least 6 characters long" });

    const hashed = await bcrypt.hash(newPassword, 10);
    customer.password = hashed;
    await customer.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("❌ Change Password Error:", error);
    res.status(500).json({ message: error.message });
  }
});

/* =====================================================
   ❌ DELETE CUSTOMER ACCOUNT (optional feature)
===================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Customer not found" });
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("❌ Delete Customer Error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
