/**
 * DonationTable.jsx — Paginated donation history table.
 */

import { truncateAddress, formatEth, formatTimestamp, getExplorerTxUrl } from "../utils/format";

/**
 * @param {Object} props
 * @param {Array} props.donations - List of donation records.
 * @param {boolean} [props.showNGO=true] - Whether to show NGO column.
 * @param {boolean} [props.showDonor=true] - Whether to show donor column.
 */
export default function DonationTable({ donations = [], showNGO = true, showDonor = true }) {
  if (donations.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-dark-400">No donations found.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
        <table className="w-full relative">
          <thead className="sticky top-0 z-10 bg-dark-800/95 backdrop-blur-md shadow-sm">
            <tr className="border-b border-dark-700/50">
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-dark-400 uppercase tracking-wider">
                TX Hash
              </th>
              {showDonor && (
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-dark-400 uppercase tracking-wider">
                  Donor
                </th>
              )}
              {showNGO && (
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-dark-400 uppercase tracking-wider">
                  NGO
                </th>
              )}
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-dark-400 uppercase tracking-wider">
                Campaign
              </th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold text-dark-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold text-dark-400 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700/30">
            {donations.map((donation, index) => (
              <tr
                key={donation.tx_hash || index}
                className="hover:bg-dark-700/30 transition-colors"
              >
                <td className="px-4 py-2">
                  <a
                    href={getExplorerTxUrl(donation.tx_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-accent-400 hover:text-accent-300"
                  >
                    {truncateAddress(donation.tx_hash, 8, 6)}
                  </a>
                </td>
                {showDonor && (
                  <td className="px-4 py-2 text-xs font-mono text-dark-200">
                    {truncateAddress(donation.donor_address)}
                  </td>
                )}
                {showNGO && (
                  <td className="px-4 py-2 text-xs font-mono text-dark-200">
                    {truncateAddress(donation.ngo_address)}
                  </td>
                )}
                <td className="px-4 py-2">
                  {donation.campaign_id && donation.campaign_id !== "general" ? (
                    <span className="px-2 py-0.5 bg-dark-700/50 rounded text-[10px] font-semibold text-primary-300 border border-primary-500/10">
                      {donation.campaign_id}
                    </span>
                  ) : (
                    <span className="text-dark-500 italic text-[10px]">General</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <span className="text-xs font-semibold text-primary-400">
                    {formatEth(donation.amount_eth)}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-xs text-dark-400 whitespace-nowrap">
                  {formatTimestamp(donation.timestamp || donation.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
