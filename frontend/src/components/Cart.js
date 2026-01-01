import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Home.css";

function Cart() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("COD");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const customerId = localStorage.getItem("customerId");

  // ✅ Calculate total
  const calculateTotal = (cartItems) =>
    cartItems.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
      0
    );

  // ✅ Fetch Cart Data
  const fetchCart = async () => {
    setLoading(true);
    try {
      if (!customerId) return;
      const res = await axios.get(`http://localhost:5000/api/cart/${customerId}`);
      const fetchedItems = res.data.items || [];
      setItems(fetchedItems);
      setTotal(res.data.total || calculateTotal(fetchedItems));
    } catch (err) {
      console.error("❌ Error fetching cart:", err);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [customerId]);

  // ✅ Update quantity
  const updateQuantity = async (id, newQty) => {
    if (newQty < 1) return;
    try {
      setActionLoading(true);
      await axios.put(`http://localhost:5000/api/cart/update/${id}`, {
        quantity: newQty,
      });
      const updatedItems = items.map((i) =>
        i._id === id ? { ...i, quantity: newQty } : i
      );
      setItems(updatedItems);
      setTotal(calculateTotal(updatedItems));
    } catch (err) {
      console.error("❌ Error updating quantity:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ Remove Single Item
  const handleRemove = async (id) => {
    if (!window.confirm("Remove this item from your cart?")) return;
    try {
      setActionLoading(true);
      await axios.delete(`http://localhost:5000/api/cart/${id}`);
      const updatedItems = items.filter((i) => i._id !== id);
      setItems(updatedItems);
      setTotal(calculateTotal(updatedItems));
      alert("🗑️ Item removed from cart");
    } catch (err) {
      console.error("❌ Error removing item:", err);
      alert("Failed to remove item");
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ Clear Cart
  const handleClear = async () => {
    if (!window.confirm("Clear your entire cart?")) return;
    try {
      setActionLoading(true);
      await axios.delete(`http://localhost:5000/api/cart/clear/${customerId}`);
      setItems([]);
      setTotal(0);
      alert("🧹 Cart cleared successfully");
    } catch (err) {
      console.error("❌ Error clearing cart:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ Place Order with address + payment
  const handlePlaceOrder = async () => {
    if (items.length === 0) return alert("🛒 Your cart is empty!");
    if (!address.trim()) return alert("⚠️ Please enter your delivery address.");

    try {
      setActionLoading(true);

      // ✅ Group items by owner (each hotel gets its own order)
      const groupedOrders = {};
      items.forEach((item) => {
        const ownerId = item.ownerId;
        const dishId = item.dishId;

        if (!ownerId || !dishId) {
          throw new Error("Missing ownerId or dishId for one or more cart items.");
        }

        if (!groupedOrders[ownerId]) groupedOrders[ownerId] = [];
        groupedOrders[ownerId].push({
          dishId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        });
      });

      // ✅ Send one order per owner
      for (const ownerId in groupedOrders) {
        const orderItems = groupedOrders[ownerId];
        const totalAmount = orderItems.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        );

        const payload = {
          customerId,
          ownerId,
          items: orderItems,
          totalAmount,
          address,
          payment,
        };

        console.log("🧾 Sending order payload:", payload);
        await axios.post("http://localhost:5000/api/orders/create", payload);
      }

      // ✅ Clear cart after success
      await axios.delete(`http://localhost:5000/api/cart/clear/${customerId}`);
      setItems([]);
      setTotal(0);
      setAddress("");
      setPayment("COD");

      alert("✅ Order placed successfully!");
      window.location.href = "/orders";
    } catch (err) {
      console.error("❌ Failed to place order:", err.response?.data || err.message);
      alert("❌ Failed to place order. Try again later.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3">Loading your cart...</p>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-purple mb-0">🛒 Your Cart</h2>
        <button
          className="btn btn-outline-secondary rounded-pill"
          onClick={() => (window.location.href = "/customer-dashboard")}
          disabled={actionLoading}
        >
          ← Back to Menu
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-muted fs-5">Your cart is empty.</p>
      ) : (
        <>
          {/* Cart Items */}
          <div className="row">
            {items.map((item) => (
              <div key={item._id} className="col-md-4 mb-4">
                <div className="card shadow-sm border-0 dish-card">
                  <img
                    src={item.image || "https://via.placeholder.com/200"}
                    alt={item.name}
                    className="card-img-top"
                    style={{
                      height: "200px",
                      objectFit: "cover",
                      borderTopLeftRadius: "10px",
                      borderTopRightRadius: "10px",
                    }}
                  />
                  <div className="card-body text-center">
                    <h5 className="fw-bold">{item.name}</h5>
                    <p className="text-muted small">{item.about}</p>
                    <p className="fw-bold text-dark mb-2">
                      ₹{item.price} × {item.quantity} = ₹
                      {(item.price || 0) * (item.quantity || 1)}
                    </p>
                    <p className="small text-purple fw-semibold mb-2">
                      🏨 {item.hotelName}
                    </p>

                    {/* Quantity Controls */}
                    <div className="d-flex justify-content-center align-items-center mb-2">
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        disabled={actionLoading || item.quantity <= 1}
                      >
                        ➖
                      </button>
                      <span className="mx-3 fw-bold">{item.quantity}</span>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        disabled={actionLoading}
                      >
                        ➕
                      </button>
                    </div>

                    <button
                      className="btn btn-outline-danger btn-sm w-100 rounded-pill"
                      onClick={() => handleRemove(item._id)}
                      disabled={actionLoading}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Address Form */}
          <div className="card p-4 shadow-sm border-0 mt-4">
            <h5 className="fw-bold text-purple mb-3">📍 Delivery Address</h5>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Enter your full delivery address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          {/* Payment Options */}
          <div className="card p-4 shadow-sm border-0 mt-3">
            <h5 className="fw-bold text-purple mb-3">💳 Payment Method</h5>
            <div className="form-check">
              <input
                type="radio"
                id="cod"
                name="payment"
                value="COD"
                checked={payment === "COD"}
                onChange={(e) => setPayment(e.target.value)}
                className="form-check-input"
              />
              <label htmlFor="cod" className="form-check-label">
                Cash on Delivery (COD)
              </label>
            </div>

            <div className="form-check">
              <input
                type="radio"
                id="upi"
                name="payment"
                value="UPI"
                checked={payment === "UPI"}
                onChange={(e) => setPayment(e.target.value)}
                className="form-check-input"
              />
              <label htmlFor="upi" className="form-check-label">
                UPI / Google Pay / PhonePe
              </label>
            </div>

            <div className="form-check">
              <input
                type="radio"
                id="card"
                name="payment"
                value="Card"
                checked={payment === "Card"}
                onChange={(e) => setPayment(e.target.value)}
                className="form-check-input"
              />
              <label htmlFor="card" className="form-check-label">
                Credit / Debit Card
              </label>
            </div>
          </div>

          {/* Total & Actions */}
          <div className="text-center mt-4">
            <h4 className="fw-bold text-purple">Total: ₹{total}</h4>
            <div className="d-flex justify-content-center gap-3 mt-3 flex-wrap">
              <button
                className="btn btn-success rounded-pill px-4"
                onClick={handlePlaceOrder}
                disabled={actionLoading}
              >
                ✅ Place Order
              </button>
              <button
                className="btn btn-outline-danger rounded-pill px-4"
                onClick={handleClear}
                disabled={actionLoading}
              >
                🧹 Clear Cart
              </button>
              <button
                className="btn btn-outline-secondary rounded-pill px-4"
                onClick={fetchCart}
                disabled={actionLoading}
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;
