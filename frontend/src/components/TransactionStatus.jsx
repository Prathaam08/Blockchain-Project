/**
 * TransactionStatus.jsx — Displays transaction status with visual indicators.
 *
 * Shows pending, confirmed, failed, or rejected states
 * with tx hash links to block explorer.
 */

import { getExplorerTxUrl, truncateAddress } from "../utils/format";

/** Status configurations */
const STATUS_CONFIG = {
  pending: {
    icon: "⏳",
    title: "Transaction Pending",
    message: "Waiting for blockchain confirmation...",
    className: "border-yellow-500/30 bg-yellow-500/10",
    titleColor: "text-yellow-400",
  },
  confirmed: {
    icon: "✅",
    title: "Transaction Confirmed!",
    message: "Your donation has been recorded on the blockchain.",
    className: "border-primary-500/30 bg-primary-500/10",
    titleColor: "text-primary-400",
  },
  failed: {
    icon: "❌",
    title: "Transaction Failed",
    message: "The transaction could not be completed.",
    className: "border-red-500/30 bg-red-500/10",
    titleColor: "text-red-400",
  },
  rejected: {
    icon: "🚫",
    title: "Transaction Rejected",
    message: "You rejected the transaction in your wallet.",
    className: "border-dark-500/30 bg-dark-700/50",
    titleColor: "text-dark-300",
  },
  error: {
    icon: "⚠️",
    title: "Error",
    message: "Something went wrong.",
    className: "border-red-500/30 bg-red-500/10",
    titleColor: "text-red-400",
  },
};

/**
 * @param {Object} props
 * @param {'pending'|'confirmed'|'failed'|'rejected'|'error'} props.status
 * @param {string} [props.txHash]
 * @param {string} [props.error]
 */
export default function TransactionStatus({ status, txHash, error }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.error;

  return (
    <div
      className={`rounded-xl border p-4 ${config.className} animate-fade-in`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <h4 className={`font-semibold ${config.titleColor}`}>
            {config.title}
          </h4>
          <p className="text-sm text-dark-300 mt-1">
            {error || config.message}
          </p>

          {txHash && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-dark-400">TX:</span>
              <a
                href={getExplorerTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-accent-400 hover:text-accent-300 transition-colors"
              >
                {truncateAddress(txHash, 10, 8)}
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(txHash)}
                className="text-xs text-dark-500 hover:text-dark-300 transition-colors"
                title="Copy hash"
              >
                📋
              </button>
            </div>
          )}

          {status === "pending" && (
            <div className="mt-3 w-full h-1 bg-dark-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
