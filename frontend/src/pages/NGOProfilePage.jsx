/**
 * NGOProfilePage.jsx — Public NGO profile page with details and donation history.
 */

import { useParams, Link } from "react-router-dom";
import { useNGODetail, useNGOAnalytics } from "../hooks/useNGOs";
import { useDonations } from "../hooks/useDonations";
import DonationTable from "../components/DonationTable";
import TimeSeriesChart from "../components/Analytics/TimeSeriesChart";
import { formatEth, formatNumber, truncateAddress, formatTimestamp } from "../utils/format";

export default function NGOProfilePage() {
  const { address } = useParams();
  const { data: ngo, isLoading: ngoLoading } = useNGODetail(address);
  const { data: analytics } = useNGOAnalytics(address);
  const { data: donations } = useDonations({ ngoAddress: address });

  // Prepare time series data from analytics
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const timeData = (analytics?.donation_history || []).map((entry) => {
    let label = entry.month || "";
    // Parse "YYYY-MM-DD" format into "Mar 18" style label
    if (label && label.includes("-")) {
      const parts = label.split("-");
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2] ? parseInt(parts[2], 10) : "";
      label = day ? `${monthNames[monthIdx] || parts[1]} ${day}` : `${monthNames[monthIdx] || parts[1]} '${parts[0].slice(2)}`;
    }
    return { date: label, value: entry.total_eth || 0 };
  });

  if (ngoLoading) {
    return (
      <div className="page-container">
        <div className="glass-card p-12 text-center animate-pulse">
          <div className="w-16 h-16 bg-dark-700 rounded-2xl mx-auto mb-4" />
          <div className="h-6 bg-dark-700 rounded w-48 mx-auto mb-2" />
          <div className="h-4 bg-dark-700 rounded w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!ngo) {
    return (
      <div className="page-container">
        <div className="glass-card p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-dark-100 mb-2">NGO Not Found</h2>
          <p className="text-dark-400 mb-6">
            The specified address is not registered as an NGO.
          </p>
          <Link to="/explorer" className="btn-primary">
            Browse All
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Profile Header */}
      <div className="glass-card p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-500/20">
            {ngo.name ? ngo.name[0] : "N"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-dark-50">{ngo.name}</h1>
              {ngo.is_verified && <span className="badge-success">Verified</span>}
            </div>
            <p className="font-mono text-sm text-dark-400 mb-4">
              <span className="font-semibold text-dark-200">Wallet Address: </span> 
              {address}
            </p>
            {ngo.description && (
              <div className="mb-2">
                <span className="font-semibold text-dark-200 text-sm block mb-1">Description:</span>
                <p className="text-dark-300">{ngo.description}</p>
              </div>
            )}
            {ngo.verified_at && (
              <p className="text-xs text-dark-500 mt-2">
                Verified: {formatTimestamp(ngo.verified_at)}
              </p>
            )}
          </div>
          <Link to={`/donate`} className="btn-primary shrink-0">
            Donate to {ngo.name}
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-value">
            {formatEth(ngo.on_chain_balance || analytics?.on_chain_balance || "0")}
          </span>
          <span className="stat-label">Current Balance</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {formatEth(ngo.total_donations || analytics?.total_received_eth || 0)}
          </span>
          <span className="stat-label">Total Received</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {formatNumber(analytics?.total_donations || 0)}
          </span>
          <span className="stat-label">Total Donations</span>
        </div>
      </div>

      {/* Timeline Chart */}
      {timeData.length > 0 && (
        <div className="mb-8">
          <TimeSeriesChart data={timeData} title="Donation History" />
        </div>
      )}

      {/* Donation History */}
      <h2 className="section-title">Donation History</h2>
      <DonationTable donations={donations || []} showNGO={false} />
    </div>
  );
}
