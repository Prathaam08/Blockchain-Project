/**
 * ExplorerPage.jsx — Public donation explorer: all donations, filterable, searchable.
 */

import { useState } from "react";
import { useDonations } from "../hooks/useDonations";
import { useAnalyticsOverview } from "../hooks/useNGOs";
import DonationTable from "../components/DonationTable";
import DonationChart from "../components/Analytics/DonationChart";
import CategoryPie from "../components/Analytics/CategoryPie";
import { formatEth, formatNumber } from "../utils/format";

export default function ExplorerPage() {
  const [ngoFilter, setNgoFilter] = useState("");
  const { data: donations, isLoading } = useDonations({ ngoAddress: ngoFilter || undefined });
  const { data: analytics } = useAnalyticsOverview();

  // Prepare chart data from analytics
  const barData = (analytics?.top_ngos || []).map((ngo) => ({
    name: ngo.name.length > 12 ? ngo.name.slice(0, 12) + "..." : ngo.name,
    value: ngo.total_received_eth,
  }));

  const pieData = (analytics?.top_ngos || []).map((ngo) => ({
    name: ngo.name,
    value: ngo.total_received_eth,
  }));

  return (
    <div className="page-container">
      <h1 className="text-3xl font-bold text-dark-50 mb-2">Donation Explorer</h1>
      <p className="text-dark-400 mb-8">
        Browse all donations on the blockchain. Full transparency guaranteed.
      </p>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-value">{formatEth(analytics?.total_raised_eth || 0)}</span>
          <span className="stat-label">Total Raised</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatNumber(analytics?.total_donations || 0)}</span>
          <span className="stat-label">Total Donations</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatNumber(analytics?.total_ngos || 0)}</span>
          <span className="stat-label">NGOs</span>
        </div>

      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <DonationChart data={barData} title="Top NGOs by Donations" />
        <CategoryPie data={pieData} title="Donation Distribution" />
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Filter by NGO address (0x...)"
            value={ngoFilter}
            onChange={(e) => setNgoFilter(e.target.value)}
            className="input-field"
          />
        </div>
        {ngoFilter && (
          <button
            onClick={() => setNgoFilter("")}
            className="btn-secondary"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Donations Table */}
      {isLoading ? (
        <div className="glass-card p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
          <p className="text-dark-400 mt-4">Loading donations...</p>
        </div>
      ) : (
        <DonationTable donations={donations || []} />
      )}
    </div>
  );
}
