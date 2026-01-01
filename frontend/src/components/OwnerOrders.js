import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "../styles/Home.css";

function OwnerOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const ownerId = localStorage.getItem("ownerId");

  useEffect(() => {
    if (!ownerId) {
      alert("⚠️ Please login as an owner first.");
      window.location.href = "/";
    }
  }, [ownerId]);

  useEffect(() => {
    const socket = io("http://localhost:5000");

    socket.on("connect", () => {
      console.log("🟢 Connected to Socket.IO as owner:", socket.id);
    });

    // 🟢 New Order arrives
    socket.on("new-order", (order) => {
      if (order.ownerId === ownerId) {
        setOrders((prev) => [order, ...prev]);
      }
    });

    // 🟡 Order updated (status change)
    socket.on("order-updated", (updatedOrder) => {
      if (updatedOrder.ownerId === ownerId) {
        setOrders((prev) =>
          prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [ownerId]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/orders/owner/${ownerId}`);
      setOrders(res.data.orders || res.data);
    } catch (err) {
      console.error("❌ Failed to fetch orders:", err);
      alert("Failed to load orders. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [ownerId]);
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdating(true);
      const res = await axios.put(`http://localhost:5000/api/orders/status/${orderId}`, {
        status: newStatus,
      });

      // ✅ Update order locally
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId ? res.data.order || res.data : order
        )
      );

      alert(`✅ Order marked as ${newStatus}`);
    } catch (err) {
      console.error("❌ Failed to update order status:", err);
      alert("Failed to update order status.");
    } finally {
      setUpdating(false);
    }
  };

  const filteredOrders =
    filter === "All" ? orders : orders.filter((order) => order.status === filter);

  
  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="container mt-5 dashboard">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-purple mb-0">📦 Orders Management</h2>
        <div>
          <button
            className="btn btn-outline-secondary me-2 rounded-pill"
            onClick={() => (window.location.href = "/owner-dashboard")}
          >
            ← Back to Dashboard
          </button>
          <button className="btn btn-outline-primary rounded-pill" onClick={fetchOrders}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="d-flex justify-content-center gap-3 mb-4 flex-wrap">
        {["All", "Pending", "Preparing", "Dish Picked by Delivery Boy"].map((status) => (
          <button
            key={status}
            className={`btn ${
              filter === status ? "btn-primary" : "btn-outline-primary"
            } rounded-pill px-3`}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders Display */}
      {filteredOrders.length === 0 ? (
        <p className="text-center text-muted fs-5">No {filter} orders yet.</p>
      ) : (
        filteredOrders.map((order) => (
          <div key={order._id} className="card shadow-sm mb-3 border-0 p-3">
            <div className="d-flex justify-content-between flex-wrap">
              <div>
                <h6 className="fw-bold text-purple mb-1">👤 {order.customerId?.name}</h6>
                <p className="mb-0">📞 {order.customerId?.phone}</p>
                <p className="mb-1">📧 {order.customerId?.email}</p>
                <p className="text-muted small mb-2">
                  📍 {order.address || "No address provided"}
                </p>
              </div>
              <div className="text-end">
                <p className="fw-bold mb-1">💰 ₹{order.totalAmount}</p>
                <p className="text-muted small mb-0">
                  🕒 {new Date(order.createdAt).toLocaleString()}
                </p>
                <span
                  className={`badge rounded-pill px-3 py-2 mt-1 ${
                    order.status === "Dish Picked by Delivery Boy"
                      ? "bg-info text-dark"
                      : order.status === "Preparing"
                      ? "bg-warning text-dark"
                      : order.status === "Pending"
                      ? "bg-secondary"
                      : "bg-success"
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>

            <hr />

            <ul className="list-unstyled mb-2">
              {order.items.map((item, index) => (
                <li key={index}>
                  🍽️ {item.name} × {item.quantity} = ₹{item.price * item.quantity}
                </li>
              ))}
            </ul>

            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap">
              <p className="fw-semibold mb-0">
                💳 Payment: <span className="text-success">{order.payment}</span>
              </p>

              {/* ✅ Action Buttons */}
              {order.status !== "Dish Picked by Delivery Boy" && (
                <div className="btn-group">
                  {order.status === "Pending" && (
                    <button
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => handleStatusChange(order._id, "Preparing")}
                      disabled={updating}
                    >
                      🍳 Mark as Preparing
                    </button>
                  )}
                  {order.status === "Preparing" && (
                    <button
                      className="btn btn-outline-info btn-sm"
                      onClick={() =>
                        handleStatusChange(order._id, "Dish Picked by Delivery Boy")
                      }
                      disabled={updating}
                    >
                      🚴 Mark as Picked by Delivery Boy
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default OwnerOrders;
