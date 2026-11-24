import React from "react";

export default function ProgressBar({ progress, height = "h-2.5", showLabel = false }) {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress || 0)));

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold mb-1.5 text-gray-700">
          <span>Progress</span>
          <span className="text-emerald-700">{clampedProgress}%</span>
        </div>
      )}
      <div className={`w-full bg-emerald-100/60 rounded-full overflow-hidden ${height}`}>
        <div
          className="bg-gradient-to-r from-emerald-600 to-emerald-500 h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
