/**
 * DonatePage.jsx — Donation page: select NGO, enter amount, sign with MetaMask.
 */

import { useNGOs } from "../hooks/useNGOs";
import { useWeb3 } from "../contexts/Web3Context";
import { useDonorHistory } from "../hooks/useDonations";
import DonationForm from "../components/DonationForm";
import DonationTable from "../components/DonationTable";

export default function DonatePage() {
  const { data: ngos, isLoading } = useNGOs();
  const { account, isConnected } = useWeb3();
  const { data: history } = useDonorHistory(account);

  return (
    <div className="relative min-h-screen">
      {/* Fixed Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity pointer-events-none z-0"
        style={{ backgroundImage: "url('/hero-bg.png')" }}
      />
      {/* Gradient Overlay for Readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-dark-950/70 to-dark-950 pointer-events-none z-0" />

      <div className="relative z-10 page-container pt-8 pb-16">
        <h1 className="text-3xl font-bold text-dark-50 mb-2">Make a Donation</h1>
      <p className="text-dark-400 mb-8">
        Select a verified NGO and donate ETH directly through the blockchain.
      </p>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Donation Form */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="glass-card p-8 animate-pulse">
              <div className="h-6 bg-dark-700 rounded mb-4" />
              <div className="h-10 bg-dark-700 rounded mb-4" />
              <div className="h-10 bg-dark-700 rounded mb-4" />
              <div className="h-12 bg-dark-700 rounded" />
            </div>
          ) : (
            <DonationForm ngos={ngos || []} />
          )}

          {/* Wallet Status */}
          {!isConnected && (
            <div className="mt-4 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
              <p className="text-sm text-yellow-400">
                ⚠️ Connect your wallet to make donations.
              </p>
            </div>
          )}
        </div>

        {/* Donation History */}
        <div className="lg:col-span-3">
          <h2 className="text-xl font-semibold text-dark-100 mb-4">
            Your Donation History
          </h2>
          {isConnected && history && history.length > 0 ? (
            <DonationTable donations={history} showDonor={false} />
          ) : (
            <div className="glass-card p-8 text-center">
              <div className="text-4xl mb-4">💝</div>
              <p className="text-dark-400">
                {isConnected
                  ? "You haven't made any donations yet."
                  : "Connect your wallet to see your history."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
