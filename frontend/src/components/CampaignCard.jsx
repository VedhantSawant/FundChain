import React from "react";
import { Link } from "react-router-dom";
import { Clock, User, CheckCircle, AlertTriangle, ArrowRight, Sprout, BookOpen, HeartPulse, Cpu, Users, Leaf, HelpCircle } from "lucide-react";
import ProgressBar from "./ProgressBar";
import { shortenAddress } from "../blockchain/contract";

// Category badge and icons
const CATEGORY_MAP = {
  Agriculture: {
    icon: Sprout,
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    defaultImg: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80",
  },
  Education: {
    icon: BookOpen,
    badgeBg: "bg-blue-100 text-blue-800 border-blue-200",
    defaultImg: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
  },
  Healthcare: {
    icon: HeartPulse,
    badgeBg: "bg-rose-100 text-rose-800 border-rose-200",
    defaultImg: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
  },
  Technology: {
    icon: Cpu,
    badgeBg: "bg-purple-100 text-purple-800 border-purple-200",
    defaultImg: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
  },
  "Community Development": {
    icon: Users,
    badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
    defaultImg: "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=800&q=80",
  },
  Environment: {
    icon: Leaf,
    badgeBg: "bg-teal-100 text-teal-800 border-teal-200",
    defaultImg: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
  },
  Other: {
    icon: HelpCircle,
    badgeBg: "bg-gray-100 text-gray-800 border-gray-200",
    defaultImg: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb7?auto=format&fit=crop&w=800&q=80",
  },
};

export default function CampaignCard({ campaign }) {
  const {
    id,
    creator,
    title,
    description,
    goal,
    amountRaised,
    deadline,
    category,
    imageUrl,
    progressPercent,
    status,
    isExpired,
  } = campaign;

  const catMeta = CATEGORY_MAP[category] || CATEGORY_MAP.Other;
  const CategoryIcon = catMeta.icon;
  const displayImage = imageUrl && imageUrl.trim().length > 0 ? imageUrl : catMeta.defaultImg;

  // Format remaining time
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = deadline - now;
  let remainingText = "Expired";
  if (secondsLeft > 0) {
    const days = Math.floor(secondsLeft / (24 * 3600));
    const hours = Math.floor((secondsLeft % (24 * 3600)) / 3600);
    remainingText = days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
  }

  // Status Badge styling
  const statusStyles = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-300",
    Funded: "bg-teal-50 text-teal-700 border-teal-300",
    Successful: "bg-green-50 text-green-700 border-green-300",
    Failed: "bg-rose-50 text-rose-700 border-rose-300",
    Withdrawn: "bg-gray-50 text-gray-700 border-gray-300",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-soft hover:shadow-hover transition-all duration-300 flex flex-col group">
      {/* Card Header Image */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        <img
          src={displayImage}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = catMeta.defaultImg;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Category Pill */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md shadow-sm ${catMeta.badgeBg}`}>
            <CategoryIcon className="w-3.5 h-3.5" />
            {category}
          </span>
        </div>

        {/* Status Pill */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-white/95 shadow-sm ${statusStyles[status] || "text-gray-700"}`}>
            {status}
          </span>
        </div>

        {/* Campaign ID badge */}
        <div className="absolute bottom-2.5 left-3 text-white/90 text-xs font-medium">
          Campaign #{id}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1 mb-2">
            {title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
            {description}
          </p>

          {/* Creator Address */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 w-fit">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-mono">{shortenAddress(creator)}</span>
          </div>

          {/* Progress Section */}
          <div className="space-y-2 mb-4">
            <ProgressBar progress={progressPercent} />
            <div className="flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-gray-900 text-sm">{amountRaised} ETH</span>
                <span className="text-gray-500"> raised</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Goal: </span>
                <span className="font-semibold text-gray-700">{goal} ETH</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info & CTA */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{remainingText}</span>
          </div>

          <Link
            to={`/campaign/${id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800 group-hover:translate-x-1 transition-all"
          >
            <span>View Details</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
