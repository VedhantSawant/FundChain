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
  Lock,
  Unlock,
  CheckCircle2,
  Award,
  Vote,
  FileCheck2,
  AlertCircle,
  Send,
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import ProgressBar from "../components/ProgressBar";
import { shortenAddress } from "../blockchain/contract";
import { SUPPORTED_NETWORKS, CHAIN_ID } from "../blockchain/config";

export default function CampaignDetails() {
  const { id } = useParams();
  const {
    account,
    getAccountName,
    isAdmin,
    isConnected,
    connectWallet,
    getCampaignById,
    getContributionStatus,
    getCampaignContributions,
    getCampaignMilestones,
    getCampaignProposals,
    getCampaignDisputes,
    getCreatorReputation,
    contribute,
    withdrawContribution,
    withdrawFunds,
    releaseFunds,
    claimRefund,
    submitMilestoneEvidence,
    approveMilestone,
    rejectMilestone,
    releaseMilestoneFunds,
    createProposal,
    voteOnProposal,
    executeProposal,
    raiseDispute,
    refreshCampaigns,
    chainId,
  } = useWeb3();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contributions, setContributions] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [creatorReputation, setCreatorReputation] = useState(null);

  const [userContribution, setUserContribution] = useState({
    contributedAmount: "0",
    hasClaimed: false,
    isEligibleForRefund: false,
  });

  const [ethAmount, setEthAmount] = useState("");
  const [copiedCreator, setCopiedCreator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active tab inside Campaign Details (Milestones, Voting, History, Disputes)
  const [activeTab, setActiveTab] = useState("milestones");

  // Modals
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState(0);
  const [evidenceUrlInput, setEvidenceUrlInput] = useState("");

  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [proposalForm, setProposalForm] = useState({ title: "", description: "", durationHours: 72 });

  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeForm, setDisputeForm] = useState({ milestoneIndex: 0, reason: "", evidenceUrl: "" });

  // Fetch campaign details and sub-entities
  const loadCampaignData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getCampaignById(id);
      setCampaign(data);

      const [contribList, userStatus, mList, pList, dList, rep] = await Promise.all([
        getCampaignContributions(id),
        account ? getContributionStatus(id, account) : Promise.resolve(null),
        getCampaignMilestones(id),
        getCampaignProposals(id),
        getCampaignDisputes(id),
        data?.creator ? getCreatorReputation(data.creator) : Promise.resolve(null),
      ]);

      setContributions(contribList);
      if (userStatus) setUserContribution(userStatus);
      setMilestones(mList);
      setProposals(pList);
      setDisputes(dList);
      setCreatorReputation(rep);
    } catch (err) {
      console.error("Failed to load campaign data:", err);
    } finally {
      setLoading(false);
    }
  }, [id, account, getCampaignById, getCampaignContributions, getContributionStatus, getCampaignMilestones, getCampaignProposals, getCampaignDisputes, getCreatorReputation]);

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

  // Release entire Escrow Funds (single milestone or final)
  const handleReleaseFunds = async () => {
    if (!window.confirm(`Trigger smart contract escrow release of ${campaign.escrowBalance} ETH directly to beneficiary (${shortenAddress(campaign.beneficiary)})?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await releaseFunds(campaign.id);
      await loadCampaignData();
      await refreshCampaigns();
    } catch (err) {
      console.error("Release error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Claim Refund
  const handleClaimRefund = async () => {
    if (!window.confirm(`Claim your 100% smart contract refund of ${userContribution.contributedAmount} ETH?`)) {
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

  // Early Contributor Withdrawal
  const handleWithdrawContribution = async () => {
    if (!window.confirm(`Withdraw your contribution of ${userContribution.contributedAmount} ETH before deadline?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await withdrawContribution(campaign.id);
      await loadCampaignData();
      await refreshCampaigns();
    } catch (err) {
      console.error("Early withdrawal error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Creator Submit Evidence
  const handleSubmitEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceUrlInput.trim()) return;
    setIsSubmitting(true);
    try {
      await submitMilestoneEvidence(campaign.id, selectedMilestoneIndex, evidenceUrlInput.trim());
      setEvidenceModalOpen(false);
      setEvidenceUrlInput("");
      await loadCampaignData();
    } catch (err) {
      console.error("Evidence submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Approve Milestone
  const handleApproveMilestone = async (mIndex) => {
    if (!window.confirm(`Approve milestone #${mIndex + 1} deliverables?`)) return;
    setIsSubmitting(true);
    try {
      await approveMilestone(campaign.id, mIndex);
      await loadCampaignData();
    } catch (err) {
      console.error("Approve milestone error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Reject Milestone
  const handleRejectMilestone = async (mIndex) => {
    const reason = window.prompt("Reason for rejection / required revisions:", "Evidence is insufficient or unverifiable");
    if (!reason) return;
    setIsSubmitting(true);
    try {
      await rejectMilestone(campaign.id, mIndex, reason);
      await loadCampaignData();
    } catch (err) {
      console.error("Reject milestone error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Release Milestone Funds
  const handleReleaseMilestone = async (mIndex, targetAmount) => {
    if (!window.confirm(`Release approved milestone tranche of ${targetAmount} ETH directly to beneficiary (${shortenAddress(campaign.beneficiary)})?`)) return;
    setIsSubmitting(true);
    try {
      await releaseMilestoneFunds(campaign.id, mIndex);
      await loadCampaignData();
      await refreshCampaigns();
    } catch (err) {
      console.error("Release milestone error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Proposal
  const handleCreateProposal = async (e) => {
    e.preventDefault();
    if (!proposalForm.title.trim()) return;
    setIsSubmitting(true);
    try {
      const durSeconds = Math.max(300, (parseInt(proposalForm.durationHours) || 24) * 3600);
      await createProposal(campaign.id, proposalForm.title.trim(), proposalForm.description.trim(), durSeconds);
      setProposalModalOpen(false);
      setProposalForm({ title: "", description: "", durationHours: 72 });
      await loadCampaignData();
    } catch (err) {
      console.error("Create proposal error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vote on Proposal
  const handleVote = async (propId, support) => {
    setIsSubmitting(true);
    try {
      await voteOnProposal(propId, support);
      await loadCampaignData();
    } catch (err) {
      console.error("Voting error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Proposal
  const handleExecuteProposal = async (propId) => {
    setIsSubmitting(true);
    try {
      await executeProposal(propId);
      await loadCampaignData();
    } catch (err) {
      console.error("Execute proposal error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Raise Dispute
  const handleRaiseDispute = async (e) => {
    e.preventDefault();
    if (!disputeForm.reason.trim()) return;
    setIsSubmitting(true);
    try {
      await raiseDispute(campaign.id, disputeForm.milestoneIndex, disputeForm.reason.trim(), disputeForm.evidenceUrl.trim());
      setDisputeModalOpen(false);
      setDisputeForm({ milestoneIndex: 0, reason: "", evidenceUrl: "" });
      await loadCampaignData();
    } catch (err) {
      console.error("Dispute error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-pulse space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 mx-auto" />
        <p className="text-gray-500 font-medium text-sm">
          Fetching smart contract escrow, milestones, and on-chain records...
        </p>
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
  const now = campaign.chainTimestamp || Math.floor(Date.now() / 1000);
  const secondsLeft = campaign.deadline - now;
  const isEnded = secondsLeft <= 0;

  let remainingText = "Deadline Passed";
  if (secondsLeft > 0) {
    const days = Math.floor(secondsLeft / (24 * 3600));
    const hours = Math.floor((secondsLeft % (24 * 3600)) / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    remainingText = days > 0 ? `${days} days, ${hours} hours left` : `${hours} hours, ${minutes} mins left`;
  }

  const hasContributed = parseFloat(userContribution.contributedAmount) > 0;
  const hasActiveDispute = disputes.some((d) => !d.resolved);
  const network = SUPPORTED_NETWORKS[chainId || CHAIN_ID];
  const explorerUrl = network?.blockExplorer;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Campaigns</span>
        </Link>

        {hasContributed && !isEnded && (
          <button
            onClick={() => setDisputeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Raise Dispute</span>
          </button>
        )}
      </div>

      {/* ACTIVE DISPUTE BANNER IF PRESENT */}
      {hasActiveDispute && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3.5 text-amber-900 animate-fade-in shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-extrabold text-sm text-amber-950">
              Active Dispute Under Review
            </h4>
            <p>
              A formal backer dispute has been recorded on the smart contract for this campaign. All further milestone escrow disbursements are automatically paused until protocol administrators conclude verification.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Left Column: Image, Story, Creator, Tabs (2 cols) */}
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

            {/* Creator & Beneficiary & On-Chain Reputation Card */}
            <div className="pt-6 border-t border-gray-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/80 p-5 rounded-2xl border border-gray-200/60">
                {/* Creator */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">
                      Campaign Creator
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-900">
                        {shortenAddress(campaign.creator)}
                      </span>
                      <button
                        onClick={handleCopyCreator}
                        className="p-1 text-gray-400 hover:text-emerald-700 transition-colors"
                        title="Copy Address"
                      >
                        {copiedCreator ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {isCreator && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Beneficiary */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">
                      Designated Beneficiary
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-900">
                        {shortenAddress(campaign.beneficiary)}
                      </span>
                      {account && campaign.beneficiary && account.toLowerCase() === campaign.beneficiary.toLowerCase() && (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-[10px] font-bold">
                          Your Wallet
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ON-CHAIN CREATOR REPUTATION BADGE (Requirement #8) */}
              {creatorReputation && (
                <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          Creator On-Chain Reputation
                        </span>
                        <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                          {creatorReputation.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Verifiable history: {creatorReputation.successfulCampaigns} successful campaigns · {creatorReputation.milestonesCompleted} milestones approved · {creatorReputation.disputesAgainst} disputes lost
                      </p>
                    </div>
                  </div>
                  <div className="text-right sm:border-l sm:border-emerald-200/80 sm:pl-4">
                    <span className="text-[11px] text-gray-500 block font-semibold">Reputation Score</span>
                    <span className="text-2xl font-black text-emerald-800">
                      {creatorReputation.score}<span className="text-xs font-bold text-gray-500">/100</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TABBED INTERACTIVE SECTIONS (Milestones, Voting, Disputes, Audit) */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-soft overflow-hidden">
            {/* Tabs Bar */}
            <div className="flex border-b border-gray-200 bg-gray-50/60 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setActiveTab("milestones")}
                className={`flex items-center gap-2 px-5 py-4 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === "milestones"
                    ? "border-emerald-700 text-emerald-800 bg-white"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Milestone Releases ({milestones.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("voting")}
                className={`flex items-center gap-2 px-5 py-4 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === "voting"
                    ? "border-emerald-700 text-emerald-800 bg-white"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                }`}
              >
                <Vote className="w-4 h-4" />
                <span>Donor Voting ({proposals.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("disputes")}
                className={`flex items-center gap-2 px-5 py-4 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === "disputes"
                    ? "border-emerald-700 text-emerald-800 bg-white"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Dispute Resolution ({disputes.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 px-5 py-4 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === "history"
                    ? "border-emerald-700 text-emerald-800 bg-white"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Contribution Audit ({contributions.length})</span>
              </button>
            </div>

            {/* TAB 1: MILESTONES */}
            {activeTab === "milestones" && (
              <div className="p-6 sm:p-8 space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Milestone Staged Fund Releases
                    </h3>
                    <p className="text-xs text-gray-500">
                      Funds are locked in escrow and released sequentially upon verified delivery proof.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    Escrow Balance: <strong>{campaign.escrowBalance} ETH</strong>
                  </div>
                </div>

                <div className="space-y-4">
                  {milestones.map((m, idx) => {
                    const isEligibleToRelease = m.approved && !m.released && parseFloat(campaign.escrowBalance) > 0 && !hasActiveDispute;

                    return (
                      <div
                        key={idx}
                        className={`p-5 rounded-2xl border transition-all ${
                          m.released
                            ? "bg-teal-50/40 border-teal-200"
                            : m.approved
                            ? "bg-indigo-50/40 border-indigo-200"
                            : m.completed
                            ? "bg-amber-50/40 border-amber-200"
                            : "bg-gray-50/60 border-gray-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                m.released
                                  ? "bg-teal-600 text-white"
                                  : m.approved
                                  ? "bg-indigo-600 text-white"
                                  : m.completed
                                  ? "bg-amber-500 text-white"
                                  : "bg-gray-300 text-gray-700"
                              }`}
                            >
                              {m.released ? "✓" : idx + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-gray-900">{m.title}</h4>
                              <span className="text-[11px] font-extrabold text-emerald-700">
                                Tranche: {m.targetAmount} ETH
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                m.released
                                  ? "bg-teal-100 text-teal-900"
                                  : m.approved
                                  ? "bg-indigo-100 text-indigo-900"
                                  : m.completed
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {m.released
                                ? "Funds Disbursed"
                                : m.approved
                                ? "Evidence Approved"
                                : m.completed
                                ? "Evidence Submitted (Under Review)"
                                : "Deliverable Pending"}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 pl-9.5 mb-3 leading-relaxed">
                          {m.description}
                        </p>

                        {/* Evidence Link */}
                        {m.evidenceUrl && (
                          <div className="ml-9.5 p-2.5 bg-white/80 rounded-xl border border-gray-200 flex items-center justify-between text-xs font-mono text-emerald-800 mb-3">
                            <span className="truncate mr-2">Proof: {m.evidenceUrl}</span>
                            <a
                              href={m.evidenceUrl.startsWith("http") ? m.evidenceUrl : `https://${m.evidenceUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline flex items-center gap-1 font-sans font-bold"
                            >
                              <span>View Evidence</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="ml-9.5 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200/60">
                          {/* Creator submit evidence */}
                          {isCreator && !m.completed && !m.released && (
                            <button
                              onClick={() => {
                                setSelectedMilestoneIndex(idx);
                                setEvidenceModalOpen(true);
                              }}
                              disabled={isSubmitting}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>Submit Completion Proof</span>
                            </button>
                          )}

                          {/* Admin approve/reject */}
                          {isAdmin && m.completed && !m.approved && !m.released && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveMilestone(idx)}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                Approve Milestone
                              </button>
                              <button
                                onClick={() => handleRejectMilestone(idx)}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                Request Revisions
                              </button>
                            </div>
                          )}

                          {/* Permissionless Release */}
                          {isEligibleToRelease && (
                            <button
                              onClick={() => handleReleaseMilestone(idx, m.targetAmount)}
                              disabled={isSubmitting}
                              className="px-3.5 py-1.5 bg-[#14532D] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                              <span>Release Tranche ({m.targetAmount} ETH) to Beneficiary</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: DONOR VOTING GOVERNANCE */}
            {activeTab === "voting" && (
              <div className="p-6 sm:p-8 space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Decentralized Contributor Governance
                    </h3>
                    <p className="text-xs text-gray-500">
                      Verified backers can propose and vote on campaign modifications, schedule shifts, or scope revisions.
                    </p>
                  </div>
                  {(hasContributed || isCreator) && (
                    <button
                      onClick={() => setProposalModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>New Governance Proposal</span>
                    </button>
                  )}
                </div>

                {proposals.length > 0 ? (
                  <div className="space-y-4">
                    {proposals.map((p) => {
                      const totalVotes = p.votesFor + p.votesAgainst;
                      const percentFor = totalVotes > 0 ? Math.round((p.votesFor / totalVotes) * 100) : 50;

                      return (
                        <div key={p.id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h4 className="font-bold text-sm text-gray-900">{p.title}</h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                p.executed
                                  ? p.passed
                                    ? "bg-emerald-100 text-emerald-900"
                                    : "bg-rose-100 text-rose-900"
                                  : "bg-blue-100 text-blue-900"
                              }`}
                            >
                              {p.executed ? (p.passed ? "Passed & Executed" : "Rejected") : "Voting Open"}
                            </span>
                          </div>

                          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                            {p.description}
                          </p>

                          {/* Vote Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-500 font-semibold">
                              <span className="text-emerald-700">FOR: {p.votesFor} votes</span>
                              <span className="text-rose-700">AGAINST: {p.votesAgainst} votes</span>
                            </div>
                            <div className="w-full bg-rose-200 h-2.5 rounded-full overflow-hidden flex">
                              <div className="bg-emerald-600 h-full transition-all" style={{ width: `${percentFor}%` }} />
                            </div>
                          </div>

                          {/* Voting Actions */}
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-gray-400 font-mono text-[11px]">
                              Proposed by: {shortenAddress(p.proposer)}
                            </span>

                            <div className="flex items-center gap-2">
                              {!p.executed && !p.isExpired && hasContributed && (
                                <>
                                  <button
                                    onClick={() => handleVote(p.id, true)}
                                    disabled={isSubmitting}
                                    className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                  >
                                    <ThumbsUp className="w-3 h-3 text-emerald-700" />
                                    <span>Vote FOR</span>
                                  </button>
                                  <button
                                    onClick={() => handleVote(p.id, false)}
                                    disabled={isSubmitting}
                                    className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                  >
                                    <ThumbsDown className="w-3 h-3 text-rose-700" />
                                    <span>Vote AGAINST</span>
                                  </button>
                                </>
                              )}

                              {!p.executed && p.isExpired && (
                                <button
                                  onClick={() => handleExecuteProposal(p.id)}
                                  disabled={isSubmitting}
                                  className="px-3 py-1 bg-[#14532D] text-white font-bold rounded-lg"
                                >
                                  Finalize & Execute
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-500">
                    No governance proposals have been submitted for this campaign yet.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DISPUTE MANAGEMENT */}
            {activeTab === "disputes" && (
              <div className="p-6 sm:p-8 space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Dispute Log & Resolution
                    </h3>
                    <p className="text-xs text-gray-500">
                      Contributors can dispute milestone deliverables. Fund releases remain paused during active investigation.
                    </p>
                  </div>
                  {hasContributed && !isEnded && (
                    <button
                      onClick={() => setDisputeModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>File Dispute</span>
                    </button>
                  )}
                </div>

                {disputes.length > 0 ? (
                  <div className="space-y-3">
                    {disputes.map((d) => (
                      <div key={d.id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-gray-900 block text-sm">Dispute #{d.id}</span>
                            <span className="text-gray-500 font-mono text-[11px]">
                              Complainant: {shortenAddress(d.complainant)} · Target Milestone #{d.milestoneIndex + 1}
                            </span>
                          </div>
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                              d.resolved
                                ? d.inFavorOfDonors
                                  ? "bg-rose-100 text-rose-900"
                                  : "bg-emerald-100 text-emerald-900"
                                : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {d.resolved ? (d.inFavorOfDonors ? "Upheld (In Favor of Donors)" : "Dismissed (In Favor of Creator)") : "Pending Arbitration"}
                          </span>
                        </div>
                        <p className="text-gray-700 bg-white p-3 rounded-xl border border-gray-100">
                          {d.reason}
                        </p>
                        {d.evidenceUrl && (
                          <a
                            href={d.evidenceUrl.startsWith("http") ? d.evidenceUrl : `https://${d.evidenceUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 hover:underline flex items-center gap-1 font-mono text-[11px]"
                          >
                            <span>Evidence Link: {d.evidenceUrl}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {d.resolutionNotes && (
                          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-950 text-[11px]">
                            <strong>Arbiter Notes:</strong> {d.resolutionNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-500">
                    No disputes filed. All milestone deliverables proceeding normally.
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: AUDIT & HISTORY */}
            {activeTab === "history" && (
              <div className="p-6 sm:p-8 space-y-4 animate-fade-in">
                <h3 className="text-lg font-bold text-gray-900">
                  On-Chain Contributions Audit
                </h3>
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
                            <td className="py-3 font-mono text-xs font-semibold text-gray-900">
                              {shortenAddress(c.contributor)}
                            </td>
                            <td className="py-3 font-extrabold text-xs text-emerald-700">
                              {c.amount} ETH
                            </td>
                            <td className="py-3 text-xs text-gray-500">
                              {new Date(c.timestamp).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-right font-mono text-xs">
                              {explorerUrl ? (
                                <a
                                  href={`${explorerUrl}/tx/${c.txHash}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-700 hover:underline flex items-center justify-end gap-1"
                                >
                                  <span>{shortenAddress(c.txHash)}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-gray-500">{shortenAddress(c.txHash)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-4">No contributions recorded on-chain yet.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Funding Card, Actions, Escrow Status (1 col) */}
        <div className="space-y-6 lg:sticky lg:top-28">
          {/* Main Action & Stats Card */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-soft space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-black text-gray-900 tracking-tight">
                  {campaign.amountRaised} ETH
                </span>
                <span className="text-sm font-semibold text-gray-500">
                  of {campaign.goal} ETH
                </span>
              </div>
              <ProgressBar progress={campaign.progressPercent} />
              <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                <span>{campaign.progressPercent}% Funded</span>
                <span>{contributions.length} Contributions</span>
              </div>
            </div>

            {/* Smart Contract Escrow Balance Box */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Smart Contract Escrow Vault
                </span>
                <span className="text-emerald-700 font-extrabold">{campaign.escrowBalance} ETH</span>
              </div>
              <p className="text-[11px] text-gray-600 leading-tight">
                All contributed ETH is locked securely in contract bytecode until verification conditions or milestones are completed.
              </p>
            </div>

            {/* Countdown / Status Box */}
            <div className="p-4 bg-[#F8FAF7] rounded-2xl border border-gray-200 space-y-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Campaign Deadline
              </span>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>{remainingText}</span>
              </div>
              <span className="text-[11px] text-gray-500 block">
                {deadlineDate.toLocaleDateString()} at {deadlineDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Contribution Form */}
            {!isEnded && !campaign.fundsReleased && (
              <form onSubmit={handleContribute} className="space-y-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Back This Campaign
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.001"
                      required
                      placeholder="0.25"
                      value={ethAmount}
                      onChange={(e) => setEthAmount(e.target.value)}
                      className="w-full pl-4 pr-16 py-3.5 bg-[#F8FAF7] border border-gray-200 rounded-xl text-base font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                      ETH
                    </span>
                  </div>

                  {/* Quick ETH buttons */}
                  <div className="flex gap-2 mt-2">
                    {["0.1", "0.25", "0.5", "1.0"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEthAmount(preset)}
                        className="flex-1 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-[#14532D] to-[#16A34A] hover:from-[#114224] hover:to-[#15803D] text-white rounded-2xl text-sm font-bold shadow-md shadow-emerald-900/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? "Confirming on Chain..."
                      : isConnected
                      ? "Contribute ETH via MetaMask"
                      : "Connect Wallet to Contribute"}
                  </span>
                </button>
              </form>
            )}

            {/* User Contribution and Withdrawal Status */}
            {hasContributed && (
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-semibold">Your Contribution:</span>
                  <span className="font-extrabold text-emerald-800 text-sm">
                    {userContribution.contributedAmount} ETH
                  </span>
                </div>

                {/* Early withdrawal before deadline */}
                {!isEnded && !campaign.fundsReleased && (
                  <button
                    onClick={handleWithdrawContribution}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Withdraw Contribution Before Deadline</span>
                  </button>
                )}

                {/* Refund if campaign failed */}
                {isEnded && userContribution.isEligibleForRefund && (
                  <button
                    onClick={handleClaimRefund}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Claim 100% Escrow Refund ({userContribution.contributedAmount} ETH)</span>
                  </button>
                )}
              </div>
            )}

            {/* Permissionless Release Escrow Funds Button */}
            {campaign.canReleaseFunds && (
              <div className="pt-2">
                <button
                  onClick={handleReleaseFunds}
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#14532D] hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Release Escrow Funds to Beneficiary ({campaign.escrowBalance} ETH)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Submit Milestone Evidence */}
      {evidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">
                Submit Deliverable Proof for Milestone #{selectedMilestoneIndex + 1}
              </h3>
              <button onClick={() => setEvidenceModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmitEvidence} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Evidence URL / IPFS Document Link</label>
                <input
                  type="url"
                  required
                  placeholder="https://ipfs.io/ipfs/... or https://github.com/..."
                  value={evidenceUrlInput}
                  onChange={(e) => setEvidenceUrlInput(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>
              <p className="text-gray-500">
                Auditors and platform administrators will verify this deliverable before approving escrow disbursement.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-700 text-white font-bold rounded-xl"
                >
                  {isSubmitting ? "Submitting..." : "Submit on Blockchain"}
                </button>
                <button
                  type="button"
                  onClick={() => setEvidenceModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Proposal */}
      {proposalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Create Governance Proposal</h3>
              <button onClick={() => setProposalModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreateProposal} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Proposal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Extend Planting Window by 2 Weeks"
                  value={proposalForm.title}
                  onChange={(e) => setProposalForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Detailed Explanation & Justification</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain why this decision requires collective donor voting..."
                  value={proposalForm.description}
                  onChange={(e) => setProposalForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Voting Duration (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={proposalForm.durationHours}
                  onChange={(e) => setProposalForm((prev) => ({ ...prev, durationHours: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-700 text-white font-bold rounded-xl"
                >
                  {isSubmitting ? "Publishing..." : "Publish Proposal"}
                </button>
                <button
                  type="button"
                  onClick={() => setProposalModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Raise Dispute */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>File Smart Contract Dispute</span>
              </h3>
              <button onClick={() => setDisputeModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleRaiseDispute} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Target Milestone</label>
                <select
                  value={disputeForm.milestoneIndex}
                  onChange={(e) => setDisputeForm((prev) => ({ ...prev, milestoneIndex: parseInt(e.target.value) }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                >
                  {milestones.map((m, i) => (
                    <option key={i} value={i}>
                      Milestone #{i + 1}: {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Reason for Dispute</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why the submitted evidence is invalid or deliverables were not fulfilled..."
                  value={disputeForm.reason}
                  onChange={(e) => setDisputeForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Evidence URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={disputeForm.evidenceUrl}
                  onChange={(e) => setDisputeForm((prev) => ({ ...prev, evidenceUrl: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-[11px]"
                />
              </div>
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                Filing a dispute pauses milestone releases immediately on the smart contract bytecode.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl"
                >
                  {isSubmitting ? "Filing on Chain..." : "File Dispute"}
                </button>
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
