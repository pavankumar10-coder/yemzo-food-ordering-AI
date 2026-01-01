import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "../styles/Home.css";

function DeliveryBoyPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  const deliveryBoyId = localStorage.getItem("deliveryBoyId");
  const deliveryBoyName = localStorage.getItem("deliveryBoyName");

  /* =====================================================
      🚀 INIT SOCKET.IO + FETCH ORDERS
  ===================================================== */
  useEffect(() => {
    if (!deliveryBoyId) {
      alert("⚠️ Please login as a Delivery Boy first.");
      window.location.href = "/delivery-auth";
      return;
    }

    const s = io("http://localhost:5000");
    setSocket(s);

    s.on("connect", () => {
      console.log("🟢 Connected to socket server");
      s.emit("join-room", `delivery_${deliveryBoyId}`);
      s.emit("join-room", "delivery_pool");
    });

    // When new order is placed
    s.on("available-order", (order) => {
      console.log("📦 New order available:", order);
      fetchOrders();
    });

    // When order updates in real time
    s.on("order-updated", (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
    });

    fetchOrders();

    return () => s.disconnect();
  }, [deliveryBoyId]);

  /* =====================================================
      📦 FETCH ORDERS (Unassigned + Assigned)
  ===================================================== */
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/orders/all");

      // Filter for unassigned or assigned to this delivery boy
      const filtered = res.data.filter(
        (o) =>
          o.deliveryStatus === "Unassigned" ||
          (o.deliveryBoyId && o.deliveryBoyId._id === deliveryBoyId)
      );

      setOrders(filtered);
    } catch (err) {
      console.error("❌ Failed to fetch delivery orders:", err);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
      🧾 ACCEPT ORDER (Assign delivery boy)
  ===================================================== */
  const handleAcceptOrder = async (id) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/orders/assign/${id}`, {
        deliveryBoyId,
      });
      setOrders((prev) =>
        prev.map((o) => (o._id === id ? res.data.order : o))
      );

      socket?.emit("order-updated", res.data.order);
      alert("✅ You have accepted the order!");
    } catch (err) {
      console.error("❌ Failed to accept order:", err);
      alert("❌ Failed to accept order.");
    }
  };

  /* =====================================================
      🚴 PICKUP ORDER
  ===================================================== */
  const handlePickupOrder = async (id) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/orders/pickup/${id}`);
      setOrders((prev) =>
        prev.map((o) => (o._id === id ? res.data.order : o))
      );

      socket?.emit("order-updated", res.data.order);
      alert("📦 Order picked up from hotel!");
    } catch (err) {
      console.error("❌ Pickup failed:", err);
      alert("❌ Failed to mark pickup.");
    }
  };

  /* =====================================================
      ✅ MARK AS DELIVERED
  ===================================================== */
  const handleDelivered = async (id) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/orders/delivered/${id}`);
      setOrders((prev) =>
        prev.map((o) => (o._id === id ? res.data.order : o))
      );

      socket?.emit("order-updated", res.data.order);
      alert("✅ Order delivered successfully!");
    } catch (err) {
      console.error("❌ Deliver error:", err);
      alert("❌ Failed to mark as delivered.");
    }
  };

  /* =====================================================
      🔐 LOGOUT
  ===================================================== */
  const handleLogout = () => {
    if (window.confirm("Do you really want to logout?")) {
      localStorage.removeItem("deliveryBoyId");
      localStorage.removeItem("deliveryBoyName");
      window.location.href = "/";
    }
  };

  /* =====================================================
      🎨 RENDER UI
  ===================================================== */
  return (
    <div className="container mt-5 dashboard">
      {/* Header with Smart Yemzo Navigation */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3
          className="fw-bold text-purple mb-0"
          style={{ cursor: "pointer" }}
          onClick={() => {
            const deliveryBoyId = localStorage.getItem("deliveryBoyId");
            const ownerId = localStorage.getItem("ownerId");
            const customerId = localStorage.getItem("customerId");

            if (deliveryBoyId) {
              window.location.href = "/delivery-dashboard";
            } else if (ownerId) {
              window.location.href = "/owner-dashboard";
            } else if (customerId) {
              window.location.href = "/customer-dashboard";
            } else {
              window.location.href = "/";
            }
          }}
        >
          🍴 Yemzo
        </h3>

        <h2 className="fw-bold text-purple">
          🚴 Welcome, {deliveryBoyName || "Delivery Boy"}
        </h2>

        <div>
          <button
            className="btn btn-outline-secondary me-2 rounded-pill"
            onClick={fetchOrders}
          >
            🔄 Refresh
          </button>
          <button
            className="btn btn-outline-danger rounded-pill"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3">Loading delivery orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <p className="text-center text-muted mt-5">No delivery orders available.</p>
      ) : (
        orders.map((order) => (
          <div key={order._id} className="card shadow-sm mb-3 border-0 p-3">
            <div className="d-flex justify-content-between flex-wrap">
              <div>
                <h6 className="fw-bold text-purple mb-1">
                  👤 {order.customerId?.name || "Unknown Customer"}
                </h6>
                <p className="mb-0 text-muted">📍 {order.address}</p>
                <p className="mb-0">💰 ₹{order.totalAmount}</p>
                <p className="small text-muted mb-1">
                  🕒 {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="text-end">
                <span
                  className={`badge rounded-pill px-3 py-2 ${
                    order.status === "Delivered"
                      ? "bg-success"
                      : order.status === "Dish Picked by Delivery Boy"
                      ? "bg-info text-dark"
                      : order.status === "Preparing"
                      ? "bg-warning text-dark"
                      : "bg-secondary"
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>

            <hr />
            <p className="fw-semibold mb-2">🍱 Items:</p>
            <ul className="list-unstyled">
              {order.items.map((i, index) => (
                <li key={index}>
                  • {i.name} × {i.quantity}
                </li>
              ))}
            </ul>

            {/* ACTION BUTTONS */}
            <div className="d-flex justify-content-end gap-2 mt-3">
              {order.deliveryStatus === "Unassigned" && (
                <button
                  className="btn btn-outline-success btn-sm"
                  onClick={() => handleAcceptOrder(order._id)}
                >
                  ✅ Accept Order
                </button>
              )}

              {order.deliveryStatus === "Assigned" && (
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => handlePickupOrder(order._id)}
                >
                  📦 Mark as Picked Up
                </button>
              )}

              {order.deliveryStatus === "PickedUp" && (
                <button
                  className="btn btn-outline-success btn-sm"
                  onClick={() => handleDelivered(order._id)}
                >
                  ✅ Mark as Delivered
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default DeliveryBoyPage;
