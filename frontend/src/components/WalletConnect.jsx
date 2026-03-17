/**
 * WalletConnect.jsx — MetaMask connect button with network guard.
 *
 * Handles wallet connection, displays connected address,
 * and prompts network switch if needed.
 */

import { useWeb3 } from "../contexts/Web3Context";
import { truncateAddress } from "../utils/format";

export default function WalletConnect() {
  const {
    account,
    isConnecting,
    isConnected,
    isCorrectNetwork,
    isMetaMaskInstalled,
    error,
    connectWallet,
    switchNetwork,
    disconnect,
  } = useWeb3();

  // MetaMask not installed
  if (!isMetaMaskInstalled) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary text-sm"
      >
        Install MetaMask
      </a>
    );
  }

  // Wrong network
  if (isConnected && !isCorrectNetwork) {
    return (
      <button onClick={switchNetwork} className="px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-xl text-sm font-medium hover:bg-yellow-500/30 transition-all">
        ⚠️ Switch Network
      </button>
    );
  }

  // Connected
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-xl border border-dark-600">
          <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
          <span className="text-sm font-mono text-dark-200">
            {truncateAddress(account)}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="p-2 text-dark-400 hover:text-dark-200 transition-colors"
          title="Disconnect"
        >
          ✕
        </button>
      </div>
    );
  }

  // Not connected
  return (
    <div className="flex flex-col items-end">
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="btn-primary text-sm"
      >
        {isConnecting ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Connecting...
          </span>
        ) : (
          "Connect Wallet"
        )}
      </button>
      {error && (
        <p className="text-xs text-red-400 mt-1 max-w-[200px] truncate">
          {error}
        </p>
      )}
    </div>
  );
}
