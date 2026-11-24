import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NetworkBanner from "./components/NetworkBanner";
import NotificationModal from "./components/NotificationModal";

import Home from "./pages/Home";
import Explore from "./pages/Explore";
import CampaignDetails from "./pages/CampaignDetails";
import CreateCampaign from "./pages/CreateCampaign";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#1F2937]">
      {/* Network Warning Banner if connected to wrong chain */}
      <NetworkBanner />

      {/* Global Navigation Header */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/campaign/:id" element={<CampaignDetails />} />
          <Route path="/create" element={<CreateCampaign />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
        </Routes>
      </main>

      {/* Global Transaction Modal / Toast Feedback */}
      <NotificationModal />

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
