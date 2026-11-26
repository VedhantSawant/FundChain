import React, { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Layers,
  Compass,
  PlusCircle,
  LayoutDashboard,
  History,
  Wallet,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Copy,
  Check,
  ExternalLink,
  Users,
  Coins,
  ArrowLeftRight,
  Shield,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { shortenAddress } from "../blockchain/contract";
import { SUPPORTED_NETWORKS } from "../blockchain/config";

export default function Navbar() {
  const {
    account,
    availableAccounts = [],
    selectAccount,
    isAdmin,
    balance,
    vaultBalance,
    isConnected,
    isConnecting,
    chainId,
    connectWallet,
    switchWallet,
    disconnectWallet,
    openAddMoneyModal,
  } = useWeb3();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const location = useLocation();

  const handleCopy = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSwitch = async () => {
    setDropdownOpen(false);
    try {
      await switchWallet();
    } catch (err) {
      console.warn("Wallet switch canceled or failed:", err.message);
    }
  };

  const currentNetwork = chainId ? SUPPORTED_NETWORKS[chainId]?.name || `Chain ID: ${chainId}` : "Localhost (31337)";

  const navLinks = [
    { name: "Home", path: "/", icon: Layers },
    { name: "Explore Campaigns", path: "/explore", icon: Compass },
    { name: "Create Campaign", path: "/create", icon: PlusCircle },
    { name: "My Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Transaction History", path: "/transactions", icon: History },
    ...(isAdmin ? [{ name: "Admin Console", path: "/admin", icon: ShieldCheck, isAdmin: true }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#14532D] to-[#16A34A] flex items-center justify-center text-white shadow-md shadow-emerald-900/10 group-hover:scale-105 transition-transform">
              <Layers className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-gray-900">
                  FUND<span className="text-[#16A34A]">CHAIN</span>
                </span>
                <span className="bg-emerald-100 text-[#14532D] text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                  Web3
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium hidden sm:block -mt-0.5">
                Transparent Fundraising
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-gray-400"}`} />
                  {link.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action: Network & Wallet Button */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Network Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200/80 rounded-xl text-xs font-medium text-gray-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{currentNetwork}</span>
            </div>

            {/* Wallet Profile Button */}
            {isConnected ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 px-3.5 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-emerald-300 hover:bg-emerald-50/30 transition-all font-mono text-sm"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                  <span className="font-semibold text-gray-800">{shortenAddress(account)}</span>
                  <span className="text-xs text-gray-500 font-sans font-medium bg-gray-100 px-2 py-0.5 rounded-md">
                    {balance} ETH
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Account Profile Dropdown */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-84 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 z-50 animate-fade-in"
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                        Connected Account
                      </span>
                      <button
                        onClick={handleCopy}
                        className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-semibold hover:bg-emerald-50 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>

                    {/* Address & Balances */}
                    <div className="py-3 space-y-2">
                      <p className="font-mono text-xs text-gray-800 break-all bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-medium">
                        {account}
                      </p>
                      <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-gray-700">
                          <span className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                            MetaMask Balance:
                          </span>
                          <span className="font-extrabold text-gray-900">{balance} ETH</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-700">
                          <span className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-600" />
                            Vault Balance:
                          </span>
                          <span className="font-extrabold text-emerald-800">{vaultBalance} ETH</span>
                        </div>
                      </div>
                    </div>

                    {/* Authorized Accounts List if multiple available */}
                    {availableAccounts && availableAccounts.length > 1 && (
                      <div className="py-2 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-1.5 px-0.5">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3 h-3 text-emerald-600" /> Authorized Accounts
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">{availableAccounts.length} detected</span>
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                          {availableAccounts.map((acc) => {
                            const isActive = acc.toLowerCase() === account.toLowerCase();
                            return (
                              <button
                                key={acc}
                                onClick={() => {
                                  if (!isActive) selectAccount(acc);
                                }}
                                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all text-left ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80 shadow-xs"
                                    : "hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-transparent font-medium"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-gray-300"}`} />
                                  <span className="font-mono text-xs">{shortenAddress(acc)}</span>
                                </div>
                                {isActive ? (
                                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Active
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-emerald-600 hover:underline font-semibold">
                                    Switch
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-gray-100 flex flex-col gap-1.5">
                      {/* Switch Wallet Button */}
                      <button
                        onClick={handleSwitch}
                        className="w-full flex items-center justify-between text-xs font-bold text-gray-800 hover:text-emerald-800 p-2.5 rounded-xl bg-gray-50 hover:bg-emerald-50/70 border border-gray-100 hover:border-emerald-200 transition-all text-left group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1 rounded-lg bg-emerald-100/70 text-emerald-700 group-hover:scale-105 transition-transform">
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">Switch Account</div>
                            <div className="text-[10px] text-gray-500 font-normal">Choose or connect account in MetaMask</div>
                          </div>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90" />
                      </button>

                      {/* Add Money Button */}
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          openAddMoneyModal();
                        }}
                        className="flex items-center gap-2.5 text-xs font-bold text-gray-800 hover:text-emerald-800 p-2.5 rounded-xl hover:bg-emerald-50 transition-colors text-left"
                      >
                        <Coins className="w-4 h-4 text-emerald-600" />
                        <span>Add Money / Fund Vault</span>
                      </button>

                      {/* Admin Console if Admin */}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 text-xs font-bold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 p-2.5 rounded-xl border border-emerald-200 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Protocol Admin Console</span>
                        </Link>
                      )}

                      {/* Go to Dashboard */}
                      <Link
                        to="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 text-xs font-bold text-gray-700 hover:text-emerald-700 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-gray-500" />
                        <span>Go to My Dashboard</span>
                      </Link>

                      {/* Disconnect */}
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setDropdownOpen(false);
                        }}
                        className="flex items-center gap-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 p-2.5 rounded-xl hover:bg-rose-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#14532D] to-[#16A34A] text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-900/10 hover:shadow-lg hover:shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-100 px-4 pt-2 pb-6 space-y-3">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-emerald-600" : "text-gray-400"}`} />
                  {link.name}
                </NavLink>
              );
            })}
          </div>

          {/* Mobile Wallet Action */}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>Network:</span>
              <span className="font-semibold text-gray-700">{currentNetwork}</span>
            </div>
            {isConnected ? (
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-xs font-bold text-gray-900">{shortenAddress(account)}</p>
                    <p className="text-xs text-gray-600">Wallet: {balance} ETH</p>
                    <p className="text-xs text-emerald-700 font-semibold">Vault: {vaultBalance} ETH</p>
                  </div>
                  <button
                    onClick={() => {
                      disconnectWallet();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs text-rose-600 font-semibold hover:underline"
                  >
                    Disconnect
                  </button>
                </div>

                {/* Mobile Available Accounts List */}
                {availableAccounts && availableAccounts.length > 1 && (
                  <div className="pt-2 border-t border-gray-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-600" /> Authorized Accounts
                    </span>
                    <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-0.5">
                      {availableAccounts.map((acc) => {
                        const isActive = acc.toLowerCase() === account.toLowerCase();
                        return (
                          <button
                            key={acc}
                            onClick={() => {
                              selectAccount(acc);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-mono ${
                              isActive
                                ? "bg-emerald-100/70 text-emerald-900 font-bold"
                                : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <span>{shortenAddress(acc)}</span>
                            {isActive ? (
                              <span className="text-[9px] bg-emerald-600 text-white font-sans font-bold px-1 rounded">
                                Active
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-sans font-semibold">
                                Switch
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSwitch();
                    }}
                    className="py-2 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-center gap-1.5 shadow-sm active:bg-gray-50"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Switch</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAddMoneyModal();
                    }}
                    className="py-2 px-3 bg-[#14532D] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:bg-[#0f3e21]"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Add Money</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  connectWallet();
                  setMobileMenuOpen(false);
                }}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#14532D] to-[#16A34A] text-white rounded-xl text-sm font-semibold shadow-md"
              >
                <Wallet className="w-4 h-4" />
                <span>{isConnecting ? "Connecting..." : "Connect MetaMask"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
