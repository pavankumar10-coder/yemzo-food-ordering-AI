import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "../styles/Home.css";

function OwnerDashboard() {
  const [dish, setDish] = useState({ name: "", price: "", image: "", about: "" });
  const [dishes, setDishes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editingDish, setEditingDish] = useState(null);
  const [showOrders, setShowOrders] = useState(false); // 👈 NEW: Toggle view
  const [socket, setSocket] = useState(null);

  const ownerId = localStorage.getItem("ownerId");

  /* =====================================================
     🔐 CHECK LOGIN
  ===================================================== */
  useEffect(() => {
    if (!ownerId) {
      alert("⚠️ Please login as an owner first.");
      window.location.href = "/";
    }
  }, [ownerId]);

  /* =====================================================
     🍽️ FETCH OWNER DISHES
  ===================================================== */
  useEffect(() => {
    const fetchDishes = async () => {
      try {
        if (!ownerId) return;
        const res = await axios.get(`http://localhost:5000/api/owner/dishes/${ownerId}`);
        setDishes(res.data);
      } catch (err) {
        console.error("❌ Error fetching dishes:", err.response?.data || err.message);
      }
    };
    fetchDishes();
  }, [ownerId]);

  /* =====================================================
     ⚡ SOCKET.IO REAL-TIME SETUP
  ===================================================== */
  useEffect(() => {
    const s = io("http://localhost:5000");
    setSocket(s);

    s.on("new-order", (order) => {
      if (order.ownerId === ownerId) {
        setOrders((prev) => [order, ...prev]);
      }
    });

    s.on("order-updated", (updatedOrder) => {
      if (updatedOrder.ownerId === ownerId) {
        setOrders((prev) =>
          prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
        );
      }
    });

    return () => s.disconnect();
  }, [ownerId]);

  /* =====================================================
     📦 FETCH OWNER ORDERS
  ===================================================== */
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/orders/owner/${ownerId}`);
      setOrders(res.data);
    } catch (err) {
      console.error("❌ Error fetching orders:", err.response?.data || err.message);
    }
  };

  /* =====================================================
     🔄 UPDATE ORDER STATUS
  ===================================================== */
  const updateOrderStatus = async (id, status) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/orders/status/${id}`, { status });
      setOrders((prev) => prev.map((o) => (o._id === id ? res.data.order : o)));
      alert(`✅ Order marked as '${status}'`);
    } catch (err) {
      console.error("❌ Failed to update order status:", err);
      alert("❌ Failed to update order status.");
    }
  };

  /* =====================================================
     🧾 DISH MANAGEMENT
  ===================================================== */
  const handleChange = (e) => setDish({ ...dish, [e.target.name]: e.target.value });

  const handleAddDish = async (e) => {
    e.preventDefault();
    if (!dish.name || !dish.price) return alert("⚠️ Please fill all required fields.");

    const payload = {
      ownerId,
      name: dish.name.trim(),
      price: Number(dish.price),
      image: dish.image.trim() || "https://via.placeholder.com/200",
      about: dish.about.trim(),
    };

    try {
      const res = await axios.post("http://localhost:5000/api/owner/add-dish", payload);
      setDishes([...dishes, res.data]);
      setDish({ name: "", price: "", image: "", about: "" });
      alert("✅ Dish added successfully!");
    } catch (err) {
      console.error("❌ Failed to add dish:", err.response?.data || err.message);
      alert("❌ Failed to add dish.");
    }
  };

  const handleEditDish = (d) => {
    setEditingDish(d);
    setDish({ name: d.name, price: d.price, image: d.image, about: d.about });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`http://localhost:5000/api/owner/dish/${editingDish._id}`, dish);
      setDishes(dishes.map((d) => (d._id === editingDish._id ? res.data : d)));
      setEditingDish(null);
      setDish({ name: "", price: "", image: "", about: "" });
      alert("✅ Dish updated successfully!");
    } catch (err) {
      console.error("❌ Failed to update dish:", err);
      alert("❌ Failed to update dish.");
    }
  };

  const handleDeleteDish = async (id) => {
    if (!window.confirm("Are you sure you want to delete this dish?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/owner/dish/${id}`);
      setDishes(dishes.filter((d) => d._id !== id));
      alert("🗑️ Dish deleted successfully!");
    } catch (err) {
      console.error("❌ Failed to delete dish:", err);
      alert("❌ Failed to delete dish.");
    }
  };

  /* =====================================================
     🔐 ACCOUNT & SESSION
  ===================================================== */
  const handleDeleteAccount = async () => {
    if (!ownerId) return alert("No owner logged in.");
    if (!window.confirm("⚠️ This will delete your hotel and all dishes. Continue?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/owner/owner/${ownerId}`);
      localStorage.removeItem("ownerId");
      alert("🧹 Account deleted successfully!");
      window.location.href = "/";
    } catch (err) {
      console.error("❌ Failed to delete account:", err);
      alert("❌ Failed to delete account.");
    }
  };

  const handleLogout = () => {
    if (window.confirm("Do you really want to logout?")) {
      localStorage.removeItem("ownerId");
      window.location.href = "/";
    }
  };

  /* =====================================================
     🧱 RENDER UI
  ===================================================== */
  return (
    <div className="container mt-5 dashboard">
      {/* Navbar */}
      <div className="d-flex justify-content-between align-items-center mb-4">
       <h3
  className="fw-bold text-purple mb-0"
  style={{ cursor: "pointer" }}
  onClick={() => {
    const ownerId = localStorage.getItem("ownerId");
    const customerId = localStorage.getItem("customerId");
    const deliveryBoyId = localStorage.getItem("deliveryBoyId");

    if (ownerId) {
      window.location.href = "/owner-dashboard";
    } else if (customerId) {
      window.location.href = "/customer-dashboard";
    } else if (deliveryBoyId) {
      window.location.href = "/delivery-dashboard";
    } else {
      window.location.href = "/";
    }
  }}
>
  🍴 Yemzo
</h3>

        <div>
          <button
            className="btn btn-outline-secondary me-2 rounded-pill"
            onClick={() => {
              if (!showOrders) fetchOrders();
              setShowOrders(!showOrders);
            }}
          >
            {showOrders ? "🍛 View Dishes" : "📦 View Orders"}
          </button>
          <button className="btn btn-outline-primary me-2" onClick={handleLogout}>
            🚪 Logout
          </button>
          <button className="btn btn-outline-danger" onClick={handleDeleteAccount}>
            🗑️ Delete Account
          </button>
        </div>
      </div>

      {/* Add/Edit Dish Form */}
      {!showOrders && (
        <form
          className="card p-4 shadow-sm mb-4 border-0"
          onSubmit={editingDish ? handleSaveEdit : handleAddDish}
        >
          <h5 className="fw-bold mb-3 text-purple">
            {editingDish ? "✏️ Edit Dish" : "➕ Add New Dish"}
          </h5>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Dish Name</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={dish.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Price (₹)</label>
              <input
                type="number"
                name="price"
                className="form-control"
                value={dish.price}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-12 mb-3">
              <label className="form-label">Image URL</label>
              <input
                type="text"
                name="image"
                className="form-control"
                value={dish.image}
                onChange={handleChange}
              />
            </div>

            {dish.image && (
              <div className="text-center mb-3">
                <img
                  src={dish.image}
                  alt="Preview"
                  className="dish-preview shadow-sm"
                  style={{
                    maxWidth: "180px",
                    borderRadius: "10px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}
                />
              </div>
            )}

            <div className="col-md-12 mb-3">
              <label className="form-label">About Dish</label>
              <textarea
                name="about"
                className="form-control"
                rows="2"
                value={dish.about}
                onChange={handleChange}
              />
            </div>
          </div>

          <button className={`btn ${editingDish ? "btn-warning" : "btn-primary"} w-100`}>
            {editingDish ? "💾 Save Changes" : "➕ Add Dish"}
          </button>
        </form>
      )}

      {/* 🍛 Dishes Section */}
      {!showOrders && (
        <>
          <h5 className="mb-3 text-center fw-bold text-purple">🍛 Your Dishes</h5>
          <div className="row">
            {dishes.length === 0 ? (
              <p className="text-center text-muted">No dishes added yet.</p>
            ) : (
              dishes.map((d) => (
                <div key={d._id} className="col-md-4 mb-3">
                  <div className="card shadow-sm border-0 h-100">
                    <img
                      src={d.image || "https://via.placeholder.com/150"}
                      alt={d.name}
                      className="card-img-top"
                      style={{ height: "160px", objectFit: "cover" }}
                    />
                    <div className="card-body text-center">
                      <h5 className="fw-bold">{d.name}</h5>
                      <p className="fw-semibold text-success mb-1">₹{d.price}</p>
                      <p className="text-muted small">{d.about}</p>
                      <div className="d-flex justify-content-between mt-2">
                        <button
                          className="btn btn-sm btn-outline-warning w-50 me-2"
                          onClick={() => handleEditDish(d)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger w-50"
                          onClick={() => handleDeleteDish(d._id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* 📦 Orders Section */}
      {showOrders && (
        <>
          <h5 className="mt-5 mb-3 text-center fw-bold text-purple">📦 Recent Orders</h5>
          {orders.length === 0 ? (
            <p className="text-center text-muted">No orders yet.</p>
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
                    <th>Action</th>
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
                              : "secondary"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o._id, e.target.value)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Preparing">Preparing</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default OwnerDashboard;