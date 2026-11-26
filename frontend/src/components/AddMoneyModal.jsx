import React, { useState } from "react";
import {
  X,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Sparkles,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { CHAIN_ID, SUPPORTED_NETWORKS } from "../blockchain/config";
import { shortenAddress } from "../blockchain/contract";

export default function AddMoneyModal() {
  const {
    account,
    balance,
    vaultBalance,
    chainId,
    isAddMoneyOpen,
    closeAddMoneyModal,
    depositFunds,
    withdrawVaultDeposit,
    requestFaucet,
  } = useWeb3();

  const [activeTab, setActiveTab] = useState("vault"); // "vault", "withdrawVault", "wallet"
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  if (!isAddMoneyOpen) return null;

  const isLocalhost = chainId === 31337;
  const currentNetwork = chainId ? SUPPORTED_NETWORKS[chainId]?.name || `Chain ID ${chainId}` : "Localhost";

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid ETH amount greater than 0");
      return;
    }
    setIsSubmitting(true);
    try {
      await depositFunds(amount);
      setAmount("");
      closeAddMoneyModal();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawVault = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid ETH amount greater than 0");
      return;
    }
    if (parseFloat(amount) > parseFloat(vaultBalance)) {
      alert("Amount exceeds your available FundChain Vault balance");
      return;
    }
    setIsSubmitting(true);
    try {
      await withdrawVaultDeposit(amount);
      setAmount("");
      closeAddMoneyModal();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimFaucet = async () => {
    setFaucetLoading(true);
    try {
      await requestFaucet();
    } catch (err) {
      console.error(err);
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleCopy = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
        {/* Close Button */}
        <button
          onClick={closeAddMoneyModal}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#14532D] flex items-center justify-center shadow-sm">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Add Money & Manage Balance</h2>
            <p className="text-xs text-gray-500 font-mono">
              Account: {shortenAddress(account)}
            </p>
          </div>
        </div>

        {/* Balances Glance */}
        <div className="grid grid-cols-2 gap-3 mb-6 bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-xs">
          <div>
            <span className="text-gray-500 block mb-0.5">MetaMask Wallet:</span>
            <span className="font-extrabold text-base text-gray-900">{balance} ETH</span>
          </div>
          <div>
            <span className="text-gray-500 block mb-0.5">FundChain Vault:</span>
            <span className="font-extrabold text-base text-emerald-700">{vaultBalance} ETH</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-6 text-xs font-bold text-gray-600">
          <button
            onClick={() => {
              setActiveTab("vault");
              setAmount("");
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === "vault"
                ? "bg-white text-emerald-800 shadow-sm"
                : "hover:text-gray-900"
            }`}
          >
            Deposit to Vault
          </button>
          <button
            onClick={() => {
              setActiveTab("withdrawVault");
              setAmount("");
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === "withdrawVault"
                ? "bg-white text-emerald-800 shadow-sm"
                : "hover:text-gray-900"
            }`}
          >
            Withdraw Vault
          </button>
          <button
            onClick={() => setActiveTab("wallet")}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === "wallet"
                ? "bg-white text-emerald-800 shadow-sm"
                : "hover:text-gray-900"
            }`}
          >
            Fund MetaMask
          </button>
        </div>

        {/* TAB 1: Deposit to Vault */}
        {activeTab === "vault" && (
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5 text-xs">
                <label className="font-bold text-gray-700 uppercase tracking-wider">
                  Amount to Deposit
                </label>
                <span className="text-gray-500">Wallet Balance: {balance} ETH</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.001"
                  placeholder="0.5"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-4 pr-16 py-3 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                  ETH
                </span>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="flex gap-2">
              {["0.1", "0.5", "1.0", "2.0"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className="flex-1 py-1.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-lg text-xs font-semibold transition-all border border-gray-200"
                >
                  +{preset}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              Deposits ETH from your MetaMask wallet into the verified smart contract vault. You can withdraw your vault balance back to your wallet at any time.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-[#14532D] to-[#16A34A] hover:from-[#114224] hover:to-[#15803D] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>{isSubmitting ? "Confirming on Blockchain..." : "Confirm Deposit via MetaMask"}</span>
            </button>
          </form>
        )}

        {/* TAB 2: Withdraw from Vault */}
        {activeTab === "withdrawVault" && (
          <form onSubmit={handleWithdrawVault} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5 text-xs">
                <label className="font-bold text-gray-700 uppercase tracking-wider">
                  Amount to Withdraw
                </label>
                <span className="text-emerald-700 font-bold">Vault Balance: {vaultBalance} ETH</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.001"
                  max={vaultBalance}
                  placeholder="0.2"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-4 pr-16 py-3 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                  ETH
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAmount(vaultBalance)}
                className="py-1 px-3 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-lg text-xs font-semibold transition-all border border-gray-200"
              >
                Max ({vaultBalance} ETH)
              </button>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              Withdraws your funds directly from the FundChain smart contract vault back into your connected MetaMask wallet.
            </p>

            <button
              type="submit"
              disabled={isSubmitting || parseFloat(vaultBalance) <= 0}
              className="w-full py-3.5 bg-[#14532D] hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{isSubmitting ? "Withdrawing..." : "Withdraw to MetaMask Wallet"}</span>
            </button>
          </form>
        )}

        {/* TAB 3: Fund MetaMask Wallet (Faucet / External) */}
        {activeTab === "wallet" && (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <Info className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Non-Custodial Blockchain Wallet</span>
              </div>
              <p className="leading-relaxed">
                MetaMask stores your private keys directly on your device. Funds in your wallet are real blockchain assets on <strong>{currentNetwork}</strong>.
              </p>
            </div>

            {isLocalhost ? (
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <span className="text-xs font-bold text-gray-700 block">
                    Localhost Blockchain Test Faucet (Port 8545):
                  </span>
                  <p className="text-xs text-gray-600">
                    Click below to send <strong>1.0 free test ETH</strong> directly to your connected account from the local Hardhat node.
                  </p>
                  <button
                    onClick={handleClaimFaucet}
                    disabled={faucetLoading}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{faucetLoading ? "Transferring 1.0 ETH..." : "Claim 1.0 Test ETH (Local Faucet)"}</span>
                  </button>
                </div>

                <div className="text-xs text-gray-500 space-y-1 pt-1">
                  <span className="font-semibold text-gray-700 block">Or import a pre-funded test account (10,000 ETH):</span>
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex items-center justify-between font-mono text-[11px]">
                    <span className="truncate pr-2">0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</span>
                    <button
                      onClick={() => handleCopy("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")}
                      className="text-emerald-700 font-semibold hover:underline flex items-center gap-1 flex-shrink-0"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey ? "Copied" : "Copy Key"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600">
                  To get test ETH on Ethereum Sepolia Testnet, use an authenticated public faucet:
                </p>
                <div className="flex flex-col gap-2">
                  <a
                    href="https://cloud.google.com/application/faucets/ethereum/sepolia"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl border border-gray-200 flex items-center justify-between font-semibold text-emerald-800 transition-colors"
                  >
                    <span>Google Cloud Web3 Sepolia Faucet</span>
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                  </a>
                  <a
                    href="https://sepoliafaucet.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl border border-gray-200 flex items-center justify-between font-semibold text-emerald-800 transition-colors"
                  >
                    <span>Alchemy Sepolia Faucet</span>
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
