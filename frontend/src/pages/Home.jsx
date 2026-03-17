/**
 * Home.jsx — Landing page: mission, stats, top NGOs.
 */

import { Link } from "react-router-dom";
import { useAnalyticsOverview } from "../hooks/useNGOs";
import { formatEth, formatNumber, truncateAddress } from "../utils/format";

export default function Home() {
  const { data: analytics, isLoading } = useAnalyticsOverview();

  return (
    <div>
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-dark-950 to-accent-900/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary-500/5 rounded-full blur-3xl" />

        <div className="relative page-container py-20 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full mb-6">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
            <span className="text-sm text-primary-300 font-medium">
              Powered by Ethereum Blockchain
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            <span className="text-dark-50">Transparent</span>
            <br />
            <span className="gradient-text">NGO Donations</span>
          </h1>

          <p className="text-lg md:text-xl text-dark-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Every donation tracked on the blockchain. Full transparency,
            milestone-based funding, and verifiable impact — because
            generosity deserves accountability.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/donate" className="btn-primary text-lg px-8 py-4">
              Donate Now →
            </Link>
            <Link to="/register" className="btn-accent text-lg px-8 py-4">
              Register Your NGO
            </Link>
            <Link to="/explorer" className="btn-secondary text-lg px-8 py-4">
              Explore Donations
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="page-container -mt-8">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="stat-card animate-slide-up">
            <span className="stat-value">
              {isLoading ? "..." : formatEth(analytics?.total_raised_eth || 0)}
            </span>
            <span className="stat-label">Total Raised</span>
          </div>
          <div className="stat-card animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <span className="stat-value">
              {isLoading ? "..." : formatNumber(analytics?.total_donations || 0)}
            </span>
            <span className="stat-label">Donations</span>
          </div>
          <div className="stat-card animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <span className="stat-value">
              {isLoading ? "..." : formatNumber(analytics?.total_ngos || 0)}
            </span>
            <span className="stat-label">Verified NGOs</span>
          </div>

        </div>
      </section>

      {/* ── Top NGOs ── */}
      <section className="page-container mt-16">
        <h2 className="section-title">Top NGOs</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-6 bg-dark-700 rounded mb-4 w-3/4" />
                <div className="h-4 bg-dark-700 rounded w-1/2" />
              </div>
            ))
          ) : (
            (analytics?.top_ngos || []).map((ngo, index) => (
              <Link
                key={ngo.wallet_address}
                to={`/ngo/${ngo.wallet_address}`}
                className="glass-card-hover p-6 group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-lg">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark-50 group-hover:text-primary-400 transition-colors">
                      {ngo.name}
                    </h3>
                    <p className="text-xs font-mono text-dark-500">
                      {truncateAddress(ngo.wallet_address)}
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary-400">
                    {formatEth(ngo.total_received_eth)}
                  </span>
                  <span className="text-sm text-dark-500">received</span>
                </div>
              </Link>
            ))
          )}
          {!isLoading && (!analytics?.top_ngos || analytics.top_ngos.length === 0) && (
            <div className="col-span-3 glass-card p-8 text-center">
              <p className="text-dark-400">No NGOs registered yet. Be the first!</p>
            </div>
          )}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="page-container mt-16 mb-16">
        <h2 className="section-title text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          {[
            { step: "01", title: "Connect Wallet", desc: "Connect your MetaMask wallet to get started." },
            { step: "02", title: "Choose & Donate", desc: "Select a verified NGO and donate ETH directly." },
            { step: "03", title: "Track Impact", desc: "Every donation is recorded on-chain for full transparency." },
          ].map((item) => (
            <div key={item.step} className="glass-card p-8 text-center group">
              <div className="text-5xl font-extrabold gradient-text mb-4 opacity-50 group-hover:opacity-100 transition-opacity">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-dark-100 mb-2">{item.title}</h3>
              <p className="text-dark-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
