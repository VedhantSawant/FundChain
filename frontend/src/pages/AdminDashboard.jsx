import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Layers,
  Coins,
  Lock,
  Unlock,
  RotateCcw,
  Users,
  History,
  TrendingUp,
  Search,
  Filter,
  ExternalLink,
  Copy,
  Check,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  PlayCircle,
  FastForward,
  Settings,
  CheckCircle2,
  RefreshCw,
  Wallet,
  Bot,
  PieChart,
  BarChart3,
  Scale,
  FileCheck2,
  AlertCircle,
  Eye,
  CheckCircle,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { shortenAddress } from "../blockchain/contract";
import { CONTRACT_ADDRESS, CHAIN_ID, SUPPORTED_NETWORKS } from "../blockchain/config";
import { evaluateCampaignLocally } from "../services/aiFraudDetector";
import ExpiryReleaseDemoModal from "../components/ExpiryReleaseDemoModal";

export default function AdminDashboard() {
  const {
    account,
    availableAccounts = [],
    selectAccount,
    chainId,
    getAccountName,
    adminAddress,
    isAdmin,
    isConnected,
    campaigns,
    loadingCampaigns,
    refreshCampaigns,
    releaseFunds,
    fastForward,
    getPlatformStats,
    getAllContractEvents,
    getAllInteractingUsers,
    getAllDisputes,
    resolveDispute,
    approveMilestone,
    rejectMilestone,
    switchWallet,
    connectWallet,
    txState,
  } = useWeb3();

  // Tabs: overview, campaigns, escrow, users, transactions, ai, disputes, analytics, settings
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedAddress, setCopiedAddress] = useState("");
  const [platformStats, setPlatformStats] = useState(null);
  const [contractEvents, setContractEvents] = useState([]);
  const [interactingUsers, setInteractingUsers] = useState([]);
  const [allDisputes, setAllDisputes] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters & search
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("all");

  // AI Moderation review notes state (persisted in localStorage)
  const [reviewedCampaigns, setReviewedCampaigns] = useState(() => {
    try {
      const stored = localStorage.getItem("fundchain_admin_reviewed_campaigns");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Fast forward state
  const [fastForwardLoading, setFastForwardLoading] = useState(false);
  const [fastForwardSuccess, setFastForwardSuccess] = useState("");
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(""), 2000);
  };

  // Fetch admin stats, events, users, and disputes
  const loadAdminData = async () => {
    setLoadingData(true);
    try {
      const [stats, events, users, disps] = await Promise.all([
        getPlatformStats(),
        getAllContractEvents(),
        getAllInteractingUsers(),
        getAllDisputes ? getAllDisputes() : Promise.resolve([]),
      ]);
      setPlatformStats(stats);
      setContractEvents(Array.isArray(events) ? events : []);
      setInteractingUsers(users ? Array.from(users) : []);
      setAllDisputes(disps ? Array.from(disps) : []);
    } catch (err) {
      console.warn("Error loading admin data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin, campaigns]);

  // Handle fast-forward local time (development Hardhat network only)
  const handleFastForward = async (days) => {
    if ((chainId || CHAIN_ID) !== 31337) {
      alert("Time manipulation is disabled on non-local networks.");
      return;
    }
    setFastForwardLoading(true);
    setFastForwardSuccess("");
    try {
      const seconds = days * 86400;
      await fastForward(seconds);
      await loadAdminData();
      setFastForwardSuccess(`Successfully advanced local blockchain time by ${days} day(s)!`);
      setTimeout(() => setFastForwardSuccess(""), 4000);
    } catch (err) {
      alert("Fast forward failed: " + (err.message || "EVM time error"));
    } finally {
      setFastForwardLoading(false);
    }
  };

  // AI Moderation action
  const handleModerateCampaign = (campaignId, action) => {
    setReviewedCampaigns((prev) => {
      const updated = { ...prev, [campaignId]: action };
      try {
        localStorage.setItem("fundchain_admin_reviewed_campaigns", JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  // Dispute resolution action
  const handleAdminResolveDispute = async (disputeId, inFavorOfDonors) => {
    const notes = window.prompt(
      `Enter resolution justification (${inFavorOfDonors ? "In Favor of Donors" : "In Favor of Creator"}):`,
      inFavorOfDonors ? "Evidence verified invalid; refunded" : "Deliverables verified by auditor"
    );
    if (!notes) return;
    try {
      await resolveDispute(disputeId, inFavorOfDonors, notes);
      await loadAdminData();
      await refreshCampaigns();
    } catch (err) {
      alert("Dispute resolution failed: " + err.message);
    }
  };

  // AI Scan of all campaigns
  const aiEvaluatedCampaigns = useMemo(() => {
    return campaigns.map((c) => {
      const analysis = evaluateCampaignLocally({
        title: c.title,
        description: c.description,
        goal: parseFloat(c.goal || 0),
        category: c.category,
        deadlineDays: Math.max(1, Math.round((c.deadline - c.createdAt) / 86400)),
        existingCampaigns: campaigns.filter((other) => other.id !== c.id),
      });
      return {
        ...c,
        ai: analysis,
        reviewStatus: reviewedCampaigns[c.id] || (analysis.isFlagged ? "Flagged for Review" : "Clear"),
      };
    });
  }, [campaigns, reviewedCampaigns]);

  // User details aggregation
  const userDirectory = useMemo(() => {
    const map = {};

    for (const addr of interactingUsers) {
      const lower = addr.toLowerCase();
      map[lower] = {
        address: addr,
        name: getAccountName(addr),
        totalContributed: 0,
        contributionsCount: 0,
        campaignsCreated: 0,
        totalReceivedAsBeneficiary: 0,
        isCreator: false,
        isContributor: false,
        isBeneficiary: false,
      };
    }

    // Process campaigns
    for (const c of campaigns) {
      const creatorLower = c.creator.toLowerCase();
      if (!map[creatorLower]) {
        map[creatorLower] = {
          address: c.creator,
          name: getAccountName(c.creator),
          totalContributed: 0,
          contributionsCount: 0,
          campaignsCreated: 0,
          totalReceivedAsBeneficiary: 0,
          isCreator: false,
          isContributor: false,
          isBeneficiary: false,
        };
      }
      map[creatorLower].campaignsCreated += 1;
      map[creatorLower].isCreator = true;

      const benLower = c.beneficiary.toLowerCase();
      if (!map[benLower]) {
        map[benLower] = {
          address: c.beneficiary,
          name: getAccountName(c.beneficiary),
          totalContributed: 0,
          contributionsCount: 0,
          campaignsCreated: 0,
          totalReceivedAsBeneficiary: 0,
          isCreator: false,
          isContributor: false,
          isBeneficiary: false,
        };
      }
      map[benLower].isBeneficiary = true;
      if (c.fundsReleased) {
        map[benLower].totalReceivedAsBeneficiary += parseFloat(c.amountRaised || 0);
      }
    }

    // Process events
    for (const e of contractEvents) {
      if (e.type === "ContributionReceived" && e.from) {
        const fromLower = e.from.toLowerCase();
        if (!map[fromLower]) {
          map[fromLower] = {
            address: e.from,
            name: getAccountName(e.from),
            totalContributed: 0,
            contributionsCount: 0,
            campaignsCreated: 0,
            totalReceivedAsBeneficiary: 0,
            isCreator: false,
            isContributor: false,
            isBeneficiary: false,
          };
        }
        map[fromLower].totalContributed += parseFloat(e.amount || 0);
        map[fromLower].contributionsCount += 1;
        map[fromLower].isContributor = true;
      }
    }

    return Object.values(map);
  }, [interactingUsers, campaigns, contractEvents, getAccountName]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(campaignSearch.toLowerCase()) ||
        c.creator.toLowerCase().includes(campaignSearch.toLowerCase()) ||
        c.beneficiary.toLowerCase().includes(campaignSearch.toLowerCase()) ||
        c.category.toLowerCase().includes(campaignSearch.toLowerCase());

      const matchesStatus =
        campaignStatusFilter === "all" ||
        (campaignStatusFilter === "active" && c.status === "Active") ||
        (campaignStatusFilter === "achieved" && c.status === "Goal Achieved") ||
        (campaignStatusFilter === "awaiting" && c.status === "Awaiting Release") ||
        (campaignStatusFilter === "released" && c.status === "Funds Released") ||
        (campaignStatusFilter === "refund" && c.status === "Refund Available") ||
        (campaignStatusFilter === "refunded" && c.status === "Refunded");

      return matchesSearch && matchesStatus;
    });
  }, [campaigns, campaignSearch, campaignStatusFilter]);

  // Status breakdown
  const statusCounts = useMemo(() => {
    const counts = {
      Active: 0,
      GoalAchieved: 0,
      AwaitingRelease: 0,
      FundsReleased: 0,
      RefundAvailable: 0,
      Refunded: 0,
    };
    for (const c of campaigns) {
      if (c.status === "Funds Released") counts.FundsReleased++;
      else if (c.status === "Awaiting Release") counts.AwaitingRelease++;
      else if (c.status === "Goal Achieved") counts.GoalAchieved++;
      else if (c.status === "Refund Available") counts.RefundAvailable++;
      else if (c.status === "Refunded") counts.Refunded++;
      else counts.Active++;
    }
    return counts;
  }, [campaigns]);

  // Category breakdown for analytics
  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const c of campaigns) {
      counts[c.category] = (counts[c.category] || 0) + 1;
    }
    return counts;
  }, [campaigns]);

  // AI Risk distribution for analytics
  const aiRiskCounts = useMemo(() => {
    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    for (const c of aiEvaluatedCampaigns) {
      counts[c.ai.riskLevel] = (counts[c.ai.riskLevel] || 0) + 1;
    }
    return counts;
  }, [aiEvaluatedCampaigns]);

  // Calculated totals
  const totalEscrowLocked = platformStats ? platformStats.totalEscrowLocked : "0.0";
  const totalReleased = platformStats ? platformStats.totalReleased : "0.0";
  const totalRefunded = platformStats ? platformStats.totalRefunded : "0.0";
  const totalContributions = platformStats ? platformStats.totalContributions : "0.0";

  // Capital settlement proportions for analytics chart
  const capitalTotal =
    parseFloat(totalEscrowLocked || 0) +
    parseFloat(totalReleased || 0) +
    parseFloat(totalRefunded || 0);
  const escrowPct = capitalTotal > 0 ? Math.round((parseFloat(totalEscrowLocked) / capitalTotal) * 100) : 0;
  const releasedPct = capitalTotal > 0 ? Math.round((parseFloat(totalReleased) / capitalTotal) * 100) : 0;
  const refundedPct = capitalTotal > 0 ? Math.round((parseFloat(totalRefunded) / capitalTotal) * 100) : 0;

  // Contributions over time derived from on-chain events
  const contributionTimeline = useMemo(() => {
    const contribs = contractEvents
      .filter((e) => e.type === "ContributionReceived")
      .slice()
      .reverse();
    const maxAmt = contribs.reduce((m, e) => Math.max(m, parseFloat(e.amount || 0)), 0) || 1;
    return contribs.slice(-8).map((e, idx) => ({
      id: idx,
      campaignId: e.campaignId,
      amount: parseFloat(e.amount || 0),
      pct: Math.max(8, Math.round((parseFloat(e.amount || 0) / maxAmt) * 100)),
      label: `#${e.campaignId} · ${shortenAddress(e.from)}`,
      date: new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));
  }, [contractEvents]);

  const handleSwitchToAdmin = async () => {
    try {
      const targetAdmin = (adminAddress || "").toLowerCase();
      if (targetAdmin && availableAccounts.some((a) => a.toLowerCase() === targetAdmin)) {
        const match = availableAccounts.find((a) => a.toLowerCase() === targetAdmin);
        await selectAccount(match);
      } else {
        await switchWallet();
      }
    } catch (err) {
      console.warn("Switch to admin wallet failed:", err);
    }
  };

  // Access denied guard
  if (!isConnected || !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-rose-100 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

          <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-600 ring-8 ring-rose-50/50">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
            Restricted Administrator Access
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-lg mx-auto mb-8">
            The FundChain Admin Dashboard provides privileged on-chain monitoring, AI fraud detection oversight, and escrow arbitration. Your currently connected wallet is not authorized as the contract administrator.
          </p>

          <div className="bg-gray-50 rounded-2xl p-5 max-w-lg mx-auto text-left space-y-3 border border-gray-200/80 mb-8 font-mono text-xs">
            <div>
              <span className="text-gray-500 block font-sans font-semibold mb-1">
                Connected Wallet:
              </span>
              <span className="text-gray-800 break-all bg-white p-2 rounded-lg border border-gray-200 block">
                {account ? `${account} (${getAccountName(account)})` : "No wallet connected"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block font-sans font-semibold mb-1">
                Designated Admin Address:
              </span>
              <span className="text-emerald-700 font-bold break-all bg-emerald-50/60 p-2 rounded-lg border border-emerald-100 block">
                {adminAddress ? adminAddress : "Loading on-chain admin..."}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isConnected ? (
              <button
                onClick={handleSwitchToAdmin}
                className="w-full sm:w-auto px-6 py-3 bg-[#14532D] hover:bg-[#0f3e21] text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>Switch to Admin Wallet</span>
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="w-full sm:w-auto px-6 py-3 bg-[#14532D] hover:bg-[#0f3e21] text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect MetaMask</span>
              </button>
            )}
            <Link
              to="/explore"
              className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all"
            >
              Back to Explore
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const network = SUPPORTED_NETWORKS[chainId || CHAIN_ID];
  const explorerUrl = network?.blockExplorer;
  const isLocalDevNetwork = (chainId || CHAIN_ID) === 31337;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Admin Header Banner */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full w-fit">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>FundChain 3.0 · Protocol Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Administrator Control Console
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-gray-600">
            <span>Admin Wallet: <strong>{shortenAddress(account)}</strong></span>
            <button
              onClick={() => handleCopy(account)}
              className="text-gray-400 hover:text-emerald-700 p-1"
              title="Copy"
            >
              {copiedAddress === account ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="text-gray-300">|</span>
            <span className="text-emerald-700 font-sans font-bold bg-emerald-50 px-2 py-0.5 rounded">
              Contract Verified On-Chain
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => loadAdminData()}
            className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Refresh on-chain data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
            <span>Sync Chain</span>
          </button>
          <button
            onClick={() => setDemoModalOpen(true)}
            disabled={!isLocalDevNetwork}
            className="px-4 py-2.5 bg-gradient-to-r from-[#D4A017] to-amber-600 hover:opacity-95 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            title={
              isLocalDevNetwork
                ? "Demonstrate 7-day campaign expiry and on-chain escrow release"
                : "Development demo disabled on non-local networks"
            }
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Simulate Campaign Expiry & Release Funds</span>
          </button>
          <button
            onClick={() => handleFastForward(7)}
            disabled={fastForwardLoading || !isLocalDevNetwork}
            className="px-4 py-2.5 bg-[#14532D] hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            title={
              isLocalDevNetwork
                ? "Advance local EVM by 7 days for deadline testing"
                : "Disabled on production/non-local networks"
            }
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Fast-Forward +7d</span>
          </button>
        </div>
      </div>

      {fastForwardSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 animate-fade-in font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{fastForwardSuccess}</span>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-gray-200 bg-white rounded-2xl p-1.5 shadow-soft overflow-x-auto text-xs font-bold">
        {[
          { id: "overview", label: "Overview & Metrics", icon: Layers },
          { id: "campaigns", label: `Campaigns (${campaigns.length})`, icon: Coins },
          { id: "escrow", label: "Escrow Vault", icon: Lock },
          { id: "users", label: `User Directory (${interactingUsers.length})`, icon: Users },
          { id: "transactions", label: `Tx Logs (${contractEvents.length})`, icon: History },
          { id: "ai", label: `AI Fraud Engine (${aiEvaluatedCampaigns.length})`, icon: Bot },
          { id: "disputes", label: `Disputes (${allDisputes.length})`, icon: Scale },
          { id: "analytics", label: "Visual Analytics", icon: BarChart3 },
          { id: "settings", label: "Settings & Dev Tools", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#14532D] text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: OVERVIEW ==================== */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-fade-in">
          {/* Top Macro Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-soft space-y-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Locked in Escrow
              </span>
              <p className="text-2xl font-black text-emerald-700">
                {totalEscrowLocked} <span className="text-xs text-gray-500 font-normal">ETH</span>
              </p>
              <span className="text-[11px] text-gray-500">Held in contract bytecode</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-soft space-y-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Total All-Time Contributions
              </span>
              <p className="text-2xl font-black text-gray-900">
                {totalContributions} <span className="text-xs text-gray-500 font-normal">ETH</span>
              </p>
              <span className="text-[11px] text-gray-500">Across {campaigns.length} campaigns</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-soft space-y-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Released to Beneficiaries
              </span>
              <p className="text-2xl font-black text-teal-700">
                {totalReleased} <span className="text-xs text-gray-500 font-normal">ETH</span>
              </p>
              <span className="text-[11px] text-teal-600 font-medium">Successfully disbursed</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-soft space-y-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Refunds Claimed
              </span>
              <p className="text-2xl font-black text-amber-700">
                {totalRefunded} <span className="text-xs text-gray-500 font-normal">ETH</span>
              </p>
              <span className="text-[11px] text-amber-600 font-medium">100% contributor protection</span>
            </div>
          </div>

          {/* Status Breakdown & Live Charts Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 p-6 shadow-soft space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                <span>Campaign State Lifecycle Distribution</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-700 uppercase">Active</span>
                  <p className="text-xl font-black text-blue-900">{statusCounts.Active}</p>
                </div>
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Goal Reached</span>
                  <p className="text-xl font-black text-emerald-900">{statusCounts.GoalAchieved}</p>
                </div>
                <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">Awaiting Release</span>
                  <p className="text-xl font-black text-indigo-900">{statusCounts.AwaitingRelease}</p>
                </div>
                <div className="p-3.5 bg-teal-50/60 rounded-xl border border-teal-100">
                  <span className="text-[10px] font-bold text-teal-700 uppercase">Funds Released</span>
                  <p className="text-xl font-black text-teal-900">{statusCounts.FundsReleased}</p>
                </div>
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Refund Available</span>
                  <p className="text-xl font-black text-amber-900">{statusCounts.RefundAvailable}</p>
                </div>
                <div className="p-3.5 bg-gray-100 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-600 uppercase">Refunded</span>
                  <p className="text-xl font-black text-gray-800">{statusCounts.Refunded}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-soft space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-600" />
                <span>AI Risk Distribution</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-emerald-700">Low Risk (Authentic)</span>
                    <span>{aiRiskCounts.LOW} campaigns</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full"
                      style={{
                        width: `${(aiRiskCounts.LOW / (campaigns.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-amber-700">Medium Risk (Review)</span>
                    <span>{aiRiskCounts.MEDIUM} campaigns</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full"
                      style={{
                        width: `${(aiRiskCounts.MEDIUM / (campaigns.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-rose-700">High Risk (Flagged)</span>
                    <span>{aiRiskCounts.HIGH} campaigns</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-600 h-full"
                      style={{
                        width: `${(aiRiskCounts.HIGH / (campaigns.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setActiveTab("ai")}
                    className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>View AI Risk Inspector</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: CAMPAIGNS ==================== */}
      {activeTab === "campaigns" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-soft space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns by title, creator, or beneficiary..."
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <select
              value={campaignStatusFilter}
              onChange={(e) => setCampaignStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
            >
              <option value="all">All Campaign Statuses</option>
              <option value="active">Active Only</option>
              <option value="achieved">Goal Achieved</option>
              <option value="awaiting">Awaiting Release</option>
              <option value="released">Funds Released</option>
              <option value="refund">Refund Available</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">ID & Title</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Creator / Beneficiary</th>
                  <th className="pb-3">Raised / Goal</th>
                  <th className="pb-3">Escrow Balance</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 font-bold text-gray-900 max-w-[200px] truncate">
                      <Link to={`/campaign/${c.id}`} className="hover:text-emerald-700">
                        #{c.id} · {c.title}
                      </Link>
                    </td>
                    <td className="py-3.5 text-gray-600">{c.category}</td>
                    <td className="py-3.5 font-mono text-[11px] text-gray-600">
                      <div>Creator: {shortenAddress(c.creator)}</div>
                      <div className="text-teal-700">Beneficiary: {shortenAddress(c.beneficiary)}</div>
                    </td>
                    <td className="py-3.5 font-semibold text-gray-900">
                      {c.amountRaised} / {c.goal} ETH
                    </td>
                    <td className="py-3.5 font-extrabold text-emerald-700">
                      {c.escrowBalance} ETH
                    </td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-gray-100 text-gray-700">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      {c.canReleaseFunds ? (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Release ${c.amountRaised} ETH to beneficiary?`)) {
                              await releaseFunds(c.id);
                              await loadAdminData();
                            }
                          }}
                          className="px-2.5 py-1 bg-[#14532D] text-white rounded-lg font-bold text-[11px] hover:bg-emerald-800"
                        >
                          Release
                        </button>
                      ) : (
                        <Link to={`/campaign/${c.id}`} className="text-emerald-700 font-bold hover:underline">
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: ESCROW VAULT ==================== */}
      {activeTab === "escrow" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-soft space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Smart Contract Escrow Vault Management
            </h3>
            <p className="text-xs text-gray-500">
              All contributor ETH is strictly held in the contract bytecode escrow balance until on-chain invariants are met.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-xs text-gray-500 font-bold block">Aggregated Vault Escrow</span>
              <span className="text-2xl font-black text-emerald-800">{totalEscrowLocked} ETH</span>
            </div>
            <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
              <span className="text-xs text-gray-500 font-bold block">Total Disbursed to Beneficiaries</span>
              <span className="text-2xl font-black text-teal-800">{totalReleased} ETH</span>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <span className="text-xs text-gray-500 font-bold block">Total Refunds Returned</span>
              <span className="text-2xl font-black text-amber-800">{totalRefunded} ETH</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-sm text-gray-800">Campaign Escrow Vault Breakdown</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 font-bold text-gray-400 uppercase">
                    <th className="pb-3">Campaign</th>
                    <th className="pb-3">Escrow Balance</th>
                    <th className="pb-3">Total Released</th>
                    <th className="pb-3">Total Refunded</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 font-semibold text-gray-900">
                        #{c.id} · {c.title}
                      </td>
                      <td className="py-3 font-extrabold text-emerald-700">{c.escrowBalance} ETH</td>
                      <td className="py-3 font-bold text-teal-700">{c.totalReleased} ETH</td>
                      <td className="py-3 font-bold text-amber-700">{c.totalRefunded} ETH</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-gray-100 text-gray-700">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: USERS ==================== */}
      {activeTab === "users" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-soft space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                User & Wallet Management
              </h3>
              <p className="text-xs text-gray-500">
                All interacting Ethereum addresses verified on the blockchain ledger.
              </p>
            </div>
            <div className="relative max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search user..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 font-bold text-gray-400 uppercase">
                  <th className="pb-3">User & Label</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Campaigns Launched</th>
                  <th className="pb-3">Total ETH Contributed</th>
                  <th className="pb-3">Beneficiary Payouts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {userDirectory
                  .filter((u) => u.address.toLowerCase().includes(userSearch.toLowerCase()) || u.name.toLowerCase().includes(userSearch.toLowerCase()))
                  .map((u) => (
                    <tr key={u.address} className="hover:bg-gray-50/50">
                      <td className="py-3">
                        <div className="font-bold text-gray-900 text-xs">{u.name}</div>
                        <div className="font-mono text-gray-500 text-[11px]">{shortenAddress(u.address)}</div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {u.address.toLowerCase() === adminAddress?.toLowerCase()
                            ? "Protocol Admin"
                            : u.isCreator
                            ? "Creator"
                            : u.isContributor
                            ? "Donor / Backer"
                            : "Vault Depositor"}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-gray-900">{u.campaignsCreated}</td>
                      <td className="py-3 font-extrabold text-emerald-700">{u.totalContributed.toFixed(3)} ETH</td>
                      <td className="py-3 font-bold text-teal-700">{u.totalReceivedAsBeneficiary.toFixed(3)} ETH</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: TRANSACTIONS ==================== */}
      {activeTab === "transactions" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-soft space-y-4 animate-fade-in">
          <h3 className="text-lg font-bold text-gray-900">
            Smart Contract Verified Event Ledger
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 font-bold text-gray-400 uppercase">
                  <th className="pb-3">Event Type</th>
                  <th className="pb-3">Campaign</th>
                  <th className="pb-3">From / By</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3 text-right">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {contractEvents.map((e, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded font-bold font-sans text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100">
                        {e.type}
                      </span>
                    </td>
                    <td className="py-2.5 font-sans font-bold text-gray-900">
                      {e.campaignId ? `#${e.campaignId}` : "Protocol"}
                    </td>
                    <td className="py-2.5 text-gray-600">{shortenAddress(e.from || e.to)}</td>
                    <td className="py-2.5 font-extrabold text-emerald-700">{e.amount ? `${e.amount} ETH` : "-"}</td>
                    <td className="py-2.5 text-right text-gray-500">
                      {explorerUrl ? (
                        <a
                          href={`${explorerUrl}/tx/${e.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline"
                        >
                          {shortenAddress(e.txHash)}
                        </a>
                      ) : (
                        <span>{shortenAddress(e.txHash)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 6: AI FRAUD DETECTION ==================== */}
      {activeTab === "ai" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-soft space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-600" />
              <span>AI Campaign Fraud Detection & NLP Risk Inspector</span>
            </h3>
            <p className="text-xs text-gray-500">
              Natural Language Processing, TF-IDF cosine duplicate analysis, and outlier detection identify high-risk fundraising patterns for human review.
            </p>
          </div>

          <div className="space-y-4">
            {aiEvaluatedCampaigns.map((c) => (
              <div
                key={c.id}
                className={`p-5 rounded-2xl border transition-all ${
                  c.ai.riskLevel === "HIGH"
                    ? "bg-rose-50/40 border-rose-200"
                    : c.ai.riskLevel === "MEDIUM"
                    ? "bg-amber-50/40 border-amber-200"
                    : "bg-emerald-50/30 border-emerald-100"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900">
                      #{c.id} · {c.title}
                    </h4>
                    <span className="text-[11px] text-gray-500 font-mono">
                      Creator: {shortenAddress(c.creator)} ({getAccountName(c.creator)}) · Goal: {c.goal} ETH
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        c.ai.riskLevel === "HIGH"
                          ? "bg-rose-200 text-rose-900"
                          : c.ai.riskLevel === "MEDIUM"
                          ? "bg-amber-200 text-amber-900"
                          : "bg-emerald-200 text-emerald-900"
                      }`}
                    >
                      Risk Score: {c.ai.riskScore}/100 ({c.ai.riskLevel} RISK)
                    </span>
                    <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-md border border-gray-200 text-gray-700">
                      Status: {c.reviewStatus}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-700 mb-3 bg-white/70 p-3 rounded-xl border border-gray-100">
                  <span className="font-bold text-gray-900 block text-[11px]">Explainable Warning Indicators:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {c.ai.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Moderation Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200/60 text-xs">
                  <button
                    onClick={() => handleModerateCampaign(c.id, "Verified by Admin")}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Mark Verified / Reviewed
                  </button>
                  <button
                    onClick={() => handleModerateCampaign(c.id, "Under Audit Investigation")}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Flag for Investigation
                  </button>
                  <button
                    onClick={() => handleModerateCampaign(c.id, "Requested Additional Evidence")}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg cursor-pointer"
                  >
                    Request Additional Proof
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB 7: DISPUTES ==================== */}
      {activeTab === "disputes" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-soft space-y-5 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              <span>Smart Contract Dispute Arbitration</span>
            </h3>
            <p className="text-xs text-gray-500">
              When a dispute is raised, milestone escrow disbursements are paused by contract rules until the protocol administrator delivers a verdict.
            </p>
          </div>

          {allDisputes.length > 0 ? (
            <div className="space-y-4">
              {allDisputes.map((d) => (
                <div key={d.id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">
                        Dispute #{d.id} against Campaign #{d.campaignId} (Milestone #{d.milestoneIndex + 1})
                      </h4>
                      <span className="text-gray-500 font-mono text-[11px]">
                        Complainant: {shortenAddress(d.complainant)} ({getAccountName(d.complainant)})
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                        d.resolved
                          ? d.inFavorOfDonors
                            ? "bg-rose-100 text-rose-900"
                            : "bg-emerald-100 text-emerald-900"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {d.resolved ? (d.inFavorOfDonors ? "Upheld (In Favor of Donors)" : "Dismissed (In Favor of Creator)") : "Active Investigation"}
                    </span>
                  </div>

                  <p className="p-3 bg-white rounded-xl border border-gray-100 text-gray-700">
                    <strong>Complaint:</strong> {d.reason}
                  </p>

                  {d.evidenceUrl && (
                    <div className="p-2 bg-white rounded-lg border border-gray-200 font-mono text-[11px]">
                      Evidence Link: <a href={d.evidenceUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">{d.evidenceUrl}</a>
                    </div>
                  )}

                  {!d.resolved && (
                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => handleAdminResolveDispute(d.id, true)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer"
                      >
                        Resolve In Favor of Donors (Enable Refund)
                      </button>
                      <button
                        onClick={() => handleAdminResolveDispute(d.id, false)}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer"
                      >
                        Dismiss & Resume Releases (In Favor of Creator)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              No active or historical disputes recorded across the platform.
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 8: VISUAL ANALYTICS ==================== */}
      {activeTab === "analytics" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-soft space-y-8 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>Executive On-Chain Analytics & Charts</span>
            </h3>
            <p className="text-xs text-gray-500">
              Verifiable data derived in real time from smart contract state and emitted blockchain logs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart 1: Status Distribution */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4">
              <h4 className="font-bold text-sm text-gray-900">1. Campaign Status Distribution</h4>
              <div className="space-y-2 text-xs">
                {Object.entries(statusCounts).map(([k, v]) => {
                  const pct = Math.round((v / (campaigns.length || 1)) * 100);
                  return (
                    <div key={k}>
                      <div className="flex justify-between font-medium mb-1">
                        <span>{k}</span>
                        <span className="font-bold text-gray-900">{v} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#14532D] h-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: ETH Locked vs Released vs Refunded */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4">
              <h4 className="font-bold text-sm text-gray-900">2. Capital Settlement Breakdown</h4>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-emerald-700 font-bold">Locked in Escrow</span>
                    <span className="font-bold">{totalEscrowLocked} ETH ({escrowPct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full transition-all" style={{ width: `${escrowPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-teal-700 font-bold">Released to Beneficiaries</span>
                    <span className="font-bold">{totalReleased} ETH ({releasedPct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-teal-600 h-full transition-all" style={{ width: `${releasedPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-amber-700 font-bold">Refunded to Donors</span>
                    <span className="font-bold">{totalRefunded} ETH ({refundedPct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full transition-all" style={{ width: `${refundedPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 3: Category Distribution */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4">
              <h4 className="font-bold text-sm text-gray-900">3. Campaign Category Distribution</h4>
              <div className="space-y-2 text-xs">
                {Object.entries(categoryCounts).map(([cat, count]) => {
                  const pct = Math.round((count / (campaigns.length || 1)) * 100);
                  return (
                    <div key={cat}>
                      <div className="flex justify-between font-medium mb-1">
                        <span>{cat}</span>
                        <span className="font-bold text-gray-900">{count} campaigns ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-700 h-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 4: AI Risk Score Distribution */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4">
              <h4 className="font-bold text-sm text-gray-900">4. AI Fraud Risk Score Bands</h4>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-emerald-700 font-bold">Low Risk (&lt; 35 Score)</span>
                    <span className="font-bold text-gray-900">{aiRiskCounts.LOW} campaigns</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full" style={{ width: `${(aiRiskCounts.LOW / (campaigns.length || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-amber-700 font-bold">Medium Risk (35-70 Score)</span>
                    <span className="font-bold text-gray-900">{aiRiskCounts.MEDIUM} campaigns</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${(aiRiskCounts.MEDIUM / (campaigns.length || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-rose-700 font-bold">High Risk (&gt; 70 Score)</span>
                    <span className="font-bold text-gray-900">{aiRiskCounts.HIGH} campaigns</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-rose-600 h-full" style={{ width: `${(aiRiskCounts.HIGH / (campaigns.length || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 5: On-Chain Contributions Over Time */}
            <div className="lg:col-span-2 p-5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-gray-900">5. On-Chain Contributions Timeline</h4>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {contributionTimeline.length} recent verified event(s)
                </span>
              </div>
              {contributionTimeline.length > 0 ? (
                <div className="flex items-end gap-3 h-40 pt-4 px-2 bg-white rounded-xl border border-gray-100">
                  {contributionTimeline.map((item) => (
                    <div key={item.id} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group">
                      <span className="text-[10px] font-bold text-emerald-800 opacity-90">
                        {item.amount} ETH
                      </span>
                      <div
                        className="w-full max-w-[44px] bg-gradient-to-t from-[#14532D] to-[#16A34A] rounded-t-lg transition-all group-hover:opacity-90"
                        style={{ height: `${item.pct}%` }}
                        title={`${item.label} (${item.amount} ETH at ${item.date})`}
                      />
                      <span className="text-[10px] text-gray-500 font-mono truncate max-w-full pb-1">
                        #{item.campaignId}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                  No on-chain contribution events recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 9: SETTINGS & DEV TOOLS ==================== */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-soft space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Smart Contract Settings & EVM Simulator
            </h3>
            <p className="text-xs text-gray-500">
              Technical on-chain addresses and local development tools for testing deadlines.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 font-mono text-xs space-y-3">
            <div>
              <span className="text-gray-400 block uppercase tracking-wider text-[10px]">Smart Contract Address:</span>
              <span className="font-bold text-gray-900 break-all">{CONTRACT_ADDRESS}</span>
            </div>
            <div>
              <span className="text-gray-400 block uppercase tracking-wider text-[10px]">Protocol Admin Wallet:</span>
              <span className="font-bold text-emerald-800 break-all">{adminAddress}</span>
            </div>
            <div>
              <span className="text-gray-400 block uppercase tracking-wider text-[10px]">Network Target:</span>
              <span className="font-bold text-gray-900">{network?.name || `Chain ID ${chainId}`}</span>
            </div>
          </div>

          <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3">
            <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
              <FastForward className="w-4 h-4 text-emerald-700" />
              <span>Local EVM Time Fast-Forward Tool</span>
            </h4>
            <p className="text-xs text-gray-600">
              Advances the block timestamp on the local node via <code className="bg-white px-1.5 py-0.5 rounded font-mono">evm_increaseTime</code> so you can instantly demonstrate campaign deadlines passing.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                { label: "+1 Hour", days: 1 / 24 },
                { label: "+1 Day", days: 1 },
                { label: "+7 Days", days: 7 },
                { label: "+14 Days", days: 14 },
                { label: "+30 Days", days: 30 },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => handleFastForward(btn.days)}
                  disabled={fastForwardLoading || !isLocalDevNetwork}
                  className="px-3.5 py-2 bg-white border border-gray-300 hover:border-emerald-600 disabled:opacity-50 text-gray-800 rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-50 transition-all cursor-pointer"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Campaign Expiry & Escrow Release Demo Modal */}
      <ExpiryReleaseDemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onCompleted={loadAdminData}
      />
    </div>
  );
}
