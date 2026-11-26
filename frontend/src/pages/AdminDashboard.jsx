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
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { shortenAddress } from "../blockchain/contract";
import { CONTRACT_ADDRESS, CHAIN_ID, SUPPORTED_NETWORKS } from "../blockchain/config";

export default function AdminDashboard() {
  const {
    account,
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
    switchWallet,
    connectWallet,
    txState,
  } = useWeb3();

  const [activeTab, setActiveTab] = useState("overview"); // overview, campaigns, escrow, users, transactions, settings
  const [copiedAddress, setCopiedAddress] = useState("");
  const [platformStats, setPlatformStats] = useState(null);
  const [contractEvents, setContractEvents] = useState([]);
  const [interactingUsers, setInteractingUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters & search
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("all");

  // Fast forward state
  const [fastForwardLoading, setFastForwardLoading] = useState(false);
  const [fastForwardSuccess, setFastForwardSuccess] = useState("");

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(""), 2000);
  };

  // Fetch admin stats, events, and users
  const loadAdminData = async () => {
    setLoadingData(true);
    try {
      const [stats, events, users] = await Promise.all([
        getPlatformStats(),
        getAllContractEvents(),
        getAllInteractingUsers(),
      ]);
      setPlatformStats(stats);
      setContractEvents(events);
      setInteractingUsers(users);
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

  // Handle fast-forward local time
  const handleFastForward = async (days) => {
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

  // Handle manual release of funds from admin dashboard
  const handleReleaseEscrow = async (campaignId) => {
    try {
      await releaseFunds(campaignId);
      await loadAdminData();
    } catch (err) {
      console.error("Release error:", err);
    }
  };

  // User activity mapping based on events and campaigns
  const userMetrics = useMemo(() => {
    const map = {};

    // Ensure all interacting users are initialized
    for (const u of interactingUsers) {
      const lower = u.toLowerCase();
      map[lower] = {
        address: u,
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
  }, [interactingUsers, campaigns, contractEvents]);

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
        c.status.toLowerCase() === campaignStatusFilter.toLowerCase() ||
        (campaignStatusFilter === "awaiting" && c.canReleaseFunds);

      return matchesSearch && matchesStatus;
    });
  }, [campaigns, campaignSearch, campaignStatusFilter]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return userMetrics.filter((u) =>
      u.address.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [userMetrics, userSearch]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return contractEvents.filter((e) => {
      if (txTypeFilter === "all") return true;
      return e.type.toLowerCase() === txTypeFilter.toLowerCase();
    });
  }, [contractEvents, txTypeFilter]);

  // Aggregated campaign status counts for charts
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

  // Calculated totals
  const totalEscrowLocked = platformStats ? platformStats.totalEscrowLocked : "0.0";
  const totalReleased = platformStats ? platformStats.totalReleased : "0.0";
  const totalRefunded = platformStats ? platformStats.totalRefunded : "0.0";
  const totalContributions = platformStats ? platformStats.totalContributions : "0.0";

  // If user is not admin or not connected
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
            The FundChain Admin Dashboard provides privileged on-chain monitoring and escrow settlement oversight. Your currently connected wallet is not authorized as the contract administrator.
          </p>

          {/* Account Comparison Card */}
          <div className="bg-gray-50 rounded-2xl p-5 max-w-lg mx-auto text-left space-y-3 border border-gray-200/80 mb-8 font-mono text-xs">
            <div>
              <span className="text-gray-500 block font-sans font-semibold mb-1">
                Connected Wallet:
              </span>
              <span className="text-gray-800 break-all bg-white p-2 rounded-lg border border-gray-200 block">
                {account ? account : "No wallet connected"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block font-sans font-semibold mb-1">
                Authorized Admin Address:
              </span>
              <span className="text-emerald-700 font-bold break-all bg-emerald-50/60 p-2 rounded-lg border border-emerald-100 block">
                {adminAddress ? adminAddress : "Loading on-chain admin..."}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isConnected ? (
              <button
                onClick={switchWallet}
                className="w-full sm:w-auto px-6 py-3 bg-[#14532D] hover:bg-[#0f3e21] text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
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
              to="/"
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-sm border border-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Admin Header */}
      <div className="bg-gradient-to-br from-[#14532D] via-[#166534] to-[#15803D] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                Administrator Console
              </span>
              <span className="text-emerald-200 text-xs font-medium">
                Smart Contract Escrow Monitor
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              FundChain Protocol Governance
            </h1>
            <p className="text-emerald-100/90 text-sm max-w-2xl">
              Real-time oversight of smart contract escrow balances, campaign conditions, automated beneficiary fund releases, and contributor refund verification.
            </p>
          </div>

          {/* Quick Admin Wallet & Refresh */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <Shield className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <p className="text-[11px] text-emerald-200 font-semibold uppercase tracking-wider">
                  Admin Wallet
                </p>
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-white">
                  <span>{shortenAddress(account)}</span>
                  <button
                    onClick={() => handleCopy(account)}
                    className="hover:text-emerald-300 transition-colors"
                  >
                    {copiedAddress === account ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                refreshCampaigns();
                loadAdminData();
              }}
              className="p-3 bg-white/15 hover:bg-white/25 rounded-2xl text-white transition-all self-stretch sm:self-auto flex items-center justify-center"
              title="Refresh blockchain data"
            >
              <RefreshCw className={`w-5 h-5 ${loadingData ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Dedicated Escrow Security Notice */}
        <div className="mt-6 pt-5 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-emerald-100/80 gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>
              <strong>Escrow Custody:</strong> All donor funds are locked in the autonomous Smart Contract ({shortenAddress(CONTRACT_ADDRESS)}). The admin cannot arbitrarily withdraw or transfer donor funds.
            </span>
          </div>
          <button
            onClick={() => handleCopy(CONTRACT_ADDRESS)}
            className="flex items-center gap-1.5 text-white hover:text-emerald-200 font-mono underline shrink-0 font-medium"
          >
            <span>Contract: {shortenAddress(CONTRACT_ADDRESS)}</span>
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px">
          {[
            { id: "overview", label: "Overview", icon: Layers },
            { id: "campaigns", label: `Campaigns (${campaigns.length})`, icon: TrendingUp },
            { id: "escrow", label: "Escrow Monitoring", icon: Lock },
            { id: "users", label: `Wallets (${interactingUsers.length})`, icon: Users },
            { id: "transactions", label: `Transactions (${contractEvents.length})`, icon: History },
            { id: "settings", label: "Settings & Dev Tools", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-gray-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-fade-in">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
              <div className="flex justify-between items-center text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <span>Total Campaigns</span>
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{campaigns.length}</p>
              <p className="text-xs text-gray-500">
                {statusCounts.Active} Active &bull; {statusCounts.FundsReleased} Released
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
              <div className="flex justify-between items-center text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <span>ETH in Escrow</span>
                <Lock className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-800">{totalEscrowLocked} ETH</p>
              <p className="text-xs text-emerald-600 font-medium">Secured in smart contract</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
              <div className="flex justify-between items-center text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <span>Funds Released</span>
                <Unlock className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-3xl font-extrabold text-teal-800">{totalReleased} ETH</p>
              <p className="text-xs text-teal-600 font-medium">Paid out to beneficiaries</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
              <div className="flex justify-between items-center text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <span>Funds Refunded</span>
                <RotateCcw className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-3xl font-extrabold text-amber-800">{totalRefunded} ETH</p>
              <p className="text-xs text-amber-600 font-medium">Returned to donors</p>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-800 font-medium">Cumulative Contributed</p>
                <p className="text-xl font-bold text-emerald-950">{totalContributions} ETH</p>
              </div>
              <Coins className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-800 font-medium">Interacting Wallets</p>
                <p className="text-xl font-bold text-blue-950">{interactingUsers.length} Unique</p>
              </div>
              <Users className="w-6 h-6 text-blue-600" />
            </div>

            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-800 font-medium">On-Chain Protocol Events</p>
                <p className="text-xl font-bold text-purple-950">{contractEvents.length} Recorded</p>
              </div>
              <History className="w-6 h-6 text-purple-600" />
            </div>
          </div>

          {/* Charts & Visual Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Escrow Distribution Chart */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-base text-gray-900">
                  Escrow Capital Allocation
                </h3>
                <span className="text-xs text-gray-500 font-medium">Live On-Chain Balance</span>
              </div>

              {/* Visual Segment Bar */}
              {parseFloat(totalContributions) > 0 ? (
                <div className="space-y-4">
                  <div className="h-6 w-full bg-gray-100 rounded-xl overflow-hidden flex shadow-inner">
                    <div
                      style={{
                        width: `${Math.max(
                          2,
                          (parseFloat(totalEscrowLocked) / Math.max(0.0001, parseFloat(totalContributions))) * 100
                        )}%`,
                      }}
                      className="bg-emerald-600 h-full transition-all"
                      title={`Locked in Escrow: ${totalEscrowLocked} ETH`}
                    />
                    <div
                      style={{
                        width: `${Math.max(
                          2,
                          (parseFloat(totalReleased) / Math.max(0.0001, parseFloat(totalContributions))) * 100
                        )}%`,
                      }}
                      className="bg-teal-500 h-full transition-all"
                      title={`Released: ${totalReleased} ETH`}
                    />
                    <div
                      style={{
                        width: `${Math.max(
                          2,
                          (parseFloat(totalRefunded) / Math.max(0.0001, parseFloat(totalContributions))) * 100
                        )}%`,
                      }}
                      className="bg-amber-500 h-full transition-all"
                      title={`Refunded: ${totalRefunded} ETH`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="border-l-3 border-emerald-600 pl-3">
                      <p className="text-gray-500">Locked in Escrow</p>
                      <p className="font-bold text-gray-900">{totalEscrowLocked} ETH</p>
                    </div>
                    <div className="border-l-3 border-teal-500 pl-3">
                      <p className="text-gray-500">Released to Beneficiaries</p>
                      <p className="font-bold text-gray-900">{totalReleased} ETH</p>
                    </div>
                    <div className="border-l-3 border-amber-500 pl-3">
                      <p className="text-gray-500">Refunded to Donors</p>
                      <p className="font-bold text-gray-900">{totalRefunded} ETH</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No contributions recorded yet. Escrow capital allocation will render here.
                </div>
              )}
            </div>

            {/* Campaign Status Distribution */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-base text-gray-900">
                  Campaign Status Lifecycle
                </h3>
                <span className="text-xs text-gray-500 font-medium">
                  {campaigns.length} Total Campaigns
                </span>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                {[
                  { label: "Active (Accepting Contributions)", count: statusCounts.Active, color: "bg-blue-500" },
                  { label: "Goal Achieved (Funds Locked)", count: statusCounts.GoalAchieved, color: "bg-emerald-500" },
                  { label: "Awaiting Release (Deadline Passed)", count: statusCounts.AwaitingRelease, color: "bg-indigo-500" },
                  { label: "Funds Released (Beneficiary Paid)", count: statusCounts.FundsReleased, color: "bg-teal-600" },
                  { label: "Refund Available (Failed Goal)", count: statusCounts.RefundAvailable, color: "bg-amber-500" },
                  { label: "Refunded (Completed)", count: statusCounts.Refunded, color: "bg-gray-400" },
                ].map((s) => {
                  const pct =
                    campaigns.length > 0 ? Math.round((s.count / campaigns.length) * 100) : 0;
                  return (
                    <div key={s.label} className="space-y-1">
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-700">{s.label}</span>
                        <span className="text-gray-500 font-mono font-bold">
                          {s.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full ${s.color} transition-all duration-500`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Action: Pending Escrow Releases */}
          {campaigns.filter((c) => c.canReleaseFunds).length > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-6 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-extrabold text-emerald-950 text-base">
                    Campaigns Eligible for Escrow Fund Release
                  </h3>
                </div>
                <span className="text-xs bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-emerald-800">
                The deadline has passed and the funding goal was reached for the campaigns below. Anyone can trigger the permissionless smart contract release to send ETH directly to the beneficiary:
              </p>
              <div className="space-y-2 pt-2">
                {campaigns
                  .filter((c) => c.canReleaseFunds)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="bg-white p-4 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">#{c.id} {c.title}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                            {c.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">
                          Beneficiary: {shortenAddress(c.beneficiary)} &bull; Escrow Amount: {c.escrowBalance} ETH
                        </p>
                      </div>
                      <button
                        onClick={() => handleReleaseEscrow(c.id)}
                        disabled={txState.loading}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Release {c.escrowBalance} ETH</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CAMPAIGN MANAGEMENT */}
      {activeTab === "campaigns" && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                placeholder="Search by title, creator, beneficiary, category..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={campaignStatusFilter}
                onChange={(e) => setCampaignStatusFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="goal achieved">Goal Achieved</option>
                <option value="awaiting">Awaiting Release</option>
                <option value="funds released">Funds Released</option>
                <option value="refund available">Refund Available</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                    <th className="py-3.5 px-4">ID</th>
                    <th className="py-3.5 px-4">Title & Category</th>
                    <th className="py-3.5 px-4">Creator / Beneficiary</th>
                    <th className="py-3.5 px-4">Goal / Raised</th>
                    <th className="py-3.5 px-4">Escrow Balance</th>
                    <th className="py-3.5 px-4">Deadline</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCampaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">#{c.id}</td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <Link
                          to={`/campaign/${c.id}`}
                          className="font-bold text-gray-900 hover:text-emerald-700 block truncate"
                        >
                          {c.title}
                        </Link>
                        <span className="text-[10px] text-gray-500 font-medium">{c.category}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                        <div>
                          <span className="text-gray-400">Creator: </span>
                          <span title={c.creator}>{shortenAddress(c.creator)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Ben: </span>
                          <span className="font-semibold text-gray-800" title={c.beneficiary}>
                            {shortenAddress(c.beneficiary)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-gray-900">{c.amountRaised} ETH</span>
                        <span className="text-gray-400 text-[10px] block">Goal: {c.goal} ETH</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                        {c.escrowBalance} ETH
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-[11px]">
                        <div>{new Date(c.deadline * 1000).toLocaleDateString()}</div>
                        <div className={`text-[10px] font-semibold ${c.isExpired ? "text-rose-600" : "text-emerald-600"}`}>
                          {c.isExpired ? "Expired" : "Active"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            c.status === "Funds Released"
                              ? "bg-teal-100 text-teal-800"
                              : c.status === "Awaiting Release"
                              ? "bg-indigo-100 text-indigo-800 animate-pulse"
                              : c.status === "Goal Achieved"
                              ? "bg-emerald-100 text-emerald-800"
                              : c.status === "Refund Available"
                              ? "bg-amber-100 text-amber-800"
                              : c.status === "Refunded"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.canReleaseFunds && (
                            <button
                              onClick={() => handleReleaseEscrow(c.id)}
                              disabled={txState.loading}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] shadow-xs cursor-pointer"
                            >
                              Release
                            </button>
                          )}
                          <Link
                            to={`/campaign/${c.id}`}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900"
                            title="View campaign page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCampaigns.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400 text-xs">
                        No campaigns found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ESCROW MONITORING */}
      {activeTab === "escrow" && (
        <div className="space-y-6 animate-fade-in">
          {/* Escrow Architecture Card */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Lock className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Smart Contract Escrow Architecture
                </h3>
                <p className="text-xs text-gray-500">
                  Trustless custodial vault operating autonomously on Ethereum
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-gray-500 text-xs font-medium">Smart Contract Vault Address</span>
                <p className="font-mono text-xs font-bold text-gray-900 break-all">{CONTRACT_ADDRESS}</p>
                <span className="text-[10px] text-emerald-700 font-semibold block pt-1">
                  &bull; Verified Solidity Escrow
                </span>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-1">
                <span className="text-emerald-800 text-xs font-medium">Total ETH in Active Escrow</span>
                <p className="font-extrabold text-2xl text-emerald-950">{totalEscrowLocked} ETH</p>
                <span className="text-[10px] text-emerald-700 block">
                  Across {campaigns.filter((c) => parseFloat(c.escrowBalance) > 0).length} active campaigns
                </span>
              </div>

              <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-100 space-y-1">
                <span className="text-teal-800 text-xs font-medium">Historical Released to Beneficiaries</span>
                <p className="font-extrabold text-2xl text-teal-950">{totalReleased} ETH</p>
                <span className="text-[10px] text-teal-700 block">
                  Successfully disbursed upon target completion
                </span>
              </div>
            </div>
          </div>

          {/* Escrow Campaigns Breakdown */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-gray-900">
              Campaign Escrow Ledger
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                    <th className="py-3 px-4">Campaign</th>
                    <th className="py-3 px-4">Target Goal</th>
                    <th className="py-3 px-4">Raised Amount</th>
                    <th className="py-3 px-4">Current Escrow Balance</th>
                    <th className="py-3 px-4">Beneficiary</th>
                    <th className="py-3 px-4">Escrow Status</th>
                    <th className="py-3 px-4 text-right">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-sans font-bold text-gray-900">
                        #{c.id} {c.title}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{c.goal} ETH</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{c.amountRaised} ETH</td>
                      <td className="py-3 px-4 font-bold text-emerald-800">{c.escrowBalance} ETH</td>
                      <td className="py-3 px-4 text-gray-700" title={c.beneficiary}>
                        {shortenAddress(c.beneficiary)}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === "Funds Released"
                              ? "bg-teal-100 text-teal-800"
                              : c.status === "Awaiting Release"
                              ? "bg-indigo-100 text-indigo-800"
                              : c.status === "Refund Available"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {c.statusBadge}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        {c.canReleaseFunds ? (
                          <button
                            onClick={() => handleReleaseEscrow(c.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg"
                          >
                            Release Funds
                          </button>
                        ) : c.status === "Funds Released" ? (
                          <span className="text-[11px] text-teal-700 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USER / WALLET MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search wallet address..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <span className="text-xs text-gray-500 font-medium px-2">
              Showing {filteredUsers.length} active wallets
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                    <th className="py-3.5 px-4">Wallet Address</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Total Contributed</th>
                    <th className="py-3.5 px-4">Contributions</th>
                    <th className="py-3.5 px-4">Campaigns Created</th>
                    <th className="py-3.5 px-4">Received as Beneficiary</th>
                    <th className="py-3.5 px-4 text-right">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {filteredUsers.map((u) => {
                    const isCurrentAdmin =
                      u.address.toLowerCase() === adminAddress.toLowerCase();
                    return (
                      <tr key={u.address} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 break-all">{u.address}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <div className="flex flex-wrap gap-1">
                            {isCurrentAdmin && (
                              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                Admin
                              </span>
                            )}
                            {u.isCreator && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                Creator
                              </span>
                            )}
                            {u.isContributor && (
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                Contributor
                              </span>
                            )}
                            {u.isBeneficiary && (
                              <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                Beneficiary
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {u.totalContributed.toFixed(4)} ETH
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">{u.contributionsCount}</td>
                        <td className="py-3.5 px-4 text-gray-600">{u.campaignsCreated}</td>
                        <td className="py-3.5 px-4 font-bold text-teal-800">
                          {u.totalReceivedAsBeneficiary.toFixed(4)} ETH
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleCopy(u.address)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                            title="Copy full address"
                          >
                            {copiedAddress === u.address ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                        No user addresses found matching search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TRANSACTION MONITORING */}
      {activeTab === "transactions" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Transaction Types</option>
                <option value="campaigncreated">Campaign Creation</option>
                <option value="contributionreceived">Escrow Contribution</option>
                <option value="fundsreleased">Escrow Fund Release</option>
                <option value="refundclaimed">Escrow Refund</option>
                <option value="contributionwithdrawn">Early Withdrawal</option>
                <option value="userdeposited">Vault Deposit</option>
              </select>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Showing {filteredEvents.length} recorded events
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                    <th className="py-3.5 px-4">Tx Hash</th>
                    <th className="py-3.5 px-4">Event Type</th>
                    <th className="py-3.5 px-4">From</th>
                    <th className="py-3.5 px-4">To</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Time</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {filteredEvents.map((e, idx) => (
                    <tr key={`${e.txHash}-${idx}`} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <span title={e.txHash}>{shortenAddress(e.txHash)}</span>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            e.type === "ContributionReceived"
                              ? "bg-emerald-100 text-emerald-800"
                              : e.type === "FundsReleased"
                              ? "bg-teal-100 text-teal-800"
                              : e.type === "RefundClaimed"
                              ? "bg-amber-100 text-amber-800"
                              : e.type === "CampaignCreated"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {e.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600" title={e.from || e.address}>
                        {shortenAddress(e.from || e.address)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600" title={e.to || CONTRACT_ADDRESS}>
                        {shortenAddress(e.to || CONTRACT_ADDRESS)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {e.amount ? `${e.amount} ETH` : "-"}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-gray-500 text-[11px]">
                        {new Date(e.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredEvents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 text-xs font-sans">
                        No transactions found for the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS & DEV TOOLS */}
      {activeTab === "settings" && (
        <div className="space-y-6 animate-fade-in max-w-4xl">
          {/* Protocol Configuration Info */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-gray-900">
              Protocol Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400 font-sans block mb-1">Contract Address</span>
                <span className="text-gray-900 font-bold break-all">{CONTRACT_ADDRESS}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400 font-sans block mb-1">Admin Address</span>
                <span className="text-gray-900 font-bold break-all">{adminAddress}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400 font-sans block mb-1">Network Chain ID</span>
                <span className="text-gray-900 font-bold">{CHAIN_ID}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400 font-sans block mb-1">EVM Environment</span>
                <span className="text-gray-900 font-bold">
                  {SUPPORTED_NETWORKS[CHAIN_ID]?.name || "Localhost (31337)"}
                </span>
              </div>
            </div>
          </div>

          {/* Local Blockchain Fast-Forward / Time Machine */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                <FastForward className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-amber-950 text-base">
                  Local Blockchain Fast-Forward (Time Machine)
                </h3>
                <p className="text-xs text-amber-800">
                  Simulate passing campaign deadlines instantly on local Hardhat / Remix nodes
                </p>
              </div>
            </div>

            <p className="text-xs text-amber-900 leading-relaxed">
              In production, campaign deadlines expire naturally with block timestamps. In local testing, you can use these controls to advance EVM block time (via <code>evm_increaseTime</code> and <code>evm_mine</code>) to test campaign deadline expiration, fund release conditions, and contributor refunds live in front of reviewers or examiners:
            </p>

            {fastForwardSuccess && (
              <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{fastForwardSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {[
                { days: 1, label: "+1 Day" },
                { days: 7, label: "+7 Days" },
                { days: 14, label: "+14 Days" },
                { days: 30, label: "+30 Days" },
              ].map((btn) => (
                <button
                  key={btn.days}
                  onClick={() => handleFastForward(btn.days)}
                  disabled={fastForwardLoading}
                  className="py-3 px-4 bg-white hover:bg-amber-100/70 border border-amber-300 rounded-2xl text-xs font-bold text-amber-900 shadow-xs hover:shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>{fastForwardLoading ? "Mining..." : btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
