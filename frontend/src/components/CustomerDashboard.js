// src/pages/CustomerDashboard.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "../styles/Home.css";
import YemzoChatbot from "../components/YemzoChatbot";

function CustomerDashboard() {
  const [dishes, setDishes] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showMyOrders, setShowMyOrders] = useState(false); // 🧾 My Orders toggle
  const [orders, setOrders] = useState([]); // 🧾 Track customer orders
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("COD");
  const [socket, setSocket] = useState(null);
  const [location, setLocation] = useState(""); // 📍 user's saved location

  // NEW: selected order for the "Track Order" modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ⭐ Added: Dish Ratings (map dishId => avgRatingNumber)
  const [dishRatings, setDishRatings] = useState({});

  const customerId = localStorage.getItem("customerId");

  /* =====================================================
    🌐 FETCH HOTELS + DISHES
  ===================================================== */
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
        // fetch ratings after we have dish list
        fetchDishRatings();
      } catch (err) {
        console.error("❌ Error fetching data:", err);
      }
    };
    fetchData();
  }, []);
  // =====================================================
  // ⭐ Fetch Ratings for All Dishes
  // - expects backend route: GET /api/reviews/averages/all
  // - backend returns array [{ _id: dishId, avgRating: Number, count: Number }, ...]
  // =====================================================
  const fetchDishRatings = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/reviews/averages/all");
      const ratingsMap = {};
      res.data.forEach((r) => {
        // adapt to your backend key (dishId or _id)
        ratingsMap[r.dishId ?? r._id] = r.avgRating ?? r.avg;
      });
      setDishRatings(ratingsMap);
      console.log("✅ Ratings map:", ratingsMap); // Debug log
    } catch (err) {
      console.error("❌ Error fetching dish ratings:", err);
    }
  };

  // =====================================================
  // 📍 SAVE LOCATION
  // =====================================================
  const handleSaveLocation = async () => {
    if (!navigator.geolocation) {
      return alert("Geolocation is not supported by your browser.");
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await axios.post("http://localhost:5000/api/location/save", {
            customerId,
            latitude,
            longitude,
          });
          setLocation(res.data.address);
          alert("✅ Location saved: " + res.data.address);
        } catch (err) {
          console.error("❌ Failed to save location:", err);
          alert("Failed to save location.");
        }
      },
      (err) => {
        console.error(err);
        alert("Could not access location. Please enable GPS.");
      }
    );
  };

  /* =====================================================
    ⚡ SOCKET.IO REAL-TIME SETUP
    - join customer room so only relevant updates are received
    - listen for AI order creation + live status updates
  ===================================================== */
  useEffect(() => {
    if (!customerId) return;

    const s = io("http://localhost:5000");
    setSocket(s);

    s.on("connect", () => {
      console.log("🟢 Socket connected (customer)", s.id);

      // join both specific and generic room events
      s.emit("join-customer", customerId);
      s.emit("join-room", `customer_${customerId}`);
    });

    // ✅ NEW: listen for AI auto order events
    s.on("order-created", (data) => {
      console.log("🤖 [AI BOT] Auto order event received:", data);

      // Add new order instantly to list
      setOrders((prev) => [data.order, ...prev]);

      // Notify user visually
      alert(data.message || "✅ AI Agent placed a new order for you!");
    });

    // existing listener for updates (status changes)
    s.on("order-updated", (updatedOrder) => {
      const updatedCustomerId =
        typeof updatedOrder.customerId === "object"
          ? updatedOrder.customerId._id
          : updatedOrder.customerId;

      if (updatedCustomerId === customerId) {
        setOrders((prev) =>
          prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
        );
        setSelectedOrder((prev) =>
          prev && prev._id === updatedOrder._id ? updatedOrder : prev
        );
      }
    });

    s.on("disconnect", () => {
      console.log("🔴 Socket disconnected (customer)");
    });

    return () => {
      s.emit("leave-room", `customer_${customerId}`);
      s.disconnect();
    };
  }, [customerId]);

  /* =====================================================
    📦 FETCH CUSTOMER ORDERS
  ===================================================== */
  const fetchMyOrders = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/orders/customer/${customerId}`);
      setOrders(res.data);
      setShowMyOrders(true);
    } catch (err) {
      console.error("❌ Error fetching orders:", err);
      alert("❌ Failed to fetch your orders.");
    }
  };

  /* =====================================================
    SEARCH & FILTER
  ===================================================== */
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(selectedHotel ? dishes.filter((d) => d.hotelName === selectedHotel) : dishes);
      return;
    }

    const lower = search.toLowerCase();
    const filteredList = dishes.filter(
      (d) => d.name.toLowerCase().includes(lower) || d.hotelName?.toLowerCase().includes(lower)
    );
    setFiltered(filteredList);
  }, [search, dishes, selectedHotel]);

  /* =====================================================
    ADD TO CART
  ===================================================== */
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

  /* =====================================================
    VIEW HOTEL DISHES
  ===================================================== */
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

  const handleShowAll = () => {
    setSelectedHotel(null);
    setFiltered(dishes);
    setSearch("");
  };

  /* =====================================================
    LOGOUT
  ===================================================== */
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("customerId");
      window.location.href = "/";
    }
  };

  /* =====================================================
    PLACE ORDER
  ===================================================== */
  const handlePlaceOrder = async () => {
    try {
      if (!customerId) return alert("Please login first!");

      const cartRes = await axios.get(`http://localhost:5000/api/cart/${customerId}`);
      const cartData = cartRes.data;
      const cartItems = cartData.items;

      if (!cartItems || cartItems.length === 0) return alert("Your cart is empty!");

      const ownerId = cartItems[0].ownerId;
      const totalAmount = cartData.total;

      const orderPayload = {
        customerId,
        ownerId,
        items: cartItems.map((item) => ({
          dishId: item.dishId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        totalAmount,
        address,
        payment,
      };

      const orderRes = await axios.post("http://localhost:5000/api/orders/create", orderPayload);
      await axios.delete(`http://localhost:5000/api/cart/clear/${customerId}`);

      alert(orderRes.data.message || "✅ Order placed successfully!");
      setShowOrderModal(false);
      setAddress("");
      setPayment("COD");
    } catch (err) {
      console.error("❌ Error placing order:", err.response?.data || err.message);
      alert(err.response?.data?.message || "❌ Failed to place order.");
    }
  };

  /* =====================================================
    HELPERS for Track Modal
    - compute timeline steps and simple ETA suggestion
  ===================================================== */
  const getTimelineStepIndex = (status) => {
    // map your status strings to timeline index
    // 0: Pending, 1: Preparing, 2: Dish Picked / OutForDelivery, 3: Delivered
    if (!status) return 0;
    if (status === "Pending") return 0;
    if (status === "Preparing") return 1;
    if (status === "Dish Picked by Delivery Boy" || status === "OutForDelivery" || status === "PickedUp")
      return 2;
    if (status === "Delivered") return 3;
    // fallback
    return 0;
  };

  const estimateETAText = (order) => {
    // Basic heuristic ETA — you can improve later from backend data
    const idx = getTimelineStepIndex(order?.status);
    switch (idx) {
      case 0:
        return "Estimated: 30–40 mins";
      case 1:
        return "Estimated: 20–30 mins";
      case 2:
        return "Estimated: 10–20 mins";
      case 3:
        return "Delivered";
      default:
        return "";
    }
  };

  /* =====================================================
    UI: open Track Modal for an order
  ===================================================== */
  const openTrackModal = (order) => {
    setSelectedOrder(order);
    // ensure latest details are fetched from server for this order
    // (optional but ensures deliveryBoyId is populated)
    axios
      .get(`http://localhost:5000/api/orders/all`)
      .then((res) => {
        // find updated order by id
        const updated = res.data.find((o) => o._id === order._1d || o._id === order._id);
        if (updated) {
          setSelectedOrder(updated);
        }
      })
      .catch(() => {});
  };

  /* =====================================================
    Close modal helper
  ===================================================== */
  const closeTrackModal = () => {
    setSelectedOrder(null);
  };

  /* =====================================================
    --- REVIEW SYSTEM (added) ---
    Minimal: show Rate button only for Delivered orders, modal to submit rating+comment
  ===================================================== */
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const openReviewForOrder = (order) => {
    setReviewOrder(order);
    setRating(0);
    setComment("");
    // If you want, fetch latest order/dish info here
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!rating) return alert("Please select a rating (1-5).");

    try {
      // choose a dish to attach review to — using first item of order for simplicity
      const dishId = reviewOrder.items && reviewOrder.items.length ? reviewOrder.items[0].dishId : null;

      // POST review — backend will create review and compute new average
      const res = await axios.post("http://localhost:5000/api/reviews/add", {
        customerId,
        orderId: reviewOrder._id,
        dishId,
        ownerId: reviewOrder.ownerId,
        rating,
        comment,
      });

      // backend response expected to include avgRating (your route does send avgRating)
      const newAvg = res.data?.avgRating;
      // If avg present, update local ratings map to show instantly
      if (dishId && newAvg != null) {
        setDishRatings((prev) => ({
          ...prev,
          [dishId]: Number(Number(newAvg).toFixed(1)),
        }));
      } else {
        // otherwise refetch all averages as fallback
        fetchDishRatings();
      }

      alert("✅ Thank you — your review has been submitted!");
      setShowReviewModal(false);
      setReviewOrder(null);
      setRating(0);
      setComment("");
    } catch (err) {
      console.error("❌ Failed to submit review:", err);
      alert("❌ Failed to submit review. Try again later.");
    }
  };

  /* =====================================================
    RENDER
  ===================================================== */
  return (
    <div className="home-page">
      {/* Navbar */}
      <nav className="navbar shadow-sm">
        <div className="container d-flex justify-content-between align-items-center">
          <h3
            className="fw-bold text-purple mb-0"
            style={{ cursor: "pointer" }}
            onClick={() => {
              const customerId = localStorage.getItem("customerId");
              const ownerId = localStorage.getItem("ownerId");
              const deliveryBoyId = localStorage.getItem("deliveryBoyId");

              if (customerId) {
                window.location.href = "/customer-dashboard";
              } else if (ownerId) {
                window.location.href = "/owner-dashboard";
              } else if (deliveryBoyId) {
                window.location.href = "/delivery-dashboard";
              } else {
                window.location.href = "/";
              }
            }}
          >
            🍴 Yemzo
          </h3>

          <div className="d-flex align-items-center gap-3">
            {/* ADDED: Save My Location button (above View Cart) */}
            <button
              className="btn btn-outline-success rounded-pill px-4"
              onClick={handleSaveLocation}
            >
              📍 Save My Location
            </button>

            <button className="btn btn-outline-primary rounded-pill px-4" onClick={() => (window.location.href = "/cart")}>
              🛒 View Cart
            </button>

            <button className="btn btn-success rounded-pill px-4" onClick={() => setShowOrderModal(true)}>
              ✅ Place Order
            </button>

            <button className="btn btn-outline-secondary rounded-pill px-4" onClick={fetchMyOrders}>
              📦 My Orders
            </button>

            <button className="btn btn-outline-danger rounded-pill px-4" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero text-center py-5">
        <h1 className="fw-bold text-purple">{selectedHotel ? `${selectedHotel} Menu` : "Welcome to Yemzo! 🍽️"}</h1>

        {/* NEW: show saved address if available */}
        {location && (
          <p className="text-success small mt-2">
            📍 Saved Address: <strong>{location}</strong>
          </p>
        )}

        <p className="text-muted mt-2">
          {selectedHotel ? `Explore delicious dishes from ${selectedHotel}.` : "Select a hotel to explore its menu and order your favorites!"}
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
      {!selectedHotel && !showMyOrders && (
        <div className="container mt-5">
          <h4 className="fw-semibold mb-4 text-purple">🏨 Available Hotels</h4>
          <div className="row">
            {hotels.length > 0 ? (
              hotels.map((hotel) => (
                <div key={hotel._id} className="col-md-3 mb-4" style={{ cursor: "pointer" }} onClick={() => handleHotelClick(hotel._id, hotel.hotelName)}>
                  <div className="card shadow-sm border-0 h-100 text-center p-3 hotel-card">
                    <img
                      src={hotel.image || "https://images.unsplash.com/photo-1600891963937-5a32c707f157?auto=format&fit=crop&w=800&q=60"}
                      alt={hotel.hotelName}
                      className="card-img-top mb-3"
                      style={{ height: "160px", objectFit: "cover", borderRadius: "10px" }}
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
      {!showMyOrders && (
        <div className="container mt-5">
          <h4 className="fw-semibold mb-4 text-purple">{selectedHotel ? `${selectedHotel}'s Dishes` : "🍛 Popular Dishes"}</h4>
          <div className="row">
            {filtered.length > 0 ? (
              filtered.map((d) => (
                <div key={d._id} className="col-md-4 mb-4">
                  <div className="card dish-card shadow-sm border-0">
                    <img
                      src={d.image || "https://via.placeholder.com/200"}
                      alt={d.name}
                      className="card-img-top"
                      style={{ height: "220px", objectFit: "cover", borderTopLeftRadius: "10px", borderTopRightRadius: "10px" }}
                    />
                    <div className="card-body text-center">
                      <h5 className="fw-bold">{d.name}</h5>

                      {/* ⭐ Rating Display */}
                      <p className="mb-1">
                        {dishRatings[d._id] ? (
                          <span>⭐ {dishRatings[d._id]} / 5</span>
                        ) : (
                          <span className="text-muted">⭐ No ratings yet</span>
                        )}
                      </p>

                      <p className="text-muted mb-1 fw-semibold">🏨 {d.hotelName}</p>
                      <p className="fw-bold text-dark mb-1">₹{d.price}</p>
                      <p className="small text-muted">{d.about}</p>
                      <button className="btn btn-primary btn-sm w-100 rounded-pill" onClick={() => handleAddToCart(d._id)}>
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
      )}

      {/* My Orders Section */}
      {showMyOrders && (
        <div className="container mt-5">
          <h4 className="fw-semibold mb-4 text-purple text-center">📦 My Orders</h4>
          {orders.length === 0 ? (
            <p className="text-center text-muted">You haven't placed any orders yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Order ID</th>
                    <th>Items</th>
                    <th>Total (₹)</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Track</th> {/* NEW column for Track */}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id}>
                      <td>{o._id.slice(-6)}</td>
                      <td>
                        {o.items.map((i) => (
                          <div key={i.dishId}>
                            {i.name} × {i.quantity}
                          </div>
                        ))}
                      </td>
                      <td>{o.totalAmount}</td>
                      <td>{o.payment}</td>
                      <td>
                        <span
                          className={`badge bg-${
                            o.status === "Delivered"
                              ? "success"
                              : o.status === "Preparing"
                              ? "warning text-dark"
                              : o.status === "Dish Picked by Delivery Boy" || o.status === "OutForDelivery"
                              ? "info text-dark"
                              : "secondary"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>

                      {/* Track button */}
                      <td>
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => {
                            setSelectedOrder(o);
                            setShowMyOrders(true);
                            // open modal
                            // ensure selectedOrder is the freshest from server
                            axios
                              .get(`http://localhost:5000/api/orders/all`)
                              .then((res) => {
                                const fresh = res.data.find((x) => x._id === o._id);
                                if (fresh) setSelectedOrder(fresh);
                                // show modal after setting selectedOrder
                                setTimeout(() => setShowOrderModal(true), 80);
                              })
                              .catch(() => {
                                setShowOrderModal(true);
                              });
                          }}
                        >
                          Track
                        </button>

                        {/* Rate button: shown only after Delivered */}
                        {o.status === "Delivered" && (
                          <button
                            className="btn btn-outline-warning btn-sm ms-2"
                            onClick={() => {
                              // open review modal for this order
                              setReviewOrder(o);
                              setRating(0);
                              setComment("");
                              setShowReviewModal(true);
                            }}
                          >
                            ⭐ Rate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Order Placement Modal (unchanged) */}
      {showOrderModal && selectedOrder === null && (
        <div className="settings-popup" onClick={() => setShowOrderModal(false)}>
          <div className="settings-box" onClick={(e) => e.stopPropagation()}>
            <button className="settings-close" onClick={() => setShowOrderModal(false)}>
              ✖
            </button>
            <h4 className="fw-bold text-purple mb-3">🧾 Place Your Order</h4>

            <label className="form-label">Delivery Address</label>
            <textarea className="form-control mb-3" rows="2" value={address} onChange={(e) => setAddress(e.target.value)}></textarea>

            <label className="form-label">Payment Method</label>
            <select className="form-select mb-3" value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="COD">Cash on Delivery (COD)</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handlePlaceOrder}>
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================
         Track Order Modal (NEW)
         ============================ */}
      {showOrderModal && selectedOrder && (
        <div className="settings-popup" onClick={() => { setShowOrderModal(false); closeTrackModal(); }}>
          <div className="settings-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <button
              className="settings-close"
              onClick={() => {
                setShowOrderModal(false);
                closeTrackModal();
              }}
            >
              ✖
            </button>

            <h4 className="fw-bold text-purple mb-3">🚚 Track Order — {selectedOrder._id.slice(-6)}</h4>

            {/* Delivery boy info */}
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <p className="mb-1"><strong>Payment:</strong> {selectedOrder.payment} • <strong>Total:</strong> ₹{selectedOrder.totalAmount}</p>
                <p className="mb-1"><strong>Address:</strong> {selectedOrder.address}</p>
              </div>
              <div className="text-end">
                <p className="mb-1"><strong>ETA</strong></p>
                <p className="mb-0 small text-muted">{estimateETAText(selectedOrder)}</p>
              </div>
            </div>

            <hr />

            {/* Delivery boy card */}
            <div className="mb-3">
              <h6 className="fw-semibold">Delivery</h6>
              {selectedOrder.deliveryBoyId ? (
                <div className="d-flex align-items-center gap-3">
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: "#f1f4f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span role="img" aria-label="bike">🚴</span>
                  </div>
                  <div>
                    <div><strong>{selectedOrder.deliveryBoyId.name}</strong></div>
                    <div className="small text-muted">📞 {selectedOrder.deliveryBoyId.phone}</div>
                    {selectedOrder.deliveryBoyId.email && <div className="small text-muted">✉ {selectedOrder.deliveryBoyId.email}</div>}
                  </div>
                </div>
              ) : (
                <div className="text-muted">No delivery boy assigned yet. We’ll notify you when someone accepts the order.</div>
              )}
            </div>

            <hr />

            {/* Timeline / Progress tracker */}
            <div>
              <h6 className="fw-semibold mb-2">Order Progress</h6>

              {/* simple visual tracker */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {["Pending", "Preparing", "Picked Up", "Delivered"].map((label, idx) => {
                  // map label names to status keys used in your backend
                  const mapping =
                    label === "Pending" ? "Pending" :
                    label === "Preparing" ? "Preparing" :
                    label === "Picked Up" ? "Dish Picked by Delivery Boy" :
                    "Delivered";

                  const currentIndex = getTimelineStepIndex(selectedOrder.status);
                  const stepState = idx <= currentIndex ? "done" : "todo";

                  return (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: stepState === "done" ? "#3ecf8e" : "#e9ecef",
                          color: stepState === "done" ? "#fff" : "#6c757d",
                          fontWeight: 700,
                        }}
                      >
                        {idx <= currentIndex ? "✓" : idx + 1}
                      </div>
                      <div style={{ minWidth: 80 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                        <div style={{ fontSize: 12, color: "#6c757d" }}>
                          {mapping === selectedOrder.status ? <em>Now</em> : null}
                        </div>
                      </div>

                      {idx < 3 && (
                        <div style={{ width: 40, height: 2, background: idx < currentIndex ? "#3ecf8e" : "#e9ecef", marginLeft: 8, marginRight: 8 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <hr />

            {/* order items */}
            <div>
              <h6 className="fw-semibold mb-2">Items</h6>
              <ul className="list-unstyled">
                {selectedOrder.items.map((it, i) => (
                  <li key={i}>
                    {it.name} × {it.quantity} — ₹{it.price * it.quantity}
                  </li>
                ))}
              </ul>
            </div>

            <div className="d-flex justify-content-end mt-3">
              <button
                className="btn btn-secondary me-2"
                onClick={() => {
                  setShowOrderModal(false);
                  closeTrackModal();
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============= REVIEW MODAL ============= */}
      {showReviewModal && reviewOrder && (
        <div className="settings-popup" onClick={() => setShowReviewModal(false)}>
          <div className="settings-box" onClick={(e) => e.stopPropagation()}>
            <button className="settings-close" onClick={() => setShowReviewModal(false)}>
              ✖
            </button>

            <h4 className="fw-bold text-purple mb-3">⭐ Rate Your Dish</h4>
            <p className="text-muted small mb-3">
              You’re reviewing: <strong>{reviewOrder.items?.[0]?.name || "Dish"}</strong>
            </p>

            {/* Star rating */}
            <div className="mb-3 text-center">
              {[1,2,3,4,5].map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 28,
                    cursor: "pointer",
                    color: s <= rating ? "#ffc107" : "#e4e5e9",
                    marginRight: 6
                  }}
                  onClick={() => setRating(s)}
                >★</span>
              ))}
            </div>

            <textarea
              className="form-control mb-3"
              rows="3"
              placeholder="Leave a comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            ></textarea>

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={() => setShowReviewModal(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleSubmitReview}>Submit Review</button>
            </div>
          </div>
        </div>
      )}

      <YemzoChatbot customerId={customerId} />
    </div>
  );
}

export default CustomerDashboard;
