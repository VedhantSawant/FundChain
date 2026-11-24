import React, { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Filter, SlidersHorizontal, PlusCircle, Sprout, BookOpen, HeartPulse, Cpu, Users, Leaf, HelpCircle, Layers } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import CampaignCard from "../components/CampaignCard";

const CATEGORIES = [
  "All",
  "Agriculture",
  "Education",
  "Healthcare",
  "Technology",
  "Community Development",
  "Environment",
  "Other",
];

const STATUSES = ["All", "Active", "Funded", "Successful", "Failed", "Withdrawn"];

export default function Explore() {
  const { campaigns, loadingCampaigns } = useWeb3();
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryParam = searchParams.get("category") || "All";
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // "newest", "progress", "deadline", "goalLow", "goalHigh"

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    if (cat === "All") {
      searchParams.delete("category");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ category: cat });
    }
  };

  // Filter and sort campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => {
        // Search filter
        const matchesSearch =
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase());

        // Category filter
        const matchesCategory =
          selectedCategory === "All" ||
          c.category.toLowerCase() === selectedCategory.toLowerCase();

        // Status filter
        const matchesStatus =
          selectedStatus === "All" ||
          c.status.toLowerCase() === selectedStatus.toLowerCase();

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return b.id - a.id;
        } else if (sortBy === "progress") {
          return b.progressPercent - a.progressPercent;
        } else if (sortBy === "deadline") {
          return a.deadline - b.deadline;
        } else if (sortBy === "goalLow") {
          return parseFloat(a.goal) - parseFloat(b.goal);
        } else if (sortBy === "goalHigh") {
          return parseFloat(b.goal) - parseFloat(a.goal);
        }
        return 0;
      });
  }, [campaigns, searchQuery, selectedCategory, selectedStatus, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Explore All Campaigns
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Browse through active and completed crowdfunding campaigns on the Ethereum smart contract.
          </p>
        </div>

        <Link
          to="/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#14532D] text-white rounded-xl text-sm font-bold shadow-md hover:bg-emerald-800 transition-colors self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Start a Campaign</span>
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-soft space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search campaigns by title, keywords or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-2.5 px-3 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer"
            >
              <option value="newest">Sort by: Newest First</option>
              <option value="progress">Sort by: Funding Progress (%)</option>
              <option value="deadline">Sort by: Deadline (Ending Soonest)</option>
              <option value="goalLow">Sort by: Goal (Low to High)</option>
              <option value="goalHigh">Sort by: Goal (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2">
            Category:
          </span>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-[#14532D] text-white shadow-sm"
                    : "bg-gray-100/80 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2 items-center text-xs">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2">
            Status:
          </span>
          {STATUSES.map((st) => {
            const isSelected = selectedStatus === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold"
                    : "text-gray-600 hover:bg-gray-50 border border-transparent"
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Campaign Grid / Empty States */}
      {loadingCampaigns ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100 p-6 flex flex-col justify-between">
              <div className="h-44 bg-gray-100 rounded-xl mb-4" />
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredCampaigns.length > 0 ? (
        <div>
          <div className="flex justify-between items-center text-xs text-gray-500 mb-6">
            <span>Showing {filteredCampaigns.length} campaigns</span>
            <span>Live on Ethereum Contract</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-16 text-center shadow-soft">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Matching Campaigns</h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
            We couldn't find any campaigns matching your current filters. Try resetting your search or category filter.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSelectedStatus("All");
                setSearchQuery("");
                searchParams.delete("category");
                setSearchParams(searchParams);
              }}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
            >
              Reset Filters
            </button>
            <Link
              to="/create"
              className="px-5 py-2.5 bg-[#14532D] hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
            >
              Create New Campaign
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
