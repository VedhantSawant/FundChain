import React from "react";
import { Link } from "react-router-dom";
import { Layers, ShieldCheck, ExternalLink, Github, Heart, Sprout } from "lucide-react";
import { CONTRACT_ADDRESS } from "../blockchain/config";
import { shortenAddress } from "../blockchain/contract";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200/80 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-gray-100">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#14532D] to-[#16A34A] flex items-center justify-center text-white shadow-md">
                <Layers className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-gray-900">
                FUND<span className="text-[#16A34A]">CHAIN</span>
              </span>
            </div>
            <p className="text-sm text-gray-600 max-w-md leading-relaxed">
              Transparent Fundraising. Powered by Blockchain. A decentralized crowdfunding platform featuring an automated, tamper-proof refund mechanism for donors and creators.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full font-medium border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Solidity ^0.8.20 Verified Smart Contract
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Contract Address:{" "}
              <span className="font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200 text-gray-700">
                {CONTRACT_ADDRESS}
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Platform Navigation
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li>
                <Link to="/" className="hover:text-emerald-700 transition-colors">
                  Home Landing
                </Link>
              </li>
              <li>
                <Link to="/explore" className="hover:text-emerald-700 transition-colors">
                  Explore Campaigns
                </Link>
              </li>
              <li>
                <Link to="/create" className="hover:text-emerald-700 transition-colors">
                  Start a Campaign
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-emerald-700 transition-colors">
                  My Dashboard
                </Link>
              </li>
              <li>
                <Link to="/transactions" className="hover:text-emerald-700 transition-colors">
                  Transaction History
                </Link>
              </li>
            </ul>
          </div>

          {/* Project Details */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Academic Project
            </h4>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              <strong>College Mini-Project #6</strong>
              <br />
              Decentralized Crowdfunding Platform with Automated Refund Mechanism.
            </p>
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1.5 text-xs text-emerald-900">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                <Sprout className="w-4 h-4 text-emerald-600" />
                <span>Agricultural Funding</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Inspired by BharatAgri's model for transparent farmer equipment & seed financing.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} FundChain. All rights reserved on the Ethereum Blockchain.</p>
          <p className="flex items-center gap-1">
            Built with Solidity, Ethers.js, React & Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}
