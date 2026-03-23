/**
 * RegisterNGOPage.jsx — Full NGO registration flow with form validation,
 * backend API call, and on-chain transaction signing.
 */

import { useState, useCallback } from "react";
import { useWeb3 } from "../contexts/Web3Context";
import { useContracts } from "../hooks/useContracts";
import TransactionStatus from "../components/TransactionStatus";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/** Ethereum address regex */
const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export default function RegisterNGOPage() {
  const { isConnected, isCorrectNetwork, account } = useWeb3();
  const { ngoRegistry } = useContracts();

  const [form, setForm] = useState({
    name: "",
    walletAddress: "",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [txState, setTxState] = useState({ status: "idle", hash: null, error: null });

  /** Update a single form field */
  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  }, []);

  /** Validate all fields */
  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "NGO name is required.";
    else if (form.name.trim().length < 3) errs.name = "Name must be at least 3 characters.";

    if (!form.walletAddress.trim()) errs.walletAddress = "Wallet address is required.";
    else if (!ETH_ADDRESS_RE.test(form.walletAddress))
      errs.walletAddress = "Invalid Ethereum address (must start with 0x and be 42 chars).";

    if (form.description && form.description.length > 500)
      errs.description = "Description must be under 500 characters.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /** Handle registration */
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (!isConnected) {
      setTxState({ status: "error", hash: null, error: "Please connect your wallet first." });
      return;
    }
    if (!isCorrectNetwork) {
      setTxState({ status: "error", hash: null, error: "Please switch to the correct network." });
      return;
    }

    setTxState({ status: "pending", hash: null, error: null });

    try {
      // 1. Register on-chain via smart contract
      if (ngoRegistry) {
        const tx = await ngoRegistry.registerNGO(
          form.name.trim(),
          form.walletAddress,
          "ipfs://placeholder"
        );
        setTxState({ status: "pending", hash: tx.hash, error: null });
        await tx.wait();
      }

      // 2. Register in backend database
      const response = await fetch(`${API_URL}/api/ngos/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          wallet_address: form.walletAddress.toLowerCase(),
          description: form.description.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Backend registration failed.");
      }

      setTxState({
        status: "confirmed",
        hash: txState.hash,
        error: null,
      });
      setForm({ name: "", walletAddress: "", description: "" });
    } catch (err) {
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxState({ status: "rejected", hash: null, error: "Transaction rejected by user." });
      } else {
        setTxState({
          status: "failed",
          hash: null,
          error: err.reason || err.message || "Registration failed.",
        });
      }
    }
  };

  /** Auto-fill wallet address from connected account */
  const useConnectedAddress = () => {
    if (account) updateField("walletAddress", account);
  };

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
        <h1 className="text-3xl font-bold text-dark-50 mb-2">Register as NGO</h1>
      <p className="text-dark-400 mb-8">
        Register your organization on the blockchain for transparent donation tracking.
      </p>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-3">
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold text-dark-50 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                +
              </span>
              NGO Registration Form
            </h2>

            <form onSubmit={handleRegister} className="space-y-5">
              {/* NGO Name */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Organization Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g., Green Earth Foundation"
                  className={`input-field ${errors.name ? "border-red-500 focus:ring-red-500/50" : ""}`}
                  maxLength={255}
                />
                {errors.name && (
                  <p className="text-xs text-red-400 mt-1">{errors.name}</p>
                )}
              </div>

              {/* Wallet Address */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Wallet Address <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.walletAddress}
                    onChange={(e) => updateField("walletAddress", e.target.value)}
                    placeholder="0x..."
                    className={`input-field flex-1 font-mono text-sm ${errors.walletAddress ? "border-red-500 focus:ring-red-500/50" : ""}`}
                  />
                  {isConnected && (
                    <button
                      type="button"
                      onClick={useConnectedAddress}
                      className="btn-secondary text-xs whitespace-nowrap"
                      title="Use your connected wallet address"
                    >
                      Use Mine
                    </button>
                  )}
                </div>
                {errors.walletAddress && (
                  <p className="text-xs text-red-400 mt-1">{errors.walletAddress}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe your organization's mission and goals..."
                  rows={4}
                  className={`input-field resize-none ${errors.description ? "border-red-500 focus:ring-red-500/50" : ""}`}
                  maxLength={500}
                />
                <div className="flex justify-between mt-1">
                  {errors.description ? (
                    <p className="text-xs text-red-400">{errors.description}</p>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-dark-500">
                    {form.description.length}/500
                  </span>
                </div>
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
                    Registering...
                  </span>
                ) : (
                  "Register NGO on Blockchain"
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

            {/* Wallet Warning */}
            {!isConnected && (
              <div className="mt-4 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
                <p className="text-sm text-yellow-400">
                  ⚠️ Connect your wallet to register an NGO.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">How It Works</h3>
            <ol className="space-y-4 text-sm text-dark-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-xs font-bold">1</span>
                <span>Fill in your organization details and wallet address.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-xs font-bold">2</span>
                <span>Sign the transaction in MetaMask to register on-chain.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-xs font-bold">3</span>
                <span>An admin will verify your NGO to enable donations.</span>
              </li>
            </ol>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-3">Requirements</h3>
            <ul className="space-y-2 text-sm text-dark-400">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                MetaMask wallet connected
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Valid Ethereum address
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Small gas fee for on-chain registration
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
