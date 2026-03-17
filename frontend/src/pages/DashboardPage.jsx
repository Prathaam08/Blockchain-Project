/**
 * DashboardPage.jsx — Personalized NGO Dashboard.
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { useWeb3 } from "../contexts/Web3Context";
import { useContracts } from "../hooks/useContracts";
import { useNGOs, useNGODetail } from "../hooks/useNGOs";
import { useDonations } from "../hooks/useDonations";
import { formatEth } from "../utils/format";
import TransactionStatus from "../components/TransactionStatus";
import DonationTable from "../components/DonationTable";

export default function DashboardPage() {
  const { account, isConnected } = useWeb3();
  const { donationTracker } = useContracts();
  
  // Fetch ALL verified NGOs to find if the connected wallet is one of them.
  const { data: ngos, isLoading: ngosLoading } = useNGOs();

  // Check if the currently connected metamask account is a verified NGO
  const isRegisteredNGO = useMemo(() => {
    if (!account || !ngos) return false;
    return ngos.some((ngo) => ngo.wallet_address.toLowerCase() === account.toLowerCase());
  }, [account, ngos]);

  // If they are an NGO, fetch their hyper-specific details
  const { data: ngoDetail } = useNGODetail(isRegisteredNGO ? account : "");
  const { data: myDonations } = useDonations({ ngoAddress: isRegisteredNGO ? account : "" });

  const uniqueDonorsCount = useMemo(() => {
    if (!myDonations) return 0;
    const uniqueAddresses = new Set(myDonations.map((d) => d.donor_address.toLowerCase()));
    return uniqueAddresses.size;
  }, [myDonations]);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [txState, setTxState] = useState({ status: "idle", hash: null, error: null });

  /** Handle 1-Click fund withdrawal */
  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!donationTracker || !withdrawAmount || !account) return;

    setTxState({ status: "pending", hash: null, error: null });
    try {
      const weiAmount = ethers.parseEther(withdrawAmount);
      // Execute intuitively against the connected wallet
      const tx = await donationTracker.withdraw(weiAmount);
      setTxState({ status: "pending", hash: tx.hash, error: null });
      await tx.wait();
      setTxState({ status: "confirmed", hash: tx.hash, error: null });
      setWithdrawAmount("");
    } catch (err) {
      setTxState({
        status: "failed",
        hash: null,
        error: err.reason || err.message || "Withdrawal failed",
      });
    }
  };

  if (!isConnected) {
    return (
      <div className="page-container">
        <div className="glass-card p-12 text-center max-w-lg mx-auto">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-dark-100 mb-2">Platform Dashboard</h2>
          <p className="text-dark-400">
            Connect your wallet to access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (ngosLoading) {
    return (
      <div className="page-container flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Auto-Deny access to Random Wallets
  if (!isRegisteredNGO) {
    return (
      <div className="page-container">
        <div className="glass-card p-12 text-center max-w-lg mx-auto border-dashed border-2 border-dark-600">
          <div className="text-5xl mb-4">🤷</div>
          <h2 className="text-xl font-bold text-dark-100 mb-2">You are not an NGO</h2>
          <p className="text-dark-400 mb-8 max-w-md mx-auto">
            The connected wallet (<span className="font-mono text-xs">{account}</span>) 
            is not registered as an official NGO on this platform. The Dashboard is strictly an operational portal for verified organizations.
          </p>
          <div className="flex flex-col gap-4">
            <Link to="/register" className="btn-primary py-4">
              Register Your NGO Now →
            </Link>
            <Link to="/donate" className="text-accent-400 hover:text-accent-300 font-medium text-sm">
              I just want to donate ETH instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const myName = ngoDetail?.name || "Your NGO";

  return (
    <div className="page-container">
      {/* Personalized Header */}
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-bold text-dark-50">Welcome back, {myName}</h1>
        {ngoDetail?.is_verified && <span className="badge-success mt-2">Verified</span>}
      </div>
      <p className="text-dark-400 mb-8">
        Your personalized management portal.
      </p>

      {/* Targeted NGO Stats Info */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-value">
            {ngoDetail ? formatEth(ngoDetail.on_chain_balance) : "..."}
          </span>
          <span className="stat-label">Your Available Balance</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {ngoDetail ? formatEth(ngoDetail.total_donations) : "..."}
          </span>
          <span className="stat-label">Total Lifetime Raised</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {uniqueDonorsCount}
          </span>
          <span className="stat-label">Unique Donors</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Streamlined Withdrawal Form */}
        <div>
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-4 flex items-center justify-between">
              Withdraw Funds
            </h3>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-2">
                  Amount (ETH)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={ngoDetail ? formatEth(ngoDetail.on_chain_balance).replace(' ETH', '') : undefined}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.0"
                    className="input-field pr-20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(ngoDetail ? formatEth(ngoDetail.on_chain_balance).replace(' ETH', '') : "0")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-1 bg-dark-700 hover:bg-dark-600 rounded text-primary-400 transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                className="btn-primary w-full" 
                disabled={txState.status === "pending" || !withdrawAmount}
              >
                {txState.status === "pending" ? "Processing..." : "Withdraw ETH"}
              </button>
            </form>
            {txState.status !== "idle" && (
              <div className="mt-4">
                <TransactionStatus
                  status={txState.status}
                  txHash={txState.hash}
                  error={txState.error}
                />
              </div>
            )}
          </div>
        </div>

        {/* Targeted Recent Donations */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-dark-100 mb-4">
            Donation History
          </h3>
          <DonationTable
            donations={myDonations || []}
            showNGO={false}
          />
        </div>
      </div>
    </div>
  );
}
