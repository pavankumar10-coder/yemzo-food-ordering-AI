import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/Home.css";

function LoginPopup({ onClose }) {
  const [mode, setMode] = useState("customer"); // 'customer' or 'owner'
  const [isSignup, setIsSignup] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // ✅ Validation Rules
  const nameRegex = /^[A-Z][a-zA-Z\s]*$/;
  const phoneRegex = /^[6-9]\d{9}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+$/; // ✅ Any valid email with '@'
  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;

  // ✅ Reset form when switching modes
  useEffect(() => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirm(false);
  }, [isSignup, mode]);

  // ✅ Validate fields
  const validateField = (name, value) => {
    let error = "";
    const val = value.trim();

    switch (name) {
      case "name":
        if (isSignup && !nameRegex.test(val))
          error = "Name must start with a capital letter.";
        break;
      case "phone":
        if (isSignup && !phoneRegex.test(val))
          error = "Phone must start with 6–9 and have 10 digits.";
        break;
      case "email":
        if (!emailRegex.test(val))
          error = "Enter a valid email address (must contain '@').";
        break;
      case "password":
        if (!passwordRegex.test(val))
          error =
            "Password must start with a capital letter, include one special character, and be at least 6 characters long.";
        break;
      case "confirmPassword":
        if (isSignup && val !== formData.password)
          error = "Passwords do not match.";
        break;
      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // ✅ Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };

  // ✅ Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    Object.keys(formData).forEach((key) => validateField(key, formData[key]));

    const hasError = Object.values(errors).some((err) => err);
    if (hasError) {
      alert("⚠️ Please fix validation errors before submitting.");
      return;
    }

    try {
      const baseURL =
        mode === "customer"
          ? "http://localhost:5000/api/customers"
          : "http://localhost:5000/api/owner";
      const endpoint = isSignup ? "register" : "login";

      const payload =
        mode === "owner"
          ? isSignup
            ? {
                hotelName: formData.name.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim(),
                password: formData.password.trim(),
              }
            : {
                email: formData.email.trim(),
                password: formData.password.trim(),
              }
          : isSignup
          ? {
              name: formData.name.trim(),
              phone: formData.phone.trim(),
              email: formData.email.trim(),
              password: formData.password.trim(),
            }
          : {
              email: formData.email.trim(),
              password: formData.password.trim(),
            };

      console.log("🧠 Sending Login/Signup Payload:", payload);

      const res = await axios.post(`${baseURL}/${endpoint}`, payload);

      // ✅ Store user info
      if (mode === "owner") {
        localStorage.setItem("ownerId", res.data._id);
        localStorage.setItem("hotelName", res.data.hotelName);
        localStorage.setItem("ownerEmail", res.data.email);
      } else {
        localStorage.setItem("customerId", res.data._id);
        localStorage.setItem("customerEmail", res.data.email);
      }

      alert(
        `✅ Welcome ${
          mode === "owner"
            ? res.data.hotelName || "Hotel Owner"
            : res.data.name || "Customer"
        }!`
      );

      // Redirect to dashboard
      window.location.href =
        mode === "owner" ? "/owner-dashboard" : "/customer-dashboard";
    } catch (err) {
      console.error("❌ Login/Signup error:", err.response?.data || err.message);
      setErrors({
        api:
          err.response?.data?.message ||
          "Something went wrong. Please try again.",
      });
    }
  };

  // ✅ Close popup on outside click
  const handleOutsideClick = (e) => {
    if (e.target.classList.contains("login-popup")) {
      setFormData({
        name: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <div className="login-popup" onClick={handleOutsideClick}>
      <div className="login-box position-relative">
        <button
          className="btn-close position-absolute top-0 end-0 m-3"
          onClick={onClose}
        ></button>

        <h4 className="text-center mb-3 text-purple fw-bold">
          {isSignup
            ? mode === "customer"
              ? "Customer Signup"
              : "Owner Signup"
            : mode === "customer"
            ? "Customer Login"
            : "Owner Login"}
        </h4>

        {/* Switch Between Customer / Owner */}
        <div className="d-flex justify-content-around mb-3">
          <button
            className={`btn ${
              mode === "customer" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => setMode("customer")}
          >
            Customer
          </button>
          <button
            className={`btn ${
              mode === "owner" ? "btn-success" : "btn-outline-success"
            }`}
            onClick={() => setMode("owner")}
          >
            Owner
          </button>
        </div>

        {/* Signup/Login Form */}
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <div className="mb-2">
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder={
                    mode === "customer"
                      ? "Full Name (Start with Capital)"
                      : "Hotel Name (Start with Capital)"
                  }
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                {errors.name && (
                  <small className="text-danger">{errors.name}</small>
                )}
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  name="phone"
                  className="form-control"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
                {errors.phone && (
                  <small className="text-danger">{errors.phone}</small>
                )}
              </div>
            </>
          )}

          <div className="mb-2">
            <input
              type="text" // ✅ changed from 'email' to 'text' to avoid browser email blocking
              name="email"
              className="form-control"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {errors.email && (
              <small className="text-danger">{errors.email}</small>
            )}
          </div>

          <div className="mb-2 position-relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              className="form-control"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <span
              className="position-absolute top-50 end-0 translate-middle-y pe-3"
              style={{ cursor: "pointer", color: "#7B2CBF" }}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
            {errors.password && (
              <small className="text-danger">{errors.password}</small>
            )}
          </div>

          {isSignup && (
            <div className="mb-2 position-relative">
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                className="form-control"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <span
                className="position-absolute top-50 end-0 translate-middle-y pe-3"
                style={{ cursor: "pointer", color: "#7B2CBF" }}
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? "🙈" : "👁️"}
              </span>
              {errors.confirmPassword && (
                <small className="text-danger">{errors.confirmPassword}</small>
              )}
            </div>
          )}

          {errors.api && (
            <div className="text-center text-danger small mb-2">
              {errors.api}
            </div>
          )}

          <button className="btn btn-primary w-100 mt-3 rounded-pill fw-semibold">
            {isSignup ? "Signup" : "Login"}
          </button>
        </form>

        <p
          className="text-center mt-3 text-purple fw-medium"
          style={{ cursor: "pointer" }}
          onClick={() => {
            setErrors({});
            setIsSignup(!isSignup);
          }}
        >
          {isSignup
            ? "Already have an account? Login"
            : "Don’t have an account? Signup"}
        </p>
      </div>
    </div>
  );
}

export default LoginPopup;
