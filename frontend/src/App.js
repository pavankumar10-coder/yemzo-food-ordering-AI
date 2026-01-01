import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import OwnerDashboard from "./components/OwnerDashboard";
import CustomerDashboard from "./components/CustomerDashboard";
import Cart from "./components/Cart";
import Menu from "./components/Menu"; // 🍽️ Hotel Menu page
import OwnerOrders from "./components/OwnerOrders"; // 📦 Owner Orders page
import "bootstrap/dist/css/bootstrap.min.css";
import DeliveryBoyAuth from "./components/DeliveryBoyAuth";
import DeliveryBoyPage from "./components/DeliveryBoyPage";


function App() {
  return (
    <Router>
      <Routes>
        {/* 🌟 Home Page */}
        <Route path="/" element={<Home />} />

        {/* 🏨 Owner Dashboard */}
        <Route path="/owner-dashboard" element={<OwnerDashboard />} />

        {/* 📦 Owner Orders Page */}
        <Route path="/owner-orders" element={<OwnerOrders />} />

        {/* 👤 Customer Dashboard */}
        <Route path="/customer-dashboard" element={<CustomerDashboard />} />

        {/* 🛒 Cart Page */}
        <Route path="/cart" element={<Cart />} />

        {/* 🍽️ Hotel Menu Page (Dynamic by Hotel ID) */}
        <Route path="/menu/:ownerId" element={<Menu />} />

        <Route path="/delivery" element={<DeliveryBoyAuth />} />

        <Route path="/delivery-dashboard" element={<DeliveryBoyPage />} />
      </Routes>
    </Router>
  );
}

export default App;
