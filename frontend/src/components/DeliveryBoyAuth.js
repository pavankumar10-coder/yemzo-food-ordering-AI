import React, { useState } from "react";
import axios from "axios";
import "../styles/Home.css";

function DeliveryBoyAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  /* =====================================================
     🧠 VALIDATION LOGIC
  ===================================================== */
  const validateForm = () => {
    const newErrors = {};

    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      newErrors.email = "Enter a valid email address.";

    if (form.password.length < 6)
      newErrors.password = "Password must be at least 6 characters.";

    if (!isLogin) {
      if (!form.name.trim()) newErrors.name = "Name is required.";
      if (!form.phone.match(/^[6-9]\d{9}$/))
        newErrors.phone = "Enter a valid 10-digit mobile number.";
      if (!form.confirmPassword)
        newErrors.confirmPassword = "Please confirm your password.";
      else if (form.password !== form.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* =====================================================
     ✉️ INPUT HANDLER
  ===================================================== */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* =====================================================
     🚀 SUBMIT HANDLER
  ===================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (isLogin) {
        // ✅ LOGIN FLOW
        const res = await axios.post("http://localhost:5000/api/delivery/login", {
          email: form.email,
          password: form.password,
        });
        const deliveryBoy = res.data.deliveryBoy || res.data;

        localStorage.setItem("deliveryBoyId", deliveryBoy._id);
        localStorage.setItem("deliveryBoyName", deliveryBoy.name);

        alert("✅ Login successful!");
        window.location.href = "/delivery-dashboard";
      } else {
        // ✅ SIGNUP FLOW
        const res = await axios.post("http://localhost:5000/api/delivery/register", form);
        const deliveryBoy = res.data.deliveryBoy || res.data;

        localStorage.setItem("deliveryBoyId", deliveryBoy._id);
        localStorage.setItem("deliveryBoyName", deliveryBoy.name);

        alert("✅ Signup successful!");
        window.location.href = "/delivery-dashboard";
      }
    } catch (err) {
      console.error("❌ Authentication error:", err);
      alert(err.response?.data?.message || "❌ Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5 d-flex justify-content-center align-items-center">
      <div
        className="card shadow p-4 border-0"
        style={{ width: "420px", borderRadius: "12px", animation: "fadeIn 0.3s ease" }}
      >
        <h3 className="fw-bold text-center text-purple mb-4">
          🚴 {isLogin ? "Delivery Boy Login" : "Delivery Boy Signup"}
        </h3>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              {/* Name */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Full Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
                {errors.name && <div className="text-danger small">{errors.name}</div>}
              </div>

              {/* Phone */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-control"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter your 10-digit number"
                />
                {errors.phone && <div className="text-danger small">{errors.phone}</div>}
              </div>
            </>
          )}

          {/* Email */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Email Address</label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
            />
            {errors.email && <div className="text-danger small">{errors.email}</div>}
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              name="password"
              className="form-control"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
            />
            {errors.password && <div className="text-danger small">{errors.password}</div>}
          </div>

          {/* Confirm Password */}
          {!isLogin && (
            <div className="mb-3">
              <label className="form-label fw-semibold">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                className="form-control"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <div className="text-danger small">{errors.confirmPassword}</div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-100 rounded-pill fw-semibold mt-2"
            disabled={loading}
          >
            {loading ? "Please wait..." : isLogin ? "Login" : "Signup"}
          </button>
        </form>

        {/* Toggle between login and signup */}
        <div className="text-center mt-3">
          <small>
            {isLogin ? "New to Yemzo?" : "Already have an account?"}{" "}
            <button
              className="btn btn-link p-0 text-purple fw-semibold"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
            >
              {isLogin ? "Create an account" : "Login here"}
            </button>
          </small>
        </div>
      </div>
    </div>
  );
}

export default DeliveryBoyAuth;
