import React from "react";
import { AlertTriangle, ArrowRight, Terminal, Info } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { CHAIN_ID, CONTRACT_ADDRESS, SUPPORTED_NETWORKS } from "../blockchain/config";

export default function NetworkBanner() {
  const { isConnected, isCorrectNetwork, chainId, switchNetwork, contractAvailable, campaigns } = useWeb3();

  const targetNetwork = SUPPORTED_NETWORKS[CHAIN_ID] || { name: `Chain ID: ${CHAIN_ID}` };

  // Case 1: Connected to wrong network
  if (isConnected && !isCorrectNetwork) {
    return (
      <div className="bg-amber-600 text-white px-4 py-3 text-sm shadow-inner transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-100" />
            <span>
              <strong>Wrong Network Detected:</strong> Your wallet is connected to Chain ID {chainId}, but FundChain is configured for{" "}
              <strong>{targetNetwork.name}</strong>.
            </span>
          </div>
          <button
            onClick={() => switchNetwork(CHAIN_ID)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-50 shadow-sm transition-all flex-shrink-0"
          >
            <span>Switch to {targetNetwork.name}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Case 2: Contract not yet reachable on local RPC / node offline
  if (!contractAvailable && campaigns.length === 0) {
    return (
      <div className="bg-emerald-950 text-emerald-100 px-4 py-2.5 text-xs border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Blockchain Standby:</strong> Smart contract configured at <code className="bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-200 font-mono">{CONTRACT_ADDRESS}</code>. Start local node with <code className="bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono">npm run node</code> or connect MetaMask to Sepolia.
            </span>
          </div>
          <span className="text-[11px] text-emerald-400 font-medium">
            Project #6 • Decentralized Escrow & Refund
          </span>
        </div>
      </div>
    );
  }

  return null;
}
