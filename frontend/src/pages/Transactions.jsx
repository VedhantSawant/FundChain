import React, { useState, useEffect, useMemo } from "react";
import {
  History,
  Search,
  Filter,
  ExternalLink,
  PlusCircle,
  Coins,
  ArrowDownLeft,
  RotateCcw,
  Layers,
  Copy,
  Check,
  Calendar,
  User,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { shortenAddress } from "../blockchain/contract";
import { SUPPORTED_NETWORKS, CHAIN_ID } from "../blockchain/config";

const EVENT_FILTERS = [
  { id: "all", label: "All Transactions" },
  { id: "CampaignCreated", label: "Campaigns Created" },
  { id: "ContributionReceived", label: "Contributions" },
  { id: "FundsWithdrawn", label: "Withdrawals" },
  { id: "RefundClaimed", label: "Refunds" },
];

export default function Transactions() {
  const { getAllContractEvents, chainId } = useWeb3();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTx, setCopiedTx] = useState(null);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      try {
        const data = await getAllContractEvents();
        setEvents(data);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [getAllContractEvents]);

  const handleCopy = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedTx(hash);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const network = SUPPORTED_NETWORKS[chainId || CHAIN_ID];
  const explorerUrl = network?.blockExplorer;

  // Filtered list
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesFilter = selectedFilter === "all" || ev.type === selectedFilter;
      const matchesSearch =
        searchQuery === "" ||
        ev.txHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(ev.campaignId).includes(searchQuery) ||
        (ev.title && ev.title.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesFilter && matchesSearch;
    });
  }, [events, selectedFilter, searchQuery]);

  const renderBadge = (type) => {
    switch (type) {
      case "CampaignCreated":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <PlusCircle className="w-3.5 h-3.5" />
            Created
          </span>
        );
      case "ContributionReceived":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Coins className="w-3.5 h-3.5" />
            Contributed
          </span>
        );
      case "FundsWithdrawn":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Withdrawn
          </span>
        );
      case "RefundClaimed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
            <RotateCcw className="w-3.5 h-3.5" />
            Refunded
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="border-b border-gray-200/80 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full mb-3">
          <History className="w-3.5 h-3.5" />
          <span>Immutable Ledger Events</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Blockchain Transaction History
        </h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          Real-time smart contract events emitted by FundChain on Ethereum. Every transaction is verifiable and public.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-soft space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by transaction hash, wallet address, or campaign ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAF7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium"
          />
        </div>

        {/* Event Type Filters */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 items-center">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2">
            Event Type:
          </span>
          {EVENT_FILTERS.map((f) => {
            const isSelected = selectedFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-[#14532D] text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-gray-500 animate-pulse space-y-3">
            <History className="w-8 h-8 text-emerald-600 mx-auto animate-spin" />
            <p>Querying Ethereum block events for FundChain contract...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Event Type</th>
                  <th className="py-4 px-6">Campaign</th>
                  <th className="py-4 px-6">Participant Wallet</th>
                  <th className="py-4 px-6">Amount (ETH)</th>
                  <th className="py-4 px-6">Date & Time</th>
                  <th className="py-4 px-6 text-right">Transaction Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEvents.map((ev, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    {/* Event Type */}
                    <td className="py-4 px-6">
                      {renderBadge(ev.type)}
                    </td>

                    {/* Campaign ID & Title */}
                    <td className="py-4 px-6 font-medium text-gray-900">
                      <div>
                        <span className="font-bold">#{ev.campaignId}</span>
                        {ev.title && (
                          <span className="text-xs text-gray-500 block truncate max-w-[200px]">
                            {ev.title}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Participant Wallet */}
                    <td className="py-4 px-6 font-mono text-xs text-gray-800">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>{shortenAddress(ev.address)}</span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-6 font-bold text-gray-900">
                      {ev.amount ? `${ev.amount} ETH` : "-"}
                    </td>

                    {/* Timestamp */}
                    <td className="py-4 px-6 text-xs text-gray-500">
                      {new Date(ev.timestamp).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>

                    {/* Hash & Copy / Link */}
                    <td className="py-4 px-6 text-right font-mono text-xs">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                          {ev.txHash ? `${ev.txHash.substring(0, 10)}...` : "-"}
                        </span>
                        {ev.txHash && (
                          <button
                            onClick={() => handleCopy(ev.txHash)}
                            className="p-1 text-gray-400 hover:text-emerald-700 transition-colors"
                            title="Copy Hash"
                          >
                            {copiedTx === ev.txHash ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        {explorerUrl && ev.txHash && (
                          <a
                            href={`${explorerUrl}/tx/${ev.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-gray-400 hover:text-emerald-700 transition-colors"
                            title="Open in Etherscan"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center space-y-3">
            <History className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-800">No Transactions Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No blockchain events match your filter criteria. Create or contribute to a campaign to record transactions on Ethereum.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
