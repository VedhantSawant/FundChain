import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, Calendar, Coins, Image, Tag, FileText, AlertCircle, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import CampaignCard from "../components/CampaignCard";

const CATEGORIES = [
  "Agriculture",
  "Education",
  "Healthcare",
  "Technology",
  "Community Development",
  "Environment",
  "Other",
];

// Preset sample images for quick college demonstration
const SAMPLE_IMAGE_PRESETS = [
  {
    name: "Drip Irrigation (Agriculture)",
    url: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80",
    category: "Agriculture",
  },
  {
    name: "Organic Seeds (Agriculture)",
    url: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80",
    category: "Agriculture",
  },
  {
    name: "Rural Classroom (Education)",
    url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
    category: "Education",
  },
  {
    name: "Mobile Health Clinic (Healthcare)",
    url: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80",
    category: "Healthcare",
  },
  {
    name: "Community Water Supply",
    url: "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=1200&q=80",
    category: "Community Development",
  },
];

export default function CreateCampaign() {
  const { isConnected, connectWallet, createCampaign, account } = useWeb3();
  const navigate = useNavigate();

  // Calculate default deadline: 14 days from now
  const defaultDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goalEth: "",
    deadline: defaultDeadline,
    category: "Agriculture",
    imageUrl: "",
    beneficiary: "",
  });

  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationError("");
  };

  const handlePresetDays = (days) => {
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);
    setFormData((prev) => ({ ...prev, deadline: futureDate }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    if (!isConnected) {
      try {
        await connectWallet();
      } catch {
        setValidationError("Please connect your MetaMask wallet before creating a campaign.");
        return;
      }
    }

    // Form Validations
    if (!formData.title.trim()) {
      setValidationError("Campaign title cannot be empty.");
      return;
    }
    if (!formData.description.trim()) {
      setValidationError("Campaign description cannot be empty.");
      return;
    }
    const goalNum = parseFloat(formData.goalEth);
    if (isNaN(goalNum) || goalNum <= 0) {
      setValidationError("Funding goal must be a number greater than 0 ETH.");
      return;
    }

    const deadlineTimestamp = Math.floor(new Date(formData.deadline).getTime() / 1000);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (deadlineTimestamp <= currentTimestamp) {
      setValidationError("Campaign deadline must be in the future.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createCampaign({
        title: formData.title.trim(),
        description: formData.description.trim(),
        goalEth: formData.goalEth,
        deadlineTimestamp,
        category: formData.category,
        imageUrl: formData.imageUrl.trim(),
        beneficiary: formData.beneficiary.trim() || account,
      });

      // Redirect to newly created campaign
      if (result.campaignId) {
        navigate(`/campaign/${result.campaignId}`);
      } else {
        navigate("/explore");
      }
    } catch (err) {
      console.error("Failed to create campaign:", err);
      setValidationError(err.reason || err.message || "Failed to submit transaction to the blockchain.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live preview mockup
  const previewCampaign = {
    id: "Preview",
    creator: account || "0x0000000000000000000000000000000000000000",
    title: formData.title || "Your Campaign Title Will Appear Here",
    description:
      formData.description ||
      "Provide a clear, inspiring narrative about what you are funding, how the ETH will be utilized, and the direct impact on beneficiaries.",
    goal: formData.goalEth || "1.0",
    amountRaised: "0.0",
    deadline: Math.floor(new Date(formData.deadline).getTime() / 1000),
    category: formData.category,
    imageUrl: formData.imageUrl,
    progressPercent: 0,
    status: "Active",
    isExpired: false,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="border-b border-gray-200/80 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch on Ethereum Blockchain</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Create a New Campaign
        </h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          Publish an immutable crowdfunding campaign to the smart contract. Funds are safely held in trust until your deadline passes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Form Column (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-10 shadow-soft">
          {validationError && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Campaign Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Solar Drip Irrigation for Smallholder Farmers"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Category <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Campaign Story & Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="description"
                rows={5}
                required
                placeholder="Describe your initiative, why funds are needed, who benefits, and how the ETH will be deployed..."
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-normal leading-relaxed"
              />
            </div>

            {/* Goal and Deadline Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Goal */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Funding Goal (ETH) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="goalEth"
                    step="0.01"
                    min="0.001"
                    required
                    placeholder="e.g. 1.5"
                    value={formData.goalEth}
                    onChange={handleChange}
                    className="w-full pl-4 pr-16 py-3 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                    ETH
                  </span>
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Campaign Deadline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="deadline"
                  required
                  value={formData.deadline}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium cursor-pointer"
                />

                {/* Quick Presets */}
                <div className="flex gap-1.5 mt-2">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => handlePresetDays(days)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 rounded-lg text-[11px] font-semibold transition-colors"
                    >
                      +{days} Days
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Beneficiary Wallet Address */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Beneficiary Wallet Address (Optional)
              </label>
              <input
                type="text"
                name="beneficiary"
                placeholder={account ? `${account} (Defaults to your wallet)` : "0x... (Defaults to your wallet)"}
                value={formData.beneficiary}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                The smart contract escrow will disburse the collected funds directly to this beneficiary address upon successful goal completion.
              </p>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Campaign Image URL (Optional)
              </label>
              <input
                type="url"
                name="imageUrl"
                placeholder="https://images.unsplash.com/..."
                value={formData.imageUrl}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />

              {/* Sample Preset Buttons */}
              <div className="mt-3">
                <span className="text-[11px] font-semibold text-gray-400 block mb-1.5">
                  Select Quick Demo Image Preset:
                </span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_IMAGE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          imageUrl: preset.url,
                          category: preset.category,
                        }))
                      }
                      className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-900 rounded-lg text-xs font-medium border border-gray-200 transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-[#14532D] to-[#16A34A] hover:from-[#114224] hover:to-[#15803D] text-white rounded-2xl text-base font-bold shadow-lg shadow-emerald-900/15 hover:shadow-emerald-900/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>
                  {isSubmitting
                    ? "Confirming on Blockchain..."
                    : isConnected
                    ? "Create Campaign on Blockchain"
                    : "Connect MetaMask & Create Campaign"}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Column (1 col) */}
        <div className="space-y-4 lg:sticky lg:top-28">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Live Card Preview
            </h3>
            <span className="text-[11px] text-gray-500 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-semibold">
              Real-Time
            </span>
          </div>
          <CampaignCard campaign={previewCampaign} />
        </div>
      </div>
    </div>
  );
}
