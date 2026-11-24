import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Clock,
  User,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Coins,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Users,
  RotateCcw,
  Sparkles,
  HeartHandshake,
  Calendar,
  Layers,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import ProgressBar from "../components/ProgressBar";
import { shortenAddress } from "../blockchain/contract";
import { SUPPORTED_NETWORKS, CHAIN_ID } from "../blockchain/config";

export default function CampaignDetails() {
  const { id } = useParams();
  const {
    account,
    isConnected,
    connectWallet,
    getCampaignById,
    getContributionStatus,
    getCampaignContributions,
    contribute,
    withdrawFunds,
    claimRefund,
    refreshCampaigns,
    chainId,
  } = useWeb3();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contributions, setContributions] = useState([]);
  const [userContribution, setUserContribution] = useState({
    contributedAmount: "0",
    hasClaimed: false,
    isEligibleForRefund: false,
  });

  const [ethAmount, setEthAmount] = useState("");
  const [copiedCreator, setCopiedCreator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch campaign details and events
  const loadCampaignData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getCampaignById(id);
      setCampaign(data);

      const [contribList, userStatus] = await Promise.all([
        getCampaignContributions(id),
        account ? getContributionStatus(id, account) : Promise.resolve(null),
      ]);

      setContributions(contribList);
      if (userStatus) {
        setUserContribution(userStatus);
      }
    } catch (err) {
      console.error("Failed to load campaign:", err);
    } finally {
      setLoading(false);
    }
  }, [id, account, getCampaignById, getCampaignContributions, getContributionStatus]);

  useEffect(() => {
    loadCampaignData();
  }, [loadCampaignData]);

  const handleCopyCreator = () => {
    if (campaign?.creator) {
      navigator.clipboard.writeText(campaign.creator);
      setCopiedCreator(true);
      setTimeout(() => setCopiedCreator(false), 2000);
    }
  };

  // Contribute handler
  const handleContribute = async (e) => {
    e.preventDefault();
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      alert("Please enter a valid ETH contribution amount greater than 0");
      return;
    }

    if (!isConnected) {
      await connectWallet();
      return;
    }

    setIsSubmitting(true);
    try {
      await contribute(campaign.id, ethAmount);
      setEthAmount("");
      await loadCampaignData();
      await refreshCampaigns();
    } catch (err) {
      console.error("Contribution failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Withdraw handler for creator
  const handleWithdraw = async () => {
    if (!window.confirm("Are you sure you want to withdraw the collected funds to your creator wallet?")) {
      return;
    }
    setIsSubmitting(true);
    try {
      await withdrawFunds(campaign.id);
      await loadCampaignData();
      await refreshCampaigns();
    } catch (err) {
      console.error("Withdrawal error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Claim refund handler for contributor
  const handleClaimRefund = async () => {
    if (!window.confirm(`Claim your full refund of ${userContribution.contributedAmount} ETH?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await claimRefund(campaign.id);
      await loadCampaignData();
      await refreshCampaigns();
    } catch (err) {
      console.error("Refund error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4" />
        <div className="h-96 bg-gray-200 rounded-3xl max-w-4xl mx-auto mb-6" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Not Found</h2>
        <p className="text-sm text-gray-600 mb-6">
          Campaign #{id} does not exist on the smart contract.
        </p>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#14532D] text-white rounded-xl text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </Link>
      </div>
    );
  }

  const isCreator = account && campaign.creator && account.toLowerCase() === campaign.creator.toLowerCase();
  const deadlineDate = new Date(campaign.deadline * 1000);
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = campaign.deadline - now;
  const isEnded = secondsLeft <= 0;

  // Remaining time format
  let remainingText = "Deadline Passed";
  if (secondsLeft > 0) {
    const days = Math.floor(secondsLeft / (24 * 3600));
    const hours = Math.floor((secondsLeft % (24 * 3600)) / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    remainingText = days > 0 ? `${days} days, ${hours} hours left` : `${hours} hours, ${minutes} mins left`;
  }

  const canWithdraw = isCreator && isEnded && campaign.isGoalReached && !campaign.withdrawn;
  const canRefund = isEnded && !campaign.isGoalReached && userContribution.isEligibleForRefund;

  const network = SUPPORTED_NETWORKS[chainId || CHAIN_ID];
  const explorerUrl = network?.blockExplorer;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Campaigns</span>
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Left Column: Image, Story, Creator & History (2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Campaign Image */}
          <div className="relative rounded-3xl overflow-hidden bg-gray-100 border border-gray-200/80 shadow-soft h-[360px] sm:h-[440px]">
            <img
              src={campaign.imageUrl || "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80"}
              alt={campaign.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1532629345422-7515f3d16bb7?auto=format&fit=crop&w=1200&q=80";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Category and status badge on image */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/95 text-emerald-800 backdrop-blur-md shadow-md border border-white/50">
                {campaign.category}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#14532D] text-white shadow-md">
                Campaign #{campaign.id}
              </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white drop-shadow-md">
                {campaign.title}
              </h1>
            </div>
          </div>

          {/* Description / Story Section */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-8 shadow-soft space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>About This Campaign</span>
            </h2>

            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base font-normal">
              {campaign.description}
            </p>

            {/* Creator Information Card */}
            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/80 p-5 rounded-2xl border border-gray-200/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Campaign Creator
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-gray-900">
                      {shortenAddress(campaign.creator)}
                    </span>
                    <button
                      onClick={handleCopyCreator}
                      className="p-1 text-gray-400 hover:text-emerald-700 transition-colors"
                      title="Copy Address"
                    >
                      {copiedCreator ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {explorerUrl && (
                      <a
                        href={`${explorerUrl}/address/${campaign.creator}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-gray-400 hover:text-emerald-700"
                        title="View on Explorer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {isCreator && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-300 self-start sm:self-auto">
                  You are the Creator
                </span>
              )}
            </div>
          </div>

          {/* On-Chain Transaction & Contribution History */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-8 shadow-soft space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Contributions & Blockchain Audit</span>
              </h3>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {contributions.length} total backers
              </span>
            </div>

            {contributions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="pb-3">Contributor</th>
                      <th className="pb-3">Amount (ETH)</th>
                      <th className="pb-3">Time</th>
                      <th className="pb-3 text-right">Transaction Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contributions.map((c, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-3.5 font-mono text-xs font-semibold text-gray-900">
                          {shortenAddress(c.contributor)}
                        </td>
                        <td className="py-3.5 font-bold text-emerald-700">
                          +{c.amount} ETH
                        </td>
                        <td className="py-3.5 text-xs text-gray-500">
                          {new Date(c.timestamp).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3.5 text-right font-mono text-xs text-gray-500">
                          {explorerUrl ? (
                            <a
                              href={`${explorerUrl}/tx/${c.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:underline inline-flex items-center gap-1"
                            >
                              <span>{c.txHash.slice(0, 8)}...</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span>{c.txHash.slice(0, 10)}...</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-sm">
                No contributions made to this campaign yet. Be the first to back it!
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Funding Progress & Actions Card (1 col) */}
        <div className="space-y-6 lg:sticky lg:top-28">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-soft space-y-6">
            {/* Campaign Status Badge */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Current Status
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  campaign.status === "Successful" || campaign.status === "Funded"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : campaign.status === "Failed"
                    ? "bg-rose-50 text-rose-700 border-rose-300"
                    : campaign.status === "Withdrawn"
                    ? "bg-gray-100 text-gray-700 border-gray-300"
                    : "bg-blue-50 text-blue-700 border-blue-300"
                }`}
              >
                {campaign.status}
              </span>
            </div>

            {/* Amounts Raised / Goal */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#14532D]">
                  {campaign.amountRaised}
                </span>
                <span className="text-lg font-bold text-gray-600">ETH</span>
                <span className="text-xs text-gray-500 font-medium">
                  raised of {campaign.goal} ETH goal
                </span>
              </div>

              {/* Progress bar */}
              <div className="pt-2">
                <ProgressBar progress={campaign.progressPercent} height="h-3" showLabel={true} />
              </div>
            </div>

            {/* Campaign Meta Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-500 block mb-1">Time Remaining</span>
                <span className="font-bold text-gray-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  {remainingText}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-500 block mb-1">Deadline Date</span>
                <span className="font-bold text-gray-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  {deadlineDate.toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* User Contribution Info (if any) */}
            {parseFloat(userContribution.contributedAmount) > 0 && (
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <span className="font-semibold text-emerald-800 block">Your Contribution:</span>
                <p className="text-sm font-extrabold text-[#14532D]">
                  {userContribution.contributedAmount} ETH
                </p>
                {userContribution.hasClaimed && (
                  <p className="text-rose-700 font-bold">✓ Refund already claimed</p>
                )}
              </div>
            )}

            {/* ACTION 1: Creator Withdraw Funds Button */}
            {isCreator && (
              <div className="space-y-3 pt-2">
                {canWithdraw ? (
                  <button
                    onClick={handleWithdraw}
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Withdraw Collected Funds ({campaign.amountRaised} ETH)</span>
                  </button>
                ) : campaign.withdrawn ? (
                  <div className="p-3 bg-gray-100 text-gray-600 text-xs rounded-xl font-medium text-center">
                    ✓ Funds have already been withdrawn to your creator wallet.
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                    <strong>Creator Notice:</strong> Funds can only be withdrawn after the campaign deadline has passed and if the funding goal was achieved.
                  </div>
                )}
              </div>
            )}

            {/* ACTION 2: Contributor Refund Button */}
            {canRefund && (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                  <strong>Campaign Ended Below Goal:</strong> You are eligible for an immediate 100% smart contract refund of {userContribution.contributedAmount} ETH.
                </div>
                <button
                  onClick={handleClaimRefund}
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Claim My Refund ({userContribution.contributedAmount} ETH)</span>
                </button>
              </div>
            )}

            {/* ACTION 3: Contribution Form (Only if active and not creator) */}
            {!isEnded && !isCreator && (
              <form onSubmit={handleContribute} className="space-y-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Contribute ETH
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0.0001"
                      placeholder="e.g. 0.1"
                      value={ethAmount}
                      onChange={(e) => setEthAmount(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full pl-4 pr-16 py-3 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                      ETH
                    </span>
                  </div>
                </div>

                {/* Preset amount pills */}
                <div className="flex gap-2">
                  {["0.05", "0.1", "0.5", "1.0"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEthAmount(preset)}
                      className="flex-1 py-1.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-lg text-xs font-semibold transition-all border border-gray-200"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#14532D] to-[#16A34A] hover:from-[#114224] hover:to-[#15803D] text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/15 hover:shadow-emerald-900/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Coins className="w-4 h-4" />
                  <span>{isSubmitting ? "Processing..." : isConnected ? "Contribute Now" : "Connect & Contribute"}</span>
                </button>
              </form>
            )}

            {isCreator && !isEnded && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl">
                You created this campaign. By smart contract rules, creators cannot contribute to their own campaigns.
              </div>
            )}

            {isEnded && !canWithdraw && !canRefund && (
              <div className="p-3 bg-gray-100 text-gray-600 text-xs rounded-xl text-center">
                This campaign has concluded.
              </div>
            )}

            {/* Smart Contract Guarantee notice */}
            <div className="pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Automatic refund guarantee managed by Ethereum smart contract.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
