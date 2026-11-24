import React from "react";
import { Loader2, CheckCircle2, XCircle, ExternalLink, X } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { SUPPORTED_NETWORKS, CHAIN_ID } from "../blockchain/config";

export default function NotificationModal() {
  const { txState, clearTxStatus, chainId } = useWeb3();
  const { loading, hash, message, error } = txState;

  if (!loading && !hash && !message && !error) {
    return null;
  }

  const network = SUPPORTED_NETWORKS[chainId || CHAIN_ID];
  const explorerUrl = network?.blockExplorer && hash ? `${network.blockExplorer}/tx/${hash}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
        {/* Close Button */}
        {!loading && (
          <button
            onClick={clearTxStatus}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Content based on state */}
        <div className="text-center py-2">
          {loading && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Transaction in Progress</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {message || "Please confirm the transaction in MetaMask and wait for blockchain block confirmation..."}
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Transaction Failed</h3>
              <p className="text-xs text-rose-600 font-mono bg-rose-50/80 p-3 rounded-xl border border-rose-200 text-left max-h-36 overflow-y-auto break-words">
                {error}
              </p>
              <button
                onClick={clearTxStatus}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {!loading && !error && message && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Transaction Confirmed!</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{message}</p>

              {hash && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-left space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Tx Hash:</span>
                  <p className="font-mono text-xs text-gray-800 break-all select-all">{hash}</p>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline pt-1 font-semibold"
                    >
                      <span>View on Etherscan</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              <button
                onClick={clearTxStatus}
                className="w-full py-2.5 bg-[#14532D] hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-md"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
