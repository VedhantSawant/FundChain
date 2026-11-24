import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  Coins,
  HeartHandshake,
  TrendingUp,
  PlusCircle,
  RotateCcw,
  CheckCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Layers,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import ProgressBar from "../components/ProgressBar";
import { shortenAddress } from "../blockchain/contract";
import { SUPPORTED_NETWORKS, CHAIN_ID } from "../blockchain/config";

export default function Dashboard() {
  const {
    account,
    isConnected,
    connectWallet,
    campaigns,
    getContributionStatus,
    withdrawFunds,
    claimRefund,
    refreshCampaigns,
    chainId,
  } = useWeb3();

  const [supportedCampaigns, setSupportedCampaigns] = useState([]);
  const [loadingSupported, setLoadingSupported] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Filter campaigns created by this account
  const myCreatedCampaigns = useMemo(() => {
    if (!account) return [];
    return campaigns.filter(
      (c) => c.creator && c.creator.toLowerCase() === account.toLowerCase()
    );
  }, [campaigns, account]);

  // Load campaigns supported by this account
  const loadSupportedCampaigns = useCallback(async () => {
    if (!account || campaigns.length === 0) {
      setSupportedCampaigns([]);
      return;
    }
    setLoadingSupported(true);
    try {
      const results = [];
      for (const campaign of campaigns) {
        const status = await getContributionStatus(campaign.id, account);
        if (parseFloat(status.contributedAmount) > 0) {
          results.push({
            campaign,
            contributedAmount: status.contributedAmount,
            hasClaimed: status.hasClaimed,
            isEligibleForRefund: status.isEligibleForRefund,
          });
        }
      }
      setSupportedCampaigns(results);
    } catch (err) {
      console.error("Error loading supported campaigns:", err);
    } finally {
      setLoadingSupported(false);
    }
  }, [account, campaigns, getContributionStatus]);

  useEffect(() => {
    loadSupportedCampaigns();
  }, [loadSupportedCampaigns]);

  // Aggregate stats
  const dashboardStats = useMemo(() => {
    let totalRaisedByMe = 0;
    myCreatedCampaigns.forEach((c) => {
      totalRaisedByMe += parseFloat(c.amountRaised || 0);
    });

    let totalContributedByMe = 0;
    supportedCampaigns.forEach((item) => {
      totalContributedByMe += parseFloat(item.contributedAmount || 0);
    });

    return {
      createdCount: myCreatedCampaigns.length,
      supportedCount: supportedCampaigns.length,
      totalRaisedByMe: totalRaisedByMe.toFixed(3),
      totalContributedByMe: totalContributedByMe.toFixed(3),
    };
  }, [myCreatedCampaigns, supportedCampaigns]);

  // Handle Withdraw
  const handleWithdraw = async (campaignId) => {
    if (!window.confirm("Confirm withdrawal of collected funds to your wallet?")) return;
    setActionLoading(`withdraw-${campaignId}`);
    try {
      await withdrawFunds(campaignId);
      await refreshCampaigns();
      await loadSupportedCampaigns();
    } catch (err) {
      console.error("Withdrawal error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Claim Refund
  const handleClaimRefund = async (campaignId, amount) => {
    if (!window.confirm(`Claim your smart contract refund of ${amount} ETH?`)) return;
    setActionLoading(`refund-${campaignId}`);
    try {
      await claimRefund(campaignId);
      await refreshCampaigns();
      await loadSupportedCampaigns();
    } catch (err) {
      console.error("Refund error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const network = SUPPORTED_NETWORKS[chainId || CHAIN_ID];
  const explorerUrl = network?.blockExplorer;

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-white rounded-3xl border border-gray-200/80 p-12 shadow-soft space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Wallet className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">
            Connect Your Wallet to Access Dashboard
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            Your personalized dashboard tracks the campaigns you created, your contributions, withdrawable funds, and eligible refunds on the Ethereum blockchain.
          </p>
          <button
            onClick={connectWallet}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#14532D] to-[#16A34A] text-white rounded-xl text-sm font-bold shadow-md hover:scale-[1.02] transition-all"
          >
            <Wallet className="w-4 h-4" />
            <span>Connect MetaMask</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full w-fit mb-2">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>My Blockchain Portfolio</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            User Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-mono mt-1">
            Connected: {account}
          </p>
        </div>

        <Link
          to="/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#14532D] text-white rounded-xl text-sm font-bold shadow-md hover:bg-emerald-800 transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Campaign</span>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Campaigns Created
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900">{dashboardStats.createdCount}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Campaigns Supported
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900">{dashboardStats.supportedCount}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Contributed
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-700">
            {dashboardStats.totalContributedByMe} <span className="text-sm font-normal text-gray-500">ETH</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Funds Raised By Me
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900">
            {dashboardStats.totalRaisedByMe} <span className="text-sm font-normal text-gray-500">ETH</span>
          </p>
        </div>
      </div>

      {/* Section 1: My Created Campaigns */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              My Created Campaigns
            </h2>
            <p className="text-xs text-gray-500">
              Campaigns initiated by your connected wallet address
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {myCreatedCampaigns.length} total
          </span>
        </div>

        {myCreatedCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCreatedCampaigns.map((c) => {
              const canWithdraw = c.isExpired && c.isGoalReached && !c.withdrawn;

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-soft flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {c.category}
                      </span>
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {c.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 line-clamp-1 mb-2 text-base">
                      {c.title}
                    </h3>

                    <div className="space-y-2 mb-3">
                      <ProgressBar progress={c.progressPercent} />
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>
                          <strong>{c.amountRaised}</strong> of {c.goal} ETH
                        </span>
                        <span>{c.progressPercent}%</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        Deadline: {new Date(c.deadline * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <Link
                      to={`/campaign/${c.id}`}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {/* Withdraw button if eligible */}
                    {canWithdraw ? (
                      <button
                        onClick={() => handleWithdraw(c.id)}
                        disabled={actionLoading === `withdraw-${c.id}`}
                        className="px-3 py-1.5 bg-[#14532D] hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                      >
                        {actionLoading === `withdraw-${c.id}` ? "Processing..." : `Withdraw (${c.amountRaised} ETH)`}
                      </button>
                    ) : c.withdrawn ? (
                      <span className="text-[11px] text-gray-500 font-semibold bg-gray-100 px-2.5 py-1 rounded-md">
                        ✓ Withdrawn
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center space-y-3">
            <p className="text-sm text-gray-600">You haven't created any campaigns yet.</p>
            <Link
              to="/create"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
            >
              <span>Launch your first campaign</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* Section 2: Campaigns I Supported */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Campaigns I Supported
            </h2>
            <p className="text-xs text-gray-500">
              Contributions made from this wallet, with real-time refund status
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {supportedCampaigns.length} total
          </span>
        </div>

        {loadingSupported ? (
          <div className="p-8 text-center text-sm text-gray-500 animate-pulse">
            Loading your contribution records from the blockchain...
          </div>
        ) : supportedCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {supportedCampaigns.map((item) => {
              const { campaign: c, contributedAmount, hasClaimed, isEligibleForRefund } = item;

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-soft flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {c.category}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          c.status === "Successful" || c.status === "Funded"
                            ? "bg-emerald-50 text-emerald-700"
                            : c.status === "Failed"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 line-clamp-1 mb-2 text-base">
                      {c.title}
                    </h3>

                    {/* Contributed info */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 mb-3 space-y-1">
                      <span className="text-xs text-gray-500 block">Your Contribution</span>
                      <span className="text-base font-extrabold text-emerald-700 block">
                        {contributedAmount} ETH
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Total Raised:</span>
                        <span className="font-semibold">{c.amountRaised} / {c.goal} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Deadline:</span>
                        <span>{new Date(c.deadline * 1000).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <Link
                      to={`/campaign/${c.id}`}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {/* Claim Refund Button */}
                    {isEligibleForRefund ? (
                      <button
                        onClick={() => handleClaimRefund(c.id, contributedAmount)}
                        disabled={actionLoading === `refund-${c.id}`}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{actionLoading === `refund-${c.id}` ? "Claiming..." : "Claim Refund"}</span>
                      </button>
                    ) : hasClaimed ? (
                      <span className="text-[11px] text-gray-500 font-semibold bg-gray-100 px-2.5 py-1 rounded-md">
                        ✓ Refund Claimed
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center space-y-3">
            <p className="text-sm text-gray-600">You haven't contributed to any campaigns yet.</p>
            <Link
              to="/explore"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
            >
              <span>Explore campaigns to support</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
