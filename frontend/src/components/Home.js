import React, { useState, useEffect } from "react";
import axios from "axios";
import LoginPopup from "./LoginPopup";
import "../styles/Home.css";

function Home() {
  const [dishes, setDishes] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showDeliveryAuth, setShowDeliveryAuth] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedHotel, setSelectedHotel] = useState(null);

  // ✅ Fetch hotels and dishes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hotelRes, dishRes] = await Promise.all([
          axios.get("http://localhost:5000/api/owner/all-hotels"),
          axios.get("http://localhost:5000/api/owner/all-dishes"),
        ]);
        setHotels(hotelRes.data);
        setDishes(dishRes.data);
        setFiltered(dishRes.data);
      } catch (err) {
        console.error("❌ Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  // ✅ Search filter
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(
        selectedHotel ? dishes.filter((d) => d.hotelName === selectedHotel) : dishes
      );
      return;
    }

    const lower = search.toLowerCase();
    const filteredList = dishes.filter(
      (d) =>
        d.name.toLowerCase().includes(lower) ||
        d.hotelName?.toLowerCase().includes(lower)
    );
    setFiltered(filteredList);
  }, [search, dishes, selectedHotel]);

  // ✅ Add to cart
  const handleAddToCart = async (dishId) => {
    try {
      const customerId = localStorage.getItem("customerId");
      if (!customerId) {
        setShowLogin(true);
        return;
      }
      await axios.post("http://localhost:5000/api/cart/add", {
        customerId,
        dishId,
        quantity: 1,
      });
      alert("✅ Dish added to your cart!");
    } catch (err) {
      console.error("❌ Error adding to cart:", err);
      alert("❌ Failed to add dish to cart.");
    }
  };

  // ✅ Hotel click
  const handleHotelClick = async (hotelId, hotelName) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/owner/dishes/${hotelId}`);
      const hotelDishes = res.data.map((d) => ({
        ...d,
        hotelName,
        ownerId: hotelId,
      }));
      setSelectedHotel(hotelName);
      setFiltered(hotelDishes);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("❌ Error fetching hotel dishes:", err);
    }
  };

  const handleShowAll = () => {
    setSelectedHotel(null);
    setSearch("");
    setFiltered(dishes);
  };

  const isLoggedIn = Boolean(localStorage.getItem("customerId"));

  return (
    <div className="home-page">
      {/* Navbar */}
      <nav className="navbar shadow-sm">
        <div className="container d-flex justify-content-between align-items-center">
          <h3
            className="fw-bold text-purple mb-0"
            style={{ cursor: "pointer" }}
            onClick={handleShowAll}
          >
            🍴 Yemzo
          </h3>

          <div className="d-flex align-items-center gap-3">
            {isLoggedIn && (
              <button
                className="btn btn-outline-success rounded-pill px-4"
                onClick={() => (window.location.href = "/cart")}
              >
                🛒 View Cart
              </button>
            )}

            {/* 🚴 Delivery Boy Auth Button */}
            <button
              className="btn btn-outline-warning rounded-pill px-4"
              onClick={() => setShowDeliveryAuth(true)}
            >
              🚴 Delivery Boy
            </button>

            {/* Customer Login / Signup */}
            <button
              className="btn btn-outline-primary rounded-pill px-4"
              onClick={() => setShowLogin(true)}
            >
              {isLoggedIn ? "Switch Account" : "Login / Signup"}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero text-center py-5">
        <h1 className="fw-bold text-purple">
          {selectedHotel ? `${selectedHotel} Menu` : "Delicious Food. Fast Delivery."}
        </h1>
        <p className="text-muted mt-2">
          {selectedHotel
            ? `Explore mouth-watering dishes from ${selectedHotel}.`
            : "Order from top-rated hotels near you in seconds!"}
        </p>
        <div className="d-flex justify-content-center mt-4">
          <input
            type="text"
            className="form-control w-50 rounded-pill"
            placeholder="Search for dishes or hotels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      {/* Hotels Section */}
      {!selectedHotel && (
        <div className="container mt-5">
          <h4 className="fw-semibold mb-4 text-purple">🏨 Available Hotels</h4>
          <div className="row">
            {hotels.length > 0 ? (
              hotels.map((hotel) => (
                <div
                  key={hotel._id}
                  className="col-md-3 mb-4"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleHotelClick(hotel._id, hotel.hotelName)}
                >
                  <div className="card shadow-sm border-0 h-100 text-center p-3 hotel-card">
                    <img
                      src={
                        hotel.image ||
                        "https://images.unsplash.com/photo-1600891963937-5a32c707f157?auto=format&fit=crop&w=800&q=60"
                      }
                      alt={hotel.hotelName}
                      className="card-img-top mb-3"
                      style={{
                        height: "160px",
                        objectFit: "cover",
                        borderRadius: "10px",
                      }}
                    />
                    <h5 className="fw-bold text-dark mb-1">{hotel.hotelName}</h5>
                    <p className="text-muted small mb-1">{hotel.email}</p>
                    <p className="text-success small fw-semibold">📞 {hotel.phone}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted">No hotels available right now.</p>
            )}
          </div>
        </div>
      )}

      {/* Dishes Section */}
      <div className="container mt-5">
        <h4 className="fw-semibold mb-4 text-purple">
          {selectedHotel ? `${selectedHotel}'s Dishes` : "🍛 Popular Dishes"}
        </h4>
        <div className="row">
          {filtered.length > 0 ? (
            filtered.map((dish) => (
              <div key={dish._id} className="col-md-4 mb-4">
                <div className="card dish-card shadow-sm border-0">
                  <img
                    src={dish.image || "https://via.placeholder.com/200"}
                    alt={dish.name}
                    className="card-img-top"
                    style={{
                      height: "220px",
                      objectFit: "cover",
                      borderTopLeftRadius: "10px",
                      borderTopRightRadius: "10px",
                    }}
                  />
                  <div className="card-body text-center">
                    <h5 className="fw-bold">{dish.name}</h5>
                    <p
                      className="text-muted mb-1 fw-semibold"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleHotelClick(dish.ownerId, dish.hotelName)}
                    >
                      🏨 {dish.hotelName || "Unknown Hotel"}
                    </p>
                    <p className="fw-bold text-dark mb-1">₹{dish.price}</p>
                    <p className="small text-muted">{dish.about}</p>
                    <button
                      className="btn btn-primary btn-sm w-100 rounded-pill"
                      onClick={() => handleAddToCart(dish._id)}
                    >
                      🛒 Order Now
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted">
              No dishes available yet. Please check back soon!
            </p>
          )}
        </div>
      </div>

      {/* Login Popup */}
      {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}

      {/* Delivery Auth Popup */}
      {showDeliveryAuth && <DeliveryAuthPopup onClose={() => setShowDeliveryAuth(false)} />}
    </div>
  );
}

