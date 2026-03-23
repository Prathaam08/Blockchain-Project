/**
 * App.jsx — Root application component with routing.
 *
 * Defines all routes and the global navigation layout.
 * Pages are lazy-loaded for better performance.
 */

import { lazy, Suspense } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import WalletConnect from "./components/WalletConnect";

/* ── Lazy-loaded Pages ── */
const Home = lazy(() => import("./pages/Home"));
const DonatePage = lazy(() => import("./pages/DonatePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ExplorerPage = lazy(() => import("./pages/ExplorerPage"));
const NGOProfilePage = lazy(() => import("./pages/NGOProfilePage"));
const RegisterNGOPage = lazy(() => import("./pages/RegisterNGOPage"));

/** Page loading fallback */
function PageLoader() {
  return (
    <div className="page-container flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-dark-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

/** Navigation links configuration */
const navLinks = [
  { to: "/", label: "Home" },
  { to: "/donate", label: "Donate" },
  { to: "/explorer", label: "Explorer" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/register", label: "Register NGO" },
];

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-dark-950">
      {/* ── Navigation Bar ── */}
      <header className="sticky top-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="text-lg font-bold gradient-text hidden sm:block">
                NGO Tracker
              </span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    location.pathname === link.to
                      ? "bg-primary-500/15 text-primary-400"
                      : "text-dark-300 hover:text-dark-100 hover:bg-dark-800"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Wallet Connect */}
            <WalletConnect />
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-dark-700/50">
          <div className="flex justify-around py-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-xs font-medium ${
                  location.pathname === link.to
                    ? "text-primary-400"
                    : "text-dark-400"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="animate-fade-in">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/explorer" element={<ExplorerPage />} />
            <Route path="/ngo/:address" element={<NGOProfilePage />} />
            <Route path="/register" element={<RegisterNGOPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-dark-700/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-dark-500 text-sm">
            © 2026 NGO Donation Tracker. Built with blockchain for full transparency.
          </p>
        </div>
      </footer>
    </div>
  );
}
