import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Home.css";
import CustomerSettings from "./CustomerSettings"; // 👈 Import your new component

function CustomerDashboard() {
  const [dishes, setDishes] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [profileUpdated, setProfileUpdated] = useState(false);
  const customerId = localStorage.getItem("customerId");

  // ✅ Fetch hotels & dishes
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
  }, [profileUpdated]);

  // ✅ Search filter
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(selectedHotel ? dishes.filter((d) => d.hotelName === selectedHotel) : dishes);
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

  // ✅ Add to Cart
  const handleAddToCart = async (dishId) => {
    try {
      if (!customerId) return alert("Please login first!");
      await axios.post("http://localhost:5000/api/cart/add", {
        customerId,
        dishId,
        quantity: 1,
      });
      alert("✅ Dish added to cart!");
    } catch (err) {
      console.error("❌ Error adding to cart:", err);
      alert("❌ Failed to add dish to cart.");
    }
  };

  // ✅ Fetch hotel dishes
  const handleHotelClick = async (ownerId, hotelName) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/owner/dishes/${ownerId}`);
      const hotelDishes = res.data.map((d) => ({
        ...d,
        hotelName,
        ownerId,
      }));
      setSelectedHotel(hotelName);
      setFiltered(hotelDishes);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("❌ Error fetching hotel dishes:", err);
    }
  };

  // ✅ Reset to all hotels
  const handleShowAll = () => {
    setSelectedHotel(null);
    setFiltered(dishes);
    setSearch("");
  };

  // ✅ Logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("customerId");
      window.location.href = "/";
    }
  };

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
            <button
              className="btn btn-outline-primary rounded-pill px-4"
              onClick={() => (window.location.href = "/cart")}
            >
              🛒 View Cart
            </button>

            {/* ⚙️ Settings Icon */}
            <button
              className="btn btn-outline-secondary rounded-circle"
              title="Account Settings"
              onClick={() => setShowSettings(true)}
            >
              ⚙️
            </button>

            <button
              className="btn btn-outline-danger rounded-pill px-4"
              onClick={handleLogout}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero text-center py-5">
        <h1 className="fw-bold text-purple">
          {selectedHotel ? `${selectedHotel} Menu` : "Welcome to Yemzo! 🍽️"}
        </h1>
        <p className="text-muted mt-2">
          {selectedHotel
            ? `Explore delicious dishes from ${selectedHotel}.`
            : "Select a hotel to explore its menu and order your favorites!"}
        </p>
        <div className="d-flex justify-content-center mt-4">
          <input
            type="text"
            className="form-control w-50 rounded-pill"
            placeholder="Search hotels or dishes..."
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
              <p className="text-center text-muted">No hotels found.</p>
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
            filtered.map((d) => (
              <div key={d._id} className="col-md-4 mb-4">
                <div className="card dish-card shadow-sm border-0">
                  <img
                    src={d.image || "https://via.placeholder.com/200"}
                    alt={d.name}
                    className="card-img-top"
                    style={{
                      height: "220px",
                      objectFit: "cover",
                      borderTopLeftRadius: "10px",
                      borderTopRightRadius: "10px",
                    }}
                  />
                  <div className="card-body text-center">
                    <h5 className="fw-bold">{d.name}</h5>
                    <p
                      className="text-muted mb-1 fw-semibold"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleHotelClick(d.ownerId, d.hotelName)}
                    >
                      🏨 {d.hotelName || "Unknown Hotel"}
                    </p>
                    <p className="fw-bold text-dark mb-1">₹{d.price}</p>
                    <p className="small text-muted">{d.about}</p>
                    <button
                      className="btn btn-primary btn-sm w-100 rounded-pill"
                      onClick={() => handleAddToCart(d._id)}
                    >
                      🛒 Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted">No dishes available.</p>
          )}
        </div>
      </div>

      {/* ⚙️ Settings Modal */}
      {showSettings && (
        <CustomerSettings
          customerId={customerId}
          onClose={() => setShowSettings(false)}
          onProfileUpdated={() => setProfileUpdated(!profileUpdated)}
        />
      )}
    </div>
  );
}

export default CustomerDashboard;
