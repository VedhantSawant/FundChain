import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  FastForward,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Coins,
  Receipt,
  Loader2,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import {
  shortenAddress,
  getAddressBalance,
  getLatestChainTimestamp,
  formatEther,
} from "../blockchain/contract";
import { CONTRACT_ADDRESS, CHAIN_ID, SUPPORTED_NETWORKS } from "../blockchain/config";

export default function ExpiryReleaseDemoModal({ isOpen, onClose, onCompleted }) {
  const {
    campaigns,
    chainId,
    getAccountName,
    getCampaignContributions,
    getCampaignDisputes,
    fastForward,
    releaseFunds,
    refreshCampaigns,
  } = useWeb3();

  // Only campaigns with contributions locked in escrow and not yet released
  const escrowCampaigns = campaigns.filter(
    (c) => parseFloat(c.escrowBalance || 0) > 0 && !c.fundsReleased
  );

  const [selectedId, setSelectedId] = useState(null);
  const [confirmedSim, setConfirmedSim] = useState(false);
  const [chainNow, setChainNow] = useState(Math.floor(Date.now() / 1000));
  const [donors, setDonors] = useState([]);
  const [hasActiveDispute, setHasActiveDispute] = useState(false);

  // Live balances (before & after)
  const [escrowBefore, setEscrowBefore] = useState(null);
  const [beneficiaryBefore, setBeneficiaryBefore] = useState(null);

  // Action states
  const [simulating, setSimulating] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Result confirmation panel state
  const [releaseResult, setReleaseResult] = useState(null);
  const [showLocalInspector, setShowLocalInspector] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const activeChainId = chainId || CHAIN_ID;
  const isLocalDevNetwork = activeChainId === 31337;
  const network = SUPPORTED_NETWORKS[activeChainId];
  const explorerUrl = network?.blockExplorer;

  const selectedCampaign =
    escrowCampaigns.find((c) => c.id === selectedId) || escrowCampaigns[0] || null;

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setReleaseResult(null);
      setShowLocalInspector(false);
      setConfirmedSim(false);
      setErrorMsg("");
      if (escrowCampaigns.length > 0 && !escrowCampaigns.some((c) => c.id === selectedId)) {
        setSelectedId(escrowCampaigns[0].id);
      }
      getLatestChainTimestamp().then(setChainNow).catch(() => {});
    }
  }, [isOpen]);

  // Load details & live balances for selected campaign
  useEffect(() => {
    if (!isOpen || !selectedCampaign || releaseResult) return;

    let cancelled = false;
    async function loadDetails() {
      try {
        const [contribs, disps, eBal, bBal, latestTs] = await Promise.all([
          getCampaignContributions(selectedCampaign.id),
          getCampaignDisputes(selectedCampaign.id),
          getAddressBalance(CONTRACT_ADDRESS),
          getAddressBalance(selectedCampaign.beneficiary),
          getLatestChainTimestamp(),
        ]);
        if (cancelled) return;
        setDonors(contribs || []);
        setHasActiveDispute((disps || []).some((d) => !d.resolved));
        setEscrowBefore(eBal);
        setBeneficiaryBefore(bBal);
        setChainNow(latestTs);
      } catch (err) {
        console.warn("Error loading demo campaign details:", err);
      }
    }
    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedCampaign?.id, releaseResult]);

  if (!isOpen) return null;

  const isDeadlineReached = selectedCampaign ? chainNow >= selectedCampaign.deadline : false;
  const isGoalReached = selectedCampaign
    ? parseFloat(selectedCampaign.amountRaised) >= parseFloat(selectedCampaign.goal)
    : false;

  const secondsRemaining = selectedCampaign
    ? Math.max(0, selectedCampaign.deadline - chainNow)
    : 0;
  const daysRemaining = Math.ceil(secondsRemaining / 86400);

  const formatTs = (ts) =>
    new Date(ts * 1000).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleCopy = (txt) => {
    navigator.clipboard.writeText(txt);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Step 2: Advance local Hardhat blockchain time
  const handleSimulateExpiry = async (daysToAdvance) => {
    if (!isLocalDevNetwork) {
      setErrorMsg("Time manipulation is strictly disabled on non-local networks.");
      return;
    }
    setErrorMsg("");
    setSimulating(true);
    try {
      const secs = Math.max(60, Math.round(daysToAdvance * 86400));
      await fastForward(secs);
      const updatedTs = await getLatestChainTimestamp();
      setChainNow(updatedTs);
      if (onCompleted) await onCompleted();
    } catch (err) {
      setErrorMsg(err?.message || "Failed advancing local blockchain time.");
    } finally {
      setSimulating(false);
    }
  };

  // Step 3: Execute real smart contract releaseFunds()
  const handleReleaseToBeneficiary = async () => {
    if (!selectedCampaign) return;
    setErrorMsg("");
    setReleasing(true);

    try {
      // Snapshot exact balances right before calling the contract
      const preEscrow = await getAddressBalance(CONTRACT_ADDRESS);
      const preBeneficiary = await getAddressBalance(selectedCampaign.beneficiary);
      const releaseAmtStr = selectedCampaign.escrowBalance;
      const contribList = [...donors];

      // Execute actual on-chain smart contract releaseFunds(campaignId)
      const res = await releaseFunds(selectedCampaign.id);
      const receipt = res?.receipt;

      // Refresh live balances immediately after block confirmation
      const [postEscrow, postBeneficiary] = await Promise.all([
        getAddressBalance(CONTRACT_ADDRESS),
        getAddressBalance(selectedCampaign.beneficiary),
      ]);

      await refreshCampaigns();
      if (onCompleted) await onCompleted();

      const gasUsed = receipt?.gasUsed ? receipt.gasUsed.toString() : "N/A";
      const gasPrice = receipt?.gasPrice ?? receipt?.effectiveGasPrice ?? 0n;
      const gasFeeWei = receipt?.gasUsed && gasPrice ? receipt.gasUsed * gasPrice : 0n;
      const gasFeeEth = parseFloat(formatEther(gasFeeWei)).toFixed(6);

      // Aggregate unique donor wallets & total contributed
      const uniqueDonors = [];
      const seen = new Set();
      for (const d of contribList) {
        const lower = d.contributor.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          uniqueDonors.push(d.contributor);
        }
      }

      setReleaseResult({
        campaignId: selectedCampaign.id,
        campaignTitle: selectedCampaign.title,
        donors: uniqueDonors,
        beneficiary: selectedCampaign.beneficiary,
        amountContributed: selectedCampaign.amountRaised,
        totalReleased: releaseAmtStr,
        contractAddress: CONTRACT_ADDRESS,
        txHash: res.txHash || receipt?.hash,
        blockNumber: receipt?.blockNumber ?? "Confirmed",
        blockHash: receipt?.blockHash || "",
        from: receipt?.from || "",
        to: receipt?.to || CONTRACT_ADDRESS,
        gasUsed,
        gasFeeEth,
        status: "SUCCESSFUL",
        escrowBefore: preEscrow,
        escrowAfter: postEscrow,
        beneficiaryBefore: preBeneficiary,
        beneficiaryAfter: postBeneficiary,
      });
    } catch (err) {
      setErrorMsg(
        err?.reason ||
          err?.data?.message ||
          err?.message ||
          "Transaction failed during fund release."
      );
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden my-8 animate-fade-in">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#14532D] to-[#16A34A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                Simulate Campaign Expiry & Release Funds
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                Live Escrow Demonstration · Development Hardhat Network Only
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Production Network Guard Banner */}
          {!isLocalDevNetwork && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Development Feature Disabled on Live Network</span>
                <span>
                  Time simulation requires Hardhat Localhost (Chain ID 31337). You are currently on Chain ID {activeChainId}.
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* ==================== CONFIRMATION PANEL (AFTER RELEASE) ==================== */}
          {releaseResult ? (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-emerald-950">
                      Escrow Release Confirmed On-Chain
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                      {releaseResult.status}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    ETH transferred atomically from smart contract escrow to the beneficiary's MetaMask wallet.
                  </p>
                </div>
              </div>

              {/* Transaction Details Grid */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between gap-4 py-1 border-b border-gray-200/70">
                  <span className="text-gray-500 font-semibold">Campaign Name</span>
                  <span className="font-bold text-gray-900 text-right">
                    #{releaseResult.campaignId} · {releaseResult.campaignTitle}
                  </span>
                </div>
                <div className="flex justify-between gap-4 py-1 border-b border-gray-200/70">
                  <span className="text-gray-500 font-semibold">Donor Wallet Address</span>
                  <span className="font-mono text-gray-800 text-right break-all">
                    {releaseResult.donors.length > 0
                      ? releaseResult.donors.join(", ")
                      : "Verified Backer"}
                  </span>
                </div>
                <div className="flex justify-between gap-4 py-1 border-b border-gray-200/70">
                  <span className="text-gray-500 font-semibold">Beneficiary Wallet Address</span>
                  <span className="font-mono font-bold text-emerald-800 text-right break-all">
                    {releaseResult.beneficiary} ({getAccountName(releaseResult.beneficiary)})
                  </span>
                </div>
                <div className="flex justify-between gap-4 py-1 border-b border-gray-200/70">
                  <span className="text-gray-500 font-semibold">Amount Contributed</span>
                  <span className="font-bold text-gray-900">{releaseResult.amountContributed} ETH</span>
                </div>
                <div className="flex justify-between gap-4 py-1 border-b border-gray-200/70">
                  <span className="text-gray-500 font-semibold">Total Amount Released</span>
                  <span className="font-black text-emerald-700">{releaseResult.totalReleased} ETH</span>
                </div>
                <div className="flex justify-between gap-4 py-1 border-b border-gray-200/70">
                  <span className="text-gray-500 font-semibold">Escrow Contract Address</span>
                  <span className="font-mono text-gray-700 text-right break-all">
                    {releaseResult.contractAddress}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4 py-1 border-b border-gray-200/70">
                  <span className="text-gray-500 font-semibold">Transaction Hash</span>
                  <div className="flex items-center gap-1.5 font-mono text-gray-900">
                    <span className="truncate max-w-[230px]" title={releaseResult.txHash}>
                      {releaseResult.txHash}
                    </span>
                    <button
                      onClick={() => handleCopy(releaseResult.txHash)}
                      className="text-emerald-700 hover:text-emerald-900 p-1"
                      title="Copy Tx Hash"
                    >
                      {copiedHash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between gap-4 py-1 border-b border-gray-200/70">
                  <span className="text-gray-500 font-semibold">Block Number</span>
                  <span className="font-mono font-bold text-gray-900">#{releaseResult.blockNumber}</span>
                </div>
                <div className="flex justify-between gap-4 py-1">
                  <span className="text-gray-500 font-semibold">Transaction Status</span>
                  <span className="font-black text-emerald-700">{releaseResult.status}</span>
                </div>
              </div>

              {/* MetaMask Balance Verification */}
              <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4 space-y-3">
                <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-700" />
                  <span>MetaMask & On-Chain Balance Verification</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1">
                    <span className="text-[11px] font-bold text-gray-500 block">
                      Escrow Contract Balance
                    </span>
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-gray-600">Before:</span>
                      <span className="font-bold text-gray-900">
                        {parseFloat(releaseResult.escrowBefore).toFixed(4)} ETH
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-gray-600">After:</span>
                      <span className="font-black text-rose-700">
                        {parseFloat(releaseResult.escrowAfter).toFixed(4)} ETH
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1">
                    <span className="text-[11px] font-bold text-gray-500 block">
                      Beneficiary Wallet Balance
                    </span>
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-gray-600">Before:</span>
                      <span className="font-bold text-gray-900">
                        {parseFloat(releaseResult.beneficiaryBefore).toFixed(4)} ETH
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-gray-600">After:</span>
                      <span className="font-black text-emerald-700">
                        {parseFloat(releaseResult.beneficiaryAfter).toFixed(4)} ETH
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-600 leading-relaxed">
                  <strong>Gas Fee Paid by Caller:</strong> {releaseResult.gasFeeEth} ETH ({releaseResult.gasUsed} gas).
                  {releaseResult.from?.toLowerCase() === releaseResult.beneficiary?.toLowerCase()
                    ? " Note: Because the Admin caller and Beneficiary share the same wallet, gas fees were deducted from the same wallet receiving the payout."
                    : " Check MetaMask on the Beneficiary account to confirm the received ETH."}
                </p>
              </div>

              {/* View Transaction on Explorer / Local Receipt Inspector */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                {explorerUrl ? (
                  <a
                    href={`${explorerUrl}/tx/${releaseResult.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 px-4 bg-[#14532D] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Transaction on Blockchain Explorer</span>
                  </a>
                ) : (
                  <button
                    onClick={() => setShowLocalInspector(!showLocalInspector)}
                    className="flex-1 py-3 px-4 bg-[#14532D] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>View Transaction on Blockchain Explorer</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>

              {/* Local Hardhat Receipt Details Panel */}
              {showLocalInspector && !explorerUrl && (
                <div className="p-4 bg-gray-900 text-emerald-300 rounded-2xl font-mono text-[11px] space-y-1.5 break-all">
                  <div className="text-white font-bold font-sans text-xs mb-1">
                    Local Hardhat Node Transaction Receipt (Chain ID 31337)
                  </div>
                  <div>Tx Hash:     {releaseResult.txHash}</div>
                  <div>Block #:     {releaseResult.blockNumber}</div>
                  <div>Block Hash:  {releaseResult.blockHash}</div>
                  <div>Caller:      {releaseResult.from}</div>
                  <div>Contract:    {releaseResult.to}</div>
                  <div>Beneficiary: {releaseResult.beneficiary}</div>
                  <div>Released:    {releaseResult.totalReleased} ETH</div>
                  <div>Gas Used:    {releaseResult.gasUsed} ({releaseResult.gasFeeEth} ETH)</div>
                  <div>Status:      1 (SUCCESSFUL)</div>
                </div>
              )}
            </div>
          ) : (
            /* ==================== PRE-RELEASE WORKFLOW STEPS ==================== */
            <div className="space-y-5">
              {/* Step 1: Select Campaign Locked in Escrow */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
                  1. Select Campaign with ETH Locked in Escrow ({escrowCampaigns.length})
                </label>

                {escrowCampaigns.length === 0 ? (
                  <div className="p-5 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-center text-xs text-gray-600">
                    No active campaigns currently have unreleased ETH locked in escrow. Create a campaign and contribute ETH from another wallet first.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {escrowCampaigns.map((c) => {
                      const active = selectedCampaign?.id === c.id;
                      const goalOk = parseFloat(c.amountRaised) >= parseFloat(c.goal);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(c.id);
                            setErrorMsg("");
                          }}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            active
                              ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500"
                              : "bg-white border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 truncate">
                              #{c.id} · {c.title}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono">
                              Raised: {c.amountRaised} / {c.goal} ETH ·{" "}
                              <span className={goalOk ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                                {goalOk ? "Goal Met" : "Below Goal"}
                              </span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-extrabold rounded-lg shrink-0">
                            {c.escrowBalance} ETH
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedCampaign && (
                <>
                  {/* Campaign Escrow & Deadline Summary */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500 font-semibold">Current Escrow Balance:</span>
                      <span className="font-black text-emerald-700">{selectedCampaign.escrowBalance} ETH</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500 font-semibold">Beneficiary Address:</span>
                      <span className="font-mono font-bold text-gray-900 text-right break-all">
                        {selectedCampaign.beneficiary} ({getAccountName(selectedCampaign.beneficiary)})
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500 font-semibold">Original Campaign Deadline:</span>
                      <span className="font-bold text-gray-900">{formatTs(selectedCampaign.deadline)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500 font-semibold">Current Blockchain Clock:</span>
                      <span className="font-bold text-indigo-700">{formatTs(chainNow)}</span>
                    </div>
                    <div className="flex justify-between gap-2 pt-1.5 border-t border-gray-200">
                      <span className="text-gray-500 font-semibold">Escrow Contract Balance (Before):</span>
                      <span className="font-mono font-bold text-gray-900">
                        {escrowBefore ? `${parseFloat(escrowBefore).toFixed(4)} ETH` : "Loading..."}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500 font-semibold">Beneficiary Balance (Before):</span>
                      <span className="font-mono font-bold text-gray-900">
                        {beneficiaryBefore ? `${parseFloat(beneficiaryBefore).toFixed(4)} ETH` : "Loading..."}
                      </span>
                    </div>
                  </div>

                  {/* Step 2: 7-Day Expiry Simulation */}
                  {!isDeadlineReached ? (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                      <div className="flex items-start gap-2 text-xs text-amber-900">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">
                            Deadline Not Reached Yet ({daysRemaining} day(s) remaining on-chain)
                          </span>
                          <span className="text-[11px] text-amber-800">
                            Advance the local Hardhat node timestamp to demonstrate campaign expiry without altering contract rules.
                          </span>
                        </div>
                      </div>

                      <label className="flex items-start gap-2 text-xs text-gray-800 cursor-pointer bg-white p-2.5 rounded-xl border border-amber-200">
                        <input
                          type="checkbox"
                          checked={confirmedSim}
                          onChange={(e) => setConfirmedSim(e.target.checked)}
                          className="mt-0.5 accent-[#14532D]"
                        />
                        <span>
                          I confirm advancing the local Hardhat development blockchain clock to simulate expiry for Campaign #{selectedCampaign.id}.
                        </span>
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!isLocalDevNetwork || !confirmedSim || simulating}
                          onClick={() => handleSimulateExpiry(7)}
                          className="flex-1 py-2.5 px-4 bg-[#14532D] hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          {simulating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FastForward className="w-4 h-4" />
                          )}
                          <span>Simulate 7 Days Passing (+7 Days)</span>
                        </button>

                        {daysRemaining > 7 && (
                          <button
                            type="button"
                            disabled={!isLocalDevNetwork || !confirmedSim || simulating}
                            onClick={() => handleSimulateExpiry(daysRemaining + 1)}
                            className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Advance Past Full Deadline (+{daysRemaining + 1}d)
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Step 3: Deadline Reached -> Release Funds to Beneficiary */
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Campaign Deadline Reached On-Chain! Ready for Escrow Settlement.</span>
                      </div>

                      {!isGoalReached && (
                        <div className="p-2.5 bg-amber-100/80 border border-amber-300 rounded-xl text-[11px] text-amber-900 font-medium">
                          Note: This campaign raised {selectedCampaign.amountRaised} ETH out of its {selectedCampaign.goal} ETH goal. The smart contract only permits releasing funds if the goal is reached; otherwise backers can claim refunds.
                        </div>
                      )}

                      {hasActiveDispute && (
                        <div className="p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-[11px] text-rose-900 font-medium">
                          Note: This campaign has an active unresolved dispute. Resolve the dispute in the Disputes tab before releasing funds.
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={releasing || !isGoalReached || hasActiveDispute}
                        onClick={handleReleaseToBeneficiary}
                        className="w-full py-3 px-4 bg-gradient-to-r from-[#14532D] to-[#16A34A] hover:opacity-95 disabled:opacity-50 text-white rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        {releasing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Confirming On-Chain Release...</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4" />
                            <span>Release Funds to Beneficiary ({selectedCampaign.escrowBalance} ETH)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
