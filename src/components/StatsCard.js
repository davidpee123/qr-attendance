"use client";
export default function StatsCard({ title, value, sub, className = "" }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow hover:shadow-lg transition ${className}`}>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}
