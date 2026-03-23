/**
 * TransactionTimeline.jsx — Vertical timeline showing donations chronologically.
 *
 * A beautiful, animated timeline that displays each donation as a distinct
 * event with amount, donor, date, and campaign info.
 */

import { formatEth, truncateAddress, formatTimestamp } from "../utils/format";

/**
 * @param {Object} props
 * @param {Array} props.donations - Array of donation objects.
 */
export default function TransactionTimeline({ donations = [] }) {
  if (donations.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-dark-400">No transactions yet.</p>
      </div>
    );
  }

  // Sort donations by most recent first
  const sorted = [...donations].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-dark-100 mb-6">Transaction Timeline</h3>
      <div className="relative max-h-[400px] overflow-y-auto pr-4">
        {/* Vertical line */}
        <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-500 via-accent-500 to-dark-700" />

        <div className="space-y-6">
          {sorted.map((donation, index) => (
            <div
              key={donation.tx_hash || index}
              className="relative flex gap-4 group"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Dot */}
              <div className="relative z-10 shrink-0 w-[35px] flex items-start justify-center pt-1">
                <div className="w-3.5 h-3.5 rounded-full bg-primary-500 ring-4 ring-dark-800 group-hover:ring-primary-500/20 group-hover:scale-125 transition-all duration-300" />
              </div>

              {/* Content Card */}
              <div className="flex-1 pb-1">
                <div className="rounded-xl bg-dark-800/60 border border-dark-700/50 p-4 hover:border-primary-500/30 hover:bg-dark-800/80 transition-all duration-300">
                  {/* Amount + Date header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-primary-400">
                      +{formatEth(donation.amount_eth)} ETH
                    </span>
                    <span className="text-xs text-dark-500">
                      {donation.timestamp
                        ? formatTimestamp(donation.timestamp)
                        : "—"}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-dark-500">From:</span>
                      <span className="font-mono text-dark-300 text-xs">
                        {truncateAddress(donation.donor_address)}
                      </span>
                    </div>
                    {donation.campaign_id && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-dark-500">Campaign:</span>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-accent-500/10 text-accent-400 text-xs font-medium">
                          {donation.campaign_id}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-dark-500">Tx:</span>
                      <span className="font-mono text-dark-400 text-xs">
                        {donation.tx_hash ? donation.tx_hash.slice(0, 16) + "..." : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
