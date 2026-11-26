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
  ArrowLeftRight,
  Shield,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  History,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import ProgressBar from "../components/ProgressBar";
import { shortenAddress } from "../blockchain/contract";
import { SUPPORTED_NETWORKS, CHAIN_ID } from "../blockchain/config";

export default function Dashboard() {
  const {
    account,
    balance,
    vaultBalance,
    isConnected,
    connectWallet,
    switchWallet,
    campaigns,
    getContributionStatus,
    withdrawContribution,
    withdrawFunds,
    releaseFunds,
    claimRefund,
    refreshCampaigns,
    openAddMoneyModal,
    getAllContractEvents,
    chainId,
  } = useWeb3();

  const [supportedCampaigns, setSupportedCampaigns] = useState([]);
  const [loadingSupported, setLoadingSupported] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Filter campaigns created by this account
  const myCreatedCampaigns = useMemo(() => {
    if (!account) return [];
    return campaigns.filter(
      (c) => c.creator && c.creator.toLowerCase() === account.toLowerCase()
    );
  }, [campaigns, account]);

  // Load campaigns supported by this account with matching on-chain event details
  const loadSupportedCampaigns = useCallback(async () => {
    if (!account || campaigns.length === 0) {
      setSupportedCampaigns([]);
      return;
    }
    setLoadingSupported(true);
    try {
      const allEvents = await getAllContractEvents();
      const results = [];
      for (const campaign of campaigns) {
        const status = await getContributionStatus(campaign.id, account);
        if (parseFloat(status.contributedAmount) > 0 || status.hasClaimed) {
          // Find matching contribution event for txHash and date
          const matchingEvent = allEvents.find(
            (ev) =>
              ev.type === "ContributionReceived" &&
              Number(ev.campaignId) === Number(campaign.id) &&
              ev.from &&
              ev.from.toLowerCase() === account.toLowerCase()
          );

          results.push({
            campaign,
            contributedAmount: status.contributedAmount,
            hasClaimed: status.hasClaimed,
            isEligibleForRefund: status.isEligibleForRefund,
            canWithdrawNow: status.canWithdrawNow,
            txHash: matchingEvent?.txHash || null,
            contributionDate: matchingEvent ? new Date(matchingEvent.timestamp) : null,
          });
        }
      }
      setSupportedCampaigns(results);
    } catch (err) {
      console.error("Error loading supported campaigns:", err);
    } finally {
      setLoadingSupported(false);
    }
  }, [account, campaigns, getContributionStatus, getAllContractEvents]);

  // Load account specific event history
  const loadAccountEvents = useCallback(async () => {
    if (!account) {
      setMyEvents([]);
      return;
    }
    setLoadingEvents(true);
    try {
      const allEvents = await getAllContractEvents();
      const filtered = allEvents.filter(
        (ev) => ev.address && ev.address.toLowerCase() === account.toLowerCase()
      );
      setMyEvents(filtered);
    } catch (err) {
      console.error("Error loading account events:", err);
    } finally {
      setLoadingEvents(false);
    }
  }, [account, getAllContractEvents]);

  useEffect(() => {
    loadSupportedCampaigns();
    loadAccountEvents();
  }, [loadSupportedCampaigns, loadAccountEvents]);

  // Comprehensive aggregate stats matching requirement #5
  const dashboardStats = useMemo(() => {
    let totalRaisedByMe = 0;
    let beneficiaryReleasedTotal = 0;
    myCreatedCampaigns.forEach((c) => {
      totalRaisedByMe += parseFloat(c.amountRaised || 0);
      if (c.fundsReleased) {
        beneficiaryReleasedTotal += parseFloat(c.amountRaised || 0);
      }
    });

    let totalContributedByMe = 0;
    let totalLockedInEscrow = 0;
    let activeContributions = 0;
    let awaitingReleaseContributions = 0;
    let refundsCount = 0;

    supportedCampaigns.forEach((item) => {
      const amt = parseFloat(item.contributedAmount || 0);
      totalContributedByMe += amt;
      if (amt > 0 && !item.hasClaimed && !item.campaign.fundsReleased) {
        totalLockedInEscrow += amt;
      }
      if (!item.campaign.isExpired && amt > 0) {
        activeContributions += 1;
      }
      if (item.campaign.canReleaseFunds) {
        awaitingReleaseContributions += 1;
      }
      if (item.hasClaimed) {
        refundsCount += 1;
      }
    });

    return {
      createdCount: myCreatedCampaigns.length,
      supportedCount: supportedCampaigns.length,
      totalRaisedByMe: totalRaisedByMe.toFixed(3),
      totalContributedByMe: totalContributedByMe.toFixed(3),
      totalLockedInEscrow: totalLockedInEscrow.toFixed(3),
      activeContributions,
      awaitingReleaseContributions,
      refundsCount,
      beneficiaryReleasedTotal: beneficiaryReleasedTotal.toFixed(3),
    };
  }, [myCreatedCampaigns, supportedCampaigns]);

  // Handle Escrow Release to Beneficiary
  const handleReleaseFunds = async (campaignId, beneficiary, amount) => {
    if (!window.confirm(`Trigger smart contract escrow release of ${amount} ETH directly to beneficiary (${shortenAddress(beneficiary)})?`)) return;
    setActionLoading(`release-${campaignId}`);
    try {
      await releaseFunds(campaignId);
      await refreshCampaigns();
      await loadSupportedCampaigns();
      await loadAccountEvents();
    } catch (err) {
      console.error("Release escrow funds error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Creator Withdraw
  const handleCreatorWithdraw = async (campaignId) => {
    if (!window.confirm("Confirm withdrawal/release of collected campaign funds?")) return;
    setActionLoading(`withdraw-creator-${campaignId}`);
    try {
      await withdrawFunds(campaignId);
      await refreshCampaigns();
      await loadSupportedCampaigns();
      await loadAccountEvents();
    } catch (err) {
      console.error("Creator withdrawal error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Contributor Withdraw (Early withdrawal before deadline)
  const handleContributorWithdraw = async (campaignId, amount) => {
    if (!window.confirm(`Withdraw your contribution of ${amount} ETH back to your wallet?`)) return;
    setActionLoading(`withdraw-contributor-${campaignId}`);
    try {
      await withdrawContribution(campaignId);
      await refreshCampaigns();
      await loadSupportedCampaigns();
      await loadAccountEvents();
    } catch (err) {
      console.error("Contributor withdrawal error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Contributor Claim Refund (Failed campaign)
  const handleClaimRefund = async (campaignId, amount) => {
    if (!window.confirm(`Claim your smart contract refund of ${amount} ETH?`)) return;
    setActionLoading(`refund-${campaignId}`);
    try {
      await claimRefund(campaignId);
      await refreshCampaigns();
      await loadSupportedCampaigns();
      await loadAccountEvents();
    } catch (err) {
      console.error("Refund error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyAccount = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
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
            Your personalized dashboard tracks the campaigns you created, your contributions, withdrawable funds, and account balances on the Ethereum blockchain.
          </p>
          <button
            onClick={connectWallet}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#14532D] to-[#16A34A] text-white rounded-xl text-sm font-bold shadow-md hover:scale-[1.02] transition-all cursor-pointer"
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
      {/* Account Info & Quick Actions Banner */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full w-fit">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Connected Portfolio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            User Dashboard
          </h1>
          <div className="flex items-center gap-2 text-xs font-mono text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 w-fit">
            <span>{shortenAddress(account)}</span>
            <button
              onClick={handleCopyAccount}
              className="text-gray-400 hover:text-emerald-700 transition-colors"
              title="Copy Address"
            >
              {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {explorerUrl && (
              <a
                href={`${explorerUrl}/address/${account}`}
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-emerald-700"
                title="View on Explorer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Live Balances and Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="bg-[#F8FAF7] border border-gray-200 p-3.5 rounded-2xl flex items-center gap-6">
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                MetaMask Balance
              </span>
              <span className="text-lg font-extrabold text-gray-900">{balance} ETH</span>
            </div>
            <div className="h-8 w-[1px] bg-gray-200" />
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Vault Balance
              </span>
              <span className="text-lg font-extrabold text-emerald-700">{vaultBalance} ETH</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={switchWallet}
              className="flex-1 sm:flex-initial px-4 py-3 bg-white border border-gray-300 hover:border-emerald-600 text-gray-700 hover:text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              title="Switch between MetaMask accounts"
            >
              <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
              <span>Switch Wallet</span>
            </button>

            <button
              onClick={openAddMoneyModal}
              className="flex-1 sm:flex-initial px-4 py-3 bg-[#14532D] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
            >
              <Coins className="w-4 h-4" />
              <span>Add Money</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards - Requirement #5 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Contributed
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">
            {dashboardStats.totalContributedByMe} <span className="text-xs font-normal text-gray-500">ETH</span>
          </p>
          <span className="text-[11px] text-gray-500">{dashboardStats.supportedCount} campaigns backed</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Locked in Escrow
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700">
            {dashboardStats.totalLockedInEscrow} <span className="text-xs font-normal text-gray-500">ETH</span>
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Secured in smart contract</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Active Contributions
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{dashboardStats.activeContributions}</p>
          <span className="text-[11px] text-gray-500">Campaigns currently running</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Awaiting Fund Release
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-900">{dashboardStats.awaitingReleaseContributions}</p>
          <span className="text-[11px] text-indigo-600 font-medium">Goal achieved, ready to disburse</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Successful Refunds
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-900">{dashboardStats.refundsCount}</p>
          <span className="text-[11px] text-amber-600 font-medium">Returned on failed goals</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Beneficiary Releases
            </span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-teal-800">
            {dashboardStats.beneficiaryReleasedTotal} <span className="text-xs font-normal text-gray-500">ETH</span>
          </p>
          <span className="text-[11px] text-teal-600 font-medium">Disbursed to your wallet</span>
        </div>
      </div>

      {/* SECTION: Contributor Withdrawals & Contributions Management */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/80 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 mb-1">
              <RotateCcw className="w-3 h-3" />
              <span>Backer Fund Management</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              My Contributions & Withdrawals
            </h2>
            <p className="text-xs text-gray-500">
              Manage your contributed funds: withdraw contributions from active campaigns or claim automatic refunds from ended campaigns.
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full self-start sm:self-auto">
            {supportedCampaigns.length} campaigns backed
          </span>
        </div>

        {loadingSupported ? (
          <div className="p-8 text-center text-sm text-gray-500 animate-pulse">
            Loading your contribution and withdrawal records from the blockchain...
          </div>
        ) : supportedCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {supportedCampaigns.map((item) => {
              const {
                campaign: c,
                contributedAmount,
                hasClaimed,
                isEligibleForRefund,
                canWithdrawNow,
                txHash,
                contributionDate,
              } = item;
              const hasPositiveContribution = parseFloat(contributedAmount) > 0;
              const isEnded = c.isExpired;

              // Expected release eligibility text
              let eligibilityText = "Funds safely locked in escrow until deadline";
              if (c.fundsReleased) {
                eligibilityText = "Funds successfully released to beneficiary";
              } else if (c.canReleaseFunds) {
                eligibilityText = "Goal met & deadline reached: Ready for release!";
              } else if (isEligibleForRefund) {
                eligibilityText = "Goal missed: 100% refund available to claim";
              }

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {c.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.fundsReleased
                            ? "bg-teal-50 text-teal-700 border border-teal-200"
                            : c.canReleaseFunds
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : c.status === "Goal Achieved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : c.status === "Refund Available"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {c.statusBadge || c.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 line-clamp-1 text-base">
                      {c.title}
                    </h3>

                    {/* Contribution Box */}
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Your Contribution</span>
                        <span className="font-extrabold text-emerald-700 text-sm">
                          {hasPositiveContribution ? `${contributedAmount} ETH` : "0.00 ETH"}
                        </span>
                      </div>
                      {hasClaimed && (
                        <span className="text-[11px] font-bold text-gray-500 block pt-0.5">
                          ✓ Funds previously refunded / withdrawn
                        </span>
                      )}
                    </div>

                    {/* Metadata & Eligibility */}
                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Campaign Goal:</span>
                        <span className="font-semibold">{c.amountRaised} / {c.goal} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Deadline:</span>
                        <span>{new Date(c.deadline * 1000).toLocaleDateString()}</span>
                      </div>
                      {contributionDate && (
                        <div className="flex justify-between text-gray-500">
                          <span>Contribution Date:</span>
                          <span>{contributionDate.toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="pt-1 text-[11px] text-emerald-800 font-medium bg-emerald-50/60 p-2 rounded-xl border border-emerald-100/70">
                        <strong>Escrow Status:</strong> {eligibilityText}
                      </div>

                      {/* Transaction Hash */}
                      {txHash && (
                        <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono pt-1">
                          <span>Tx Hash:</span>
                          {explorerUrl ? (
                            <a
                              href={`${explorerUrl}/tx/${txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline flex items-center gap-1"
                            >
                              <span>{shortenAddress(txHash)}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span title={txHash}>{shortenAddress(txHash)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <Link
                      to={`/campaign/${c.id}`}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {/* WITHDRAW OPTION 1: Early withdrawal before deadline */}
                    {!isEnded && hasPositiveContribution && (
                      <button
                        onClick={() => handleContributorWithdraw(c.id, contributedAmount)}
                        disabled={actionLoading === `withdraw-contributor-${c.id}`}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                        title="Withdraw your contributed ETH before deadline"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          {actionLoading === `withdraw-contributor-${c.id}` ? "Processing..." : `Withdraw (${contributedAmount} ETH)`}
                        </span>
                      </button>
                    )}

                    {/* WITHDRAW OPTION 2: Refund for failed campaign */}
                    {isEnded && isEligibleForRefund && (
                      <button
                        onClick={() => handleClaimRefund(c.id, contributedAmount)}
                        disabled={actionLoading === `refund-${c.id}`}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                        title="Claim full smart contract refund"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          {actionLoading === `refund-${c.id}` ? "Claiming..." : `Claim Refund (${contributedAmount} ETH)`}
                        </span>
                      </button>
                    )}

                    {/* Withdrawn/Refunded badge */}
                    {hasClaimed && (
                      <span className="text-[11px] text-gray-500 font-semibold bg-gray-100 px-2.5 py-1 rounded-md">
                        ✓ Withdrawn
                      </span>
                    )}
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
              <span>Explore campaigns to back</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* SECTION: My Created Campaigns (Escrow Releases & Settlements) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/80 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Smart Contract Escrow & Settlement</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              My Created Campaigns
            </h2>
            <p className="text-xs text-gray-500">
              Campaigns you launched. Disburse locked escrow funds to the designated beneficiary once the funding goal is met and deadline has passed.
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full self-start sm:self-auto">
            {myCreatedCampaigns.length} campaigns
          </span>
        </div>

        {myCreatedCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCreatedCampaigns.map((c) => {
              const canRelease = c.canReleaseFunds || (c.isExpired && c.isGoalReached && !c.fundsReleased);
              const isSelfBeneficiary = c.beneficiary && account && c.beneficiary.toLowerCase() === account.toLowerCase();

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {c.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.fundsReleased
                            ? "bg-teal-50 text-teal-700 border border-teal-200"
                            : c.canReleaseFunds
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : c.status === "Goal Achieved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : c.status === "Refund Available"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {c.statusBadge || c.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 line-clamp-1 text-base">
                      {c.title}
                    </h3>

                    {/* Funding Progress */}
                    <div className="space-y-1.5">
                      <ProgressBar progress={c.progressPercent} />
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>
                          <strong>{c.amountRaised}</strong> of {c.goal} ETH
                        </span>
                        <span>{c.progressPercent}%</span>
                      </div>
                    </div>

                    {/* Escrow & Beneficiary Details */}
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Escrow Balance:</span>
                        <span className="font-extrabold text-emerald-700">
                          {c.escrowBalance || (c.fundsReleased ? "0.00" : c.amountRaised)} ETH
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Beneficiary:</span>
                        <span className="font-mono text-gray-800 flex items-center gap-1">
                          {shortenAddress(c.beneficiary || c.creator)}
                          {isSelfBeneficiary && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-sans font-bold">
                              Self
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-gray-500">
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
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {/* Release Escrow Funds button if eligible */}
                    {canRelease ? (
                      <button
                        onClick={() => handleReleaseFunds(c.id, c.beneficiary || c.creator, c.amountRaised)}
                        disabled={actionLoading === `release-${c.id}`}
                        className="px-3 py-1.5 bg-[#14532D] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Release escrow funds directly to designated beneficiary"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                        <span>
                          {actionLoading === `release-${c.id}` ? "Releasing..." : `Release (${c.amountRaised} ETH)`}
                        </span>
                      </button>
                    ) : c.fundsReleased ? (
                      <span className="text-[11px] text-teal-700 font-bold bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Check className="w-3 h-3 text-teal-600" />
                        <span>Funds Released to Beneficiary</span>
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

      {/* SECTION: Account Transaction History */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200/80 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 mb-1">
              <History className="w-3 h-3" />
              <span>Wallet Activity</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Account Transaction History
            </h2>
            <p className="text-xs text-gray-500">
              Verified on-chain activity for currently connected address {shortenAddress(account)}
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {myEvents.length} events
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-soft overflow-hidden">
          {loadingEvents ? (
            <div className="p-8 text-center text-sm text-gray-500 animate-pulse">
              Loading wallet event history...
            </div>
          ) : myEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200/80 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Action / Event</th>
                    <th className="py-3.5 px-6">Campaign / Context</th>
                    <th className="py-3.5 px-6">Amount (ETH)</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Timestamp</th>
                    <th className="py-3.5 px-6 text-right">Transaction Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myEvents.map((ev, idx) => {
                    let badge = (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                        {ev.type}
                      </span>
                    );
                    if (ev.type === "ContributionReceived") {
                      badge = (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          Contributed
                        </span>
                      );
                    } else if (ev.type === "ContributionWithdrawn") {
                      badge = (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                          Withdrew Contribution
                        </span>
                      );
                    } else if (ev.type === "FundsWithdrawn") {
                      badge = (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                          Creator Withdrawal
                        </span>
                      );
                    } else if (ev.type === "RefundClaimed") {
                      badge = (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                          Refund Claimed
                        </span>
                      );
                    } else if (ev.type === "UserDeposited") {
                      badge = (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Vault Deposit
                        </span>
                      );
                    } else if (ev.type === "UserWithdrewDeposit") {
                      badge = (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-800">
                          Vault Withdrawal
                        </span>
                      );
                    }

                    return (
                      <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-4 px-6">{badge}</td>
                        <td className="py-4 px-6 font-medium text-gray-900">
                          {ev.campaignId !== "-" ? `Campaign #${ev.campaignId}` : "FundChain Vault"}
                        </td>
                        <td className="py-4 px-6 font-bold text-gray-900">
                          {ev.amount ? `${ev.amount} ETH` : "-"}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Confirmed
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-gray-500">
                          {new Date(ev.timestamp).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-xs">
                          {explorerUrl ? (
                            <a
                              href={`${explorerUrl}/tx/${ev.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline inline-flex items-center gap-1"
                            >
                              <span>{ev.txHash.slice(0, 8)}...</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                              {ev.txHash.slice(0, 10)}...
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-gray-500">
              No transactions recorded for this wallet address yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
