import React, { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
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
  Edit2,
  Lock,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { shortenAddress } from "../blockchain/contract";
import { SUPPORTED_NETWORKS, ADMIN_ADDRESS } from "../blockchain/config";

export default function Navbar() {
  const {
    account,
    availableAccounts = [],
    accountBalances = {},
    selectAccount,
    getAccountName,
    setCustomAccountName,
    adminAddress,
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
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [unauthModalOpen, setUnauthModalOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const handleCopy = (textToCopy = account) => {
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
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

  const handleStartRename = () => {
    setNameInput(getAccountName(account));
    setEditingName(true);
  };

  const handleSaveRename = (e) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setCustomAccountName(account, nameInput.trim());
    }
    setEditingName(false);
  };

  const handleAdminClick = (e) => {
    e.preventDefault();
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    if (isAdmin) {
      navigate("/admin");
    } else {
      setUnauthModalOpen(true);
    }
  };

  const currentNetwork = chainId ? SUPPORTED_NETWORKS[chainId]?.name || `Chain ID: ${chainId}` : "Localhost (31337)";

  const navLinks = [
    { name: "Home", path: "/", icon: Layers },
    { name: "Explore Campaigns", path: "/explore", icon: Compass },
    { name: "Create Campaign", path: "/create", icon: PlusCircle },
    { name: "My Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Transaction History", path: "/transactions", icon: History },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all">
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
                    3.0 Web3
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-medium hidden sm:block -mt-0.5">
                  Transparent Fundraising. Powered by Blockchain.
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

              {/* Direct Admin Console Link */}
              <button
                onClick={handleAdminClick}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  location.pathname === "/admin"
                    ? "bg-emerald-100/80 text-emerald-900 font-bold"
                    : isAdmin
                    ? "text-emerald-800 hover:bg-emerald-50"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
                title={isAdmin ? "Open Protocol Admin Console" : "Admin Console (Requires Admin Wallet)"}
              >
                <ShieldCheck className={`w-4 h-4 ${isAdmin ? "text-emerald-700" : "text-gray-400"}`} />
                <span>Admin Console</span>
                {!isAdmin && <Lock className="w-3 h-3 text-gray-400" />}
              </button>
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
                    className="flex items-center gap-2.5 px-3.5 py-2 bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-emerald-300 hover:bg-emerald-50/20 transition-all text-sm cursor-pointer"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                    <div className="text-left">
                      <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5 leading-tight">
                        <span className="max-w-[120px] truncate">{getAccountName(account)}</span>
                        {isAdmin && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono leading-tight">
                        {shortenAddress(account)} · <strong className="text-emerald-700 font-sans">{balance} ETH</strong>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
                  </button>

                  {/* Account Profile Dropdown */}
                  {dropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4.5 z-50 animate-fade-in"
                      onMouseLeave={() => {
                        setDropdownOpen(false);
                        setEditingName(false);
                      }}
                    >
                      {/* Header & Active Account Label */}
                      <div className="pb-3 border-b border-gray-100 space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                            Connected Account
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            {currentNetwork}
                          </span>
                        </div>

                        {/* Account Name & Edit Option */}
                        <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
                          {editingName ? (
                            <form onSubmit={handleSaveRename} className="flex items-center gap-1.5 w-full">
                              <input
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                className="flex-1 px-2.5 py-1 text-xs border border-emerald-400 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
                                placeholder="Account label..."
                                autoFocus
                              />
                              <button
                                type="submit"
                                className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingName(false)}
                                className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300"
                              >
                                ✕
                              </button>
                            </form>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-gray-900 text-sm">
                                  {getAccountName(account)}
                                </span>
                                {isAdmin && (
                                  <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">
                                    Admin Role
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={handleStartRename}
                                className="p-1 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Edit Account Label"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Address with full copy and hover */}
                        <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-mono text-gray-600">
                          <span className="truncate mr-2" title={account}>
                            {account}
                          </span>
                          <button
                            onClick={() => handleCopy(account)}
                            className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-sans font-bold hover:bg-emerald-50 px-2 py-0.5 rounded transition-colors"
                          >
                            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copied ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Balances Card */}
                      <div className="py-3">
                        <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/50 p-3 rounded-2xl border border-emerald-100 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-600 flex items-center gap-1.5 font-medium">
                              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                              MetaMask Balance:
                            </span>
                            <span className="font-black text-gray-900 text-sm">{balance} ETH</span>
                          </div>
                          <div className="flex justify-between items-center text-xs pt-1 border-t border-emerald-100/70">
                            <span className="text-gray-600 flex items-center gap-1.5 font-medium">
                              <Shield className="w-3.5 h-3.5 text-emerald-600" />
                              FundChain Vault Balance:
                            </span>
                            <span className="font-black text-emerald-800 text-sm">{vaultBalance} ETH</span>
                          </div>
                        </div>
                      </div>

                      {/* Other Authorized Accounts List */}
                      {availableAccounts && availableAccounts.length > 1 && (
                        <div className="py-2.5 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-emerald-600" /> Other Connected Accounts
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold">{availableAccounts.length} accounts</span>
                          </div>
                          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                            {availableAccounts.map((acc) => {
                              const isActive = acc.toLowerCase() === account.toLowerCase();
                              const accName = getAccountName(acc);
                              const accBal = accountBalances[acc.toLowerCase()] || "...";
                              return (
                                <button
                                  key={acc}
                                  onClick={() => {
                                    if (!isActive) selectAccount(acc);
                                  }}
                                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all text-left ${
                                    isActive
                                      ? "bg-emerald-50/80 text-emerald-950 font-bold border border-emerald-200 shadow-xs"
                                      : "hover:bg-gray-50 text-gray-700 border border-gray-100"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-gray-300"}`} />
                                      <span className="font-bold text-gray-900 text-xs">{accName}</span>
                                    </div>
                                    <div className="font-mono text-[11px] text-gray-500 pl-3.5">
                                      {shortenAddress(acc)} · <span className="font-sans font-semibold text-gray-800">{accBal} ETH</span>
                                    </div>
                                  </div>
                                  {isActive ? (
                                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Active
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-emerald-700 hover:underline font-bold">
                                      Switch
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Quick Links & Actions */}
                      <div className="pt-2.5 border-t border-gray-100 flex flex-col gap-1 text-xs">
                        {/* Switch Account */}
                        <button
                          onClick={handleSwitch}
                          className="w-full flex items-center justify-between p-2 rounded-xl text-gray-700 hover:text-emerald-800 hover:bg-emerald-50/60 font-semibold transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
                            <span>Switch Account via MetaMask</span>
                          </div>
                          <span className="text-[10px] text-gray-400">Request</span>
                        </button>

                        {/* Add Money / Vault */}
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            openAddMoneyModal();
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl text-gray-700 hover:text-emerald-800 hover:bg-emerald-50/60 font-semibold transition-colors text-left"
                        >
                          <Coins className="w-4 h-4 text-emerald-600" />
                          <span>Add Money / Fund Vault</span>
                        </button>

                        {/* User Dashboard */}
                        <Link
                          to="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 p-2 rounded-xl text-gray-700 hover:text-emerald-800 hover:bg-emerald-50/60 font-semibold transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-gray-500" />
                          <span>My Portfolio & Contributions</span>
                        </Link>

                        {/* Transaction History */}
                        <Link
                          to="/transactions"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 p-2 rounded-xl text-gray-700 hover:text-emerald-800 hover:bg-emerald-50/60 font-semibold transition-colors"
                        >
                          <History className="w-4 h-4 text-gray-500" />
                          <span>Transaction History</span>
                        </Link>

                        {/* Admin Dashboard */}
                        <button
                          onClick={handleAdminClick}
                          className={`w-full flex items-center justify-between p-2 rounded-xl font-bold transition-colors text-left ${
                            isAdmin
                              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ShieldCheck className={`w-4 h-4 ${isAdmin ? "text-emerald-600" : "text-gray-400"}`} />
                            <span>Admin Dashboard</span>
                          </div>
                          {!isAdmin && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                        </button>

                        {/* Disconnect */}
                        <button
                          onClick={() => {
                            disconnectWallet();
                            setDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold transition-colors text-left mt-1"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Disconnect Wallet</span>
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
                  <span>{isConnecting ? "Connecting..." : "Connect MetaMask"}</span>
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

              <button
                onClick={handleAdminClick}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 text-left"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Admin Console</span>
                </div>
                {!isAdmin && <Lock className="w-4 h-4 text-gray-400" />}
              </button>
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
                      <p className="font-extrabold text-xs text-gray-900">{getAccountName(account)}</p>
                      <p className="font-mono text-[11px] text-gray-500">{shortenAddress(account)}</p>
                      <p className="text-xs text-gray-700 font-semibold mt-1">Wallet: {balance} ETH</p>
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

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSwitch();
                      }}
                      className="py-2 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-center gap-1.5 shadow-sm active:bg-gray-50"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Switch Account</span>
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

      {/* Unauthorized Admin Access Modal */}
      {unauthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5 text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full text-xs font-bold border border-amber-200">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Protocol Admin Access Restricted</span>
              </div>
              <button
                onClick={() => setUnauthModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-black text-gray-900">
                Unauthorized Admin Wallet
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                The <strong>Protocol Admin Console</strong> is cryptographically protected by the smart contract's <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">onlyAdmin</code> modifier. Only the designated smart contract administrator address can access this dashboard.
              </p>

              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div>
                  <span className="text-gray-500 block text-[11px] font-bold uppercase tracking-wider">
                    Currently Connected Wallet:
                  </span>
                  <span className="font-mono font-semibold text-gray-900 break-all">
                    {account} ({getAccountName(account)})
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-500 block text-[11px] font-bold uppercase tracking-wider">
                    Designated Protocol Administrator:
                  </span>
                  <span className="font-mono font-bold text-emerald-800 break-all">
                    {adminAddress || ADMIN_ADDRESS}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={async () => {
                  setUnauthModalOpen(false);
                  try {
                    const targetAdmin = (adminAddress || ADMIN_ADDRESS).toLowerCase();
                    let nextAcc;
                    if (!isConnected) {
                      nextAcc = await connectWallet();
                    } else if (
                      availableAccounts.some((a) => a.toLowerCase() === targetAdmin)
                    ) {
                      const exactAdmin = availableAccounts.find(
                        (a) => a.toLowerCase() === targetAdmin
                      );
                      await selectAccount(exactAdmin);
                      nextAcc = exactAdmin;
                    } else {
                      nextAcc = await switchWallet();
                    }
                    if (nextAcc && nextAcc.toLowerCase() === targetAdmin) {
                      navigate("/admin");
                    }
                  } catch (e) {
                    console.warn(e);
                  }
                }}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#14532D] to-[#16A34A] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02] transition-all cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>{isConnected ? "Switch to Admin Wallet" : "Connect Admin Wallet"}</span>
              </button>
              <button
                onClick={() => setUnauthModalOpen(false)}
                className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