/* =====================================================
   🚴 Delivery Auth Popup Component
===================================================== */
function DeliveryAuthPopup({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (isLogin) {
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
        const res = await axios.post("http://localhost:5000/api/delivery/register", form);
        const deliveryBoy = res.data.deliveryBoy || res.data;
        localStorage.setItem("deliveryBoyId", deliveryBoy._id);
        localStorage.setItem("deliveryBoyName", deliveryBoy.name);
        alert("✅ Signup successful!");
        window.location.href = "/delivery-dashboard";
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "❌ Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-popup" onClick={onClose}>
      <div className="settings-box" onClick={(e) => e.stopPropagation()}>
        <button className="settings-close" onClick={onClose}>
          ✖
        </button>
        <h4 className="fw-bold text-purple text-center mb-3">
          {isLogin ? "🚴 Delivery Boy Login" : "🚴 Delivery Boy Signup"}
        </h4>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <input
                name="name"
                className="form-control mb-2"
                placeholder="Full Name"
                onChange={handleChange}
                required
              />
              <input
                name="phone"
                className="form-control mb-2"
                placeholder="Phone"
                onChange={handleChange}
                required
              />
            </>
          )}
          <input
            name="email"
            type="email"
            className="form-control mb-2"
            placeholder="Email"
            onChange={handleChange}
            required
          />
          <input
            name="password"
            type="password"
            className="form-control mb-2"
            placeholder="Password"
            onChange={handleChange}
            required
          />
          {!isLogin && (
            <input
              name="confirmPassword"
              type="password"
              className="form-control mb-2"
              placeholder="Confirm Password"
              onChange={handleChange}
              required
            />
          )}
          <button className="btn btn-primary w-100 rounded-pill" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Login" : "Signup"}
          </button>
        </form>
        <p className="text-center mt-3">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <button
            className="btn btn-link p-0"
            onClick={() => setIsLogin((prev) => !prev)}
          >
            {isLogin ? "Create one" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Home;
