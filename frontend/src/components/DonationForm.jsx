/**
 * DonationForm.jsx — Form for making ETH donations to verified NGOs.
 *
 * Includes NGO selection, amount input, mandatory campaign ID,
 * and MetaMask transaction signing.
 */

import { useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../contexts/Web3Context";
import { useContracts } from "../hooks/useContracts";
import { useRecordDonation } from "../hooks/useDonations";
import TransactionStatus from "./TransactionStatus";

/**
 * @param {Object} props
 * @param {Array} props.ngos - List of verified NGOs.
 * @param {string} [props.preselectedNGO] - Pre-selected NGO address.
 */
export default function DonationForm({ ngos = [], preselectedNGO = "" }) {
  const { account, isConnected, isCorrectNetwork } = useWeb3();
  const { donationTracker } = useContracts();
  const recordDonation = useRecordDonation();

  const [ngoAddress, setNgoAddress] = useState(preselectedNGO);
  const [amount, setAmount] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [txState, setTxState] = useState({ status: "idle", hash: null, error: null });

  /** Handle donation submission */
  const handleDonate = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      setTxState({ status: "error", hash: null, error: "Please connect your wallet first." });
      return;
    }

    if (!isCorrectNetwork) {
      setTxState({ status: "error", hash: null, error: "Please switch to the correct network." });
      return;
    }

    if (!donationTracker) {
      setTxState({ status: "error", hash: null, error: "Contract not initialized. Check configuration." });
      return;
    }

    if (!ngoAddress || !amount || parseFloat(amount) <= 0) {
      setTxState({ status: "error", hash: null, error: "Please select an NGO and enter a valid amount." });
      return;
    }

    if (!campaignId.trim()) {
      setTxState({ status: "error", hash: null, error: "Campaign ID is required. Please enter a valid Campaign ID." });
      return;
    }

    setTxState({ status: "pending", hash: null, error: null });

    try {
      const weiAmount = ethers.parseEther(amount);

      // Send transaction
      const tx = await donationTracker.donate(ngoAddress, campaignId.trim(), {
        value: weiAmount,
      });

      setTxState({ status: "pending", hash: tx.hash, error: null });

      // Wait for confirmation
      const receipt = await tx.wait();

      // Record in backend
      try {
        await recordDonation.mutateAsync({
          tx_hash: tx.hash,
          donor_address: account,
          ngo_address: ngoAddress,
          campaign_id: campaignId.trim(),
          amount_eth: parseFloat(amount),
          block_number: receipt.blockNumber,
        });
        
        setTxState({ status: "confirmed", hash: tx.hash, error: null });
        
        // Reset form
        setAmount("");
        setCampaignId("");
      } catch (backendErr) {
        console.warn("Backend recording failed:", backendErr);
        setTxState({ status: "error", hash: tx.hash, error: "Blockchain success, but Backend sync failed: " + (backendErr.message || "Unknown error") });
      }
    } catch (err) {
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState({ status: "rejected", hash: null, error: "Transaction rejected by user." });
      } else {
        setTxState({
          status: "failed",
          hash: null,
          error: err.reason || err.message || "Transaction failed.",
        });
      }
    }
  };

  return (
    <div className="glass-card p-8">
      <h2 className="text-xl font-bold text-dark-50 mb-6">Make a Donation</h2>

      <form onSubmit={handleDonate} className="space-y-5">
        {/* NGO Selection */}
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Select NGO <span className="text-red-400">*</span>
          </label>
          <select
            value={ngoAddress}
            onChange={(e) => setNgoAddress(e.target.value)}
            className="input-field"
            required
          >
            <option value="">Choose an NGO...</option>
            {ngos.map((ngo) => (
              <option key={ngo.wallet_address} value={ngo.wallet_address}>
                {ngo.name} ({ngo.wallet_address.slice(0, 8)}...)
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Amount (ETH) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="input-field pr-16"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 font-medium">
              ETH
            </span>
          </div>
        </div>

        {/* Campaign ID — REQUIRED */}
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Campaign ID <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            placeholder="e.g., campaign-1"
            className="input-field"
            required
          />
          <p className="text-xs text-dark-500 mt-1">
            Enter the campaign identifier this donation supports.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isConnected || txState.status === "pending"}
          className="btn-primary w-full text-center"
        >
          {txState.status === "pending" ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            `Donate ${amount || "0"} ETH`
          )}
        </button>
      </form>

      {/* Transaction Status */}
      {txState.status !== "idle" && (
        <div className="mt-6">
          <TransactionStatus
            status={txState.status}
            txHash={txState.hash}
            error={txState.error}
          />
        </div>
      )}
    </div>
  );
}
