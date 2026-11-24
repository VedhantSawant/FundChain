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
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { shortenAddress } from "../blockchain/contract";
import { SUPPORTED_NETWORKS } from "../blockchain/config";

export default function Navbar() {
  const { account, balance, isConnected, isConnecting, chainId, connectWallet, disconnectWallet } = useWeb3();
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

  const currentNetwork = chainId ? SUPPORTED_NETWORKS[chainId]?.name || `Chain ID: ${chainId}` : "Localhost (31337)";

  const navLinks = [
    { name: "Home", path: "/", icon: Layers },
    { name: "Explore Campaigns", path: "/explore", icon: Compass },
    { name: "Create Campaign", path: "/create", icon: PlusCircle },
    { name: "My Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Transaction History", path: "/transactions", icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all">
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

            {/* Wallet Button */}
            {isConnected ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-emerald-300 hover:bg-emerald-50/30 transition-all font-mono text-sm"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                  <span className="font-semibold text-gray-800">{shortenAddress(account)}</span>
                  <span className="text-xs text-gray-500 font-sans font-medium bg-gray-100 px-2 py-0.5 rounded-md">
                    {balance} ETH
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Account Dropdown */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-hover border border-gray-100 p-4 z-50"
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Connected Wallet</span>
                      <button
                        onClick={handleCopy}
                        className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>

                    <div className="py-3">
                      <p className="font-mono text-xs text-gray-800 break-all bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        {account}
                      </p>
                      <div className="mt-2 flex justify-between items-center text-xs text-gray-600">
                        <span>Balance:</span>
                        <span className="font-bold text-gray-900">{balance} ETH</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex flex-col gap-1.5">
                      <Link
                        to="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-emerald-700 p-2 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                        Go to My Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setDropdownOpen(false);
                        }}
                        className="flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        Disconnect Wallet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#14532D] to-[#16A34A] text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-900/10 hover:shadow-lg hover:shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
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
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs font-semibold text-gray-900">{shortenAddress(account)}</p>
                  <p className="text-xs text-gray-500">{balance} ETH</p>
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
