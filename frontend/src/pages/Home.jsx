import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Sprout,
  Users,
  Coins,
  CheckCircle,
  Clock,
  Lock,
  Layers,
  ChevronRight,
  Award,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import CampaignCard from "../components/CampaignCard";

export default function Home() {
  const { campaigns, loadingCampaigns } = useWeb3();

  // Calculate live statistics from actual blockchain data
  const stats = useMemo(() => {
    let totalRaised = 0;
    let successfulCount = 0;

    campaigns.forEach((c) => {
      totalRaised += parseFloat(c.amountRaised || 0);
      if (c.status === "Successful" || c.status === "Withdrawn" || c.isGoalReached) {
        successfulCount++;
      }
    });

    return {
      totalCampaigns: campaigns.length,
      totalFundsRaised: totalRaised.toFixed(3),
      successfulCampaigns: successfulCount,
    };
  }, [campaigns]);

  // Featured campaigns (up to 3)
  const featuredCampaigns = useMemo(() => {
    return campaigns.slice(0, 3);
  }, [campaigns]);

  return (
    <div className="space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 pb-16">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-emerald-100/50 via-emerald-50/20 to-transparent -z-10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-xs font-semibold mb-8 shadow-sm">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>FundChain #6 • Ethereum Powered Crowdfunding</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-[1.15] max-w-4xl mx-auto mb-6">
            Fund Ideas.{" "}
            <span className="bg-gradient-to-r from-[#14532D] via-[#16A34A] to-emerald-500 bg-clip-text text-transparent">
              Create Impact.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Discover meaningful causes, support innovative ideas, and make fundraising transparent through blockchain technology. With automated smart contract refunds.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              to="/explore"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#14532D] to-[#16A34A] hover:from-[#114224] hover:to-[#15803D] text-white rounded-xl text-base font-bold shadow-lg shadow-emerald-900/15 hover:shadow-emerald-900/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Explore Campaigns</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/create"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-gray-800 border border-gray-300 hover:border-emerald-600 hover:text-emerald-700 rounded-xl text-base font-bold shadow-sm hover:shadow-md transition-all"
            >
              <span>Start a Campaign</span>
            </Link>
          </div>

          {/* Live Blockchain Statistics Banner */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-soft text-center">
              <p className="text-3xl font-extrabold text-[#14532D] tracking-tight">
                {stats.totalCampaigns}
              </p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                Total Campaigns
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-soft text-center">
              <p className="text-3xl font-extrabold text-[#16A34A] tracking-tight">
                {stats.totalFundsRaised} <span className="text-lg">ETH</span>
              </p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                Total Funds Raised
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-soft text-center">
              <p className="text-3xl font-extrabold text-[#14532D] tracking-tight">
                {stats.successfulCampaigns}
              </p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                Successful Projects
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/80 shadow-soft text-center">
              <p className="text-3xl font-extrabold text-amber-600 tracking-tight">
                100%
              </p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                Refund Guarantee
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BharatAgri / Agriculture Spotlight Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#14532D] via-[#166534] to-[#15803D] rounded-3xl p-8 sm:p-12 text-white shadow-xl">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-semibold border border-emerald-400/30">
              <Sprout className="w-3.5 h-3.5 text-emerald-300" />
              <span>Special Agricultural Focus • BharatAgri Use Case</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Empowering Farmers with Transparent Web3 Financing
            </h2>
            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
              Inspired by BharatAgri's pioneering work in agricultural procurement, FundChain allows rural farmers and farmer-producer cooperatives to crowdfund critical capital for solar drip irrigation, organic fertilizers, certified non-GMO seeds, and modern farming machinery.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                to="/explore?category=Agriculture"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#14532D] rounded-xl text-sm font-bold shadow-md hover:bg-emerald-50 transition-colors"
              >
                <span>View Agricultural Campaigns</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800/60 hover:bg-emerald-800 text-emerald-100 rounded-xl text-sm font-semibold border border-emerald-600/50 transition-colors"
              >
                <span>Submit Farm Equipment Request</span>
              </Link>
            </div>
          </div>
          {/* Subtle decoration */}
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-80 h-80 bg-white/5 rounded-full pointer-events-none blur-xl" />
        </div>
      </section>

      {/* Featured Campaigns Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Featured Campaigns
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Real-world causes deployed directly on the Ethereum smart contract.
            </p>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800 group"
          >
            <span>Explore All Campaigns ({campaigns.length})</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loadingCampaigns ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100 p-6 flex flex-col justify-between">
                <div className="h-40 bg-gray-100 rounded-xl mb-4" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : featuredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-12 text-center shadow-soft">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Campaigns Found Yet</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
              Connect your MetaMask wallet and create the very first decentralized campaign on FundChain.
            </p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#14532D] text-white rounded-xl text-sm font-bold shadow-md hover:bg-emerald-800 transition-colors"
            >
              <span>Create First Campaign</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section className="bg-white border-y border-gray-200/70 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              How FundChain Works
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-2">
              Four simple, automated steps powered by immutable smart contracts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="relative p-6 rounded-2xl bg-[#F8FAF7] border border-gray-200/70 hover:shadow-soft transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#14532D] font-extrabold flex items-center justify-center text-lg mb-4 shadow-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Create Campaign</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Connect MetaMask, specify your fundraising goal in ETH, and set an expiration deadline. The contract assigns a unique immutable ID.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative p-6 rounded-2xl bg-[#F8FAF7] border border-gray-200/70 hover:shadow-soft transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#14532D] font-extrabold flex items-center justify-center text-lg mb-4 shadow-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Receive Contributions</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Backers contribute ETH directly to the contract. All funds are escrowed trustlessly on Ethereum without any intermediary cut.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative p-6 rounded-2xl bg-[#F8FAF7] border border-gray-200/70 hover:shadow-soft transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#14532D] font-extrabold flex items-center justify-center text-lg mb-4 shadow-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Reach Funding Goal</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Track progress in real time. Transactions emit on-chain events that update campaign totals transparently for all participants.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative p-6 rounded-2xl bg-[#F8FAF7] border border-gray-200/70 hover:shadow-soft transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 font-extrabold flex items-center justify-center text-lg mb-4 shadow-sm">
                04
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Withdraw or Refund</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                If the goal is met, creator withdraws 100% of funds. If the campaign fails by the deadline, contributors claim 100% automatic refunds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Blockchain Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Decentralized Trust Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Why Use Blockchain for Crowdfunding?
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mt-2">
            Traditional platforms take hefty platform fees (5-10%), hold funds arbitrarily, and lack proof of refunds. FundChain solves this completely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-7 rounded-2xl border border-gray-200/80 shadow-soft hover:border-emerald-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">100% Transparency</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Every wallet address, wei contributed, and block timestamp is stored immutably on the public blockchain ledger.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-gray-200/80 shadow-soft hover:border-emerald-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-5">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Secure Transactions</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Protected by custom Reentrancy Guards and Checks-Effects-Interactions principles in Solidity ^0.8.20.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-gray-200/80 shadow-soft hover:border-emerald-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-5">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Public Records</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Easily audit contributions on blockchain explorers like Etherscan without needing centralized databases.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-gray-200/80 shadow-soft hover:border-emerald-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-5">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Guaranteed Refund</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Smart contract automatically locks refunds for eligible contributors if the target is not reached by the deadline.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
