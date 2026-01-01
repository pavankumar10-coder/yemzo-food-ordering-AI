import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/Home.css";

function Menu() {
  const { ownerId } = useParams(); // Get hotel ownerId from URL
  const [hotel, setHotel] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ Fetch hotel info and its dishes
  useEffect(() => {
    const fetchHotelMenu = async () => {
      try {
        const hotelRes = await axios.get("http://localhost:5000/api/owner/all");
        const selectedHotel = hotelRes.data.find((h) => h._id === ownerId);
        setHotel(selectedHotel);

        const dishRes = await axios.get(`http://localhost:5000/api/owner/dishes/${ownerId}`);
        setDishes(dishRes.data);
      } catch (err) {
        console.error("❌ Error fetching hotel menu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHotelMenu();
  }, [ownerId]);

  // ✅ Add dish to cart
  const handleAddToCart = async (dishId) => {
    try {
      const customerId = localStorage.getItem("customerId");
      if (!customerId) return alert("Please login first!");

      await axios.post("http://localhost:5000/api/cart/add", {
        customerId,
        dishId,
        quantity: 1,
      });
      alert("✅ Dish added to cart!");
    } catch (err) {
      console.error("❌ Error adding to cart:", err);
      alert("Failed to add dish to cart.");
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3">Loading menu...</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="text-center mt-5 text-danger">
        <h4>Hotel not found!</h4>
        <button className="btn btn-outline-primary mt-3" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      {/* Hotel Header */}
      <div className="text-center mb-5">
        <h2 className="fw-bold text-purple">🏨 {hotel.hotelName}</h2>
        <p className="text-muted mb-1">📧 {hotel.email}</p>
        <p className="text-muted">📞 {hotel.phone}</p>
        <button
          className="btn btn-outline-secondary rounded-pill mt-3"
          onClick={() => navigate("/")}
        >
          ← Back to All Hotels
        </button>
      </div>

      {/* Dishes Section */}
      <h4 className="fw-semibold mb-4 text-purple text-center">
        🍽️ {hotel.hotelName}'s Menu
      </h4>

      <div className="row">
        {dishes.length > 0 ? (
          dishes.map((dish) => (
            <div key={dish._id} className="col-md-4 mb-4">
              <div className="card dish-card shadow-sm border-0">
                <img
                  src={dish.image || "https://via.placeholder.com/200"}
                  alt={dish.name}
                  className="card-img-top dish-img"
                  style={{
                    height: "220px",
                    objectFit: "cover",
                    borderTopLeftRadius: "10px",
                    borderTopRightRadius: "10px",
                  }}
                />
                <div className="card-body text-center">
                  <h5 className="fw-bold">{dish.name}</h5>
                  <p className="text-dark fw-bold mb-1">₹{dish.price}</p>
                  <p className="small text-muted">{dish.about}</p>
                  <button
                    className="btn btn-primary btn-sm w-100 rounded-pill"
                    onClick={() => handleAddToCart(dish._id)}
                  >
                    🛒 Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-muted fs-5">
            No dishes available for this hotel.
          </p>
        )}
      </div>
    </div>
  );
}

export default Menu;
