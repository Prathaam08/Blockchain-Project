/**
 * Web3Context.jsx — React context for blockchain wallet management.
 *
 * Manages MetaMask connection, account state, network detection,
 * and ethers.js signer/provider instances.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

/** Expected chain ID from environment */
const EXPECTED_CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || "31337");

/** Context for Web3 state */
const Web3Context = createContext(null);

/**
 * Custom hook to access Web3 context.
 * @returns {Object} Web3 state and actions.
 */
export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) throw new Error("useWeb3 must be used within Web3Provider");
  return context;
}

/**
 * Web3Provider — Provides wallet connection state to the app.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  /** Whether MetaMask is installed */
  const isMetaMaskInstalled = typeof window !== "undefined" && !!window.ethereum;

  /** Whether the user is on the correct network */
  const isCorrectNetwork = chainId === EXPECTED_CHAIN_ID;

  /**
   * Connect to MetaMask wallet.
   * Requests account access and sets up provider/signer.
   */
  const connectWallet = useCallback(async () => {
    if (!isMetaMaskInstalled) {
      setError("MetaMask is not installed. Please install it to continue.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);

      if (accounts.length === 0) {
        setError("No accounts found. Please unlock MetaMask.");
        return;
      }

      const network = await browserProvider.getNetwork();
      const signerInstance = await browserProvider.getSigner();

      setProvider(browserProvider);
      setSigner(signerInstance);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
    } catch (err) {
      if (err.code === 4001) {
        setError("Connection rejected. Please approve the request in MetaMask.");
      } else {
        setError(`Connection failed: ${err.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isMetaMaskInstalled]);

  /**
   * Switch to the expected network.
   * Prompts MetaMask to switch or add the network.
   */
  const switchNetwork = useCallback(async () => {
    if (!isMetaMaskInstalled) return;

    const chainIdHex = `0x${EXPECTED_CHAIN_ID.toString(16)}`;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (err) {
      // Chain not added — try adding it
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chainIdHex,
                chainName: EXPECTED_CHAIN_ID === 31337 ? "Hardhat Local" : "Sepolia",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: [
                  EXPECTED_CHAIN_ID === 31337
                    ? "http://127.0.0.1:8545"
                    : "https://rpc.sepolia.org",
                ],
                blockExplorerUrls:
                  EXPECTED_CHAIN_ID === 11155111
                    ? ["https://sepolia.etherscan.io"]
                    : [],
              },
            ],
          });
        } catch (addError) {
          setError("Failed to add network to MetaMask.");
        }
      } else {
        setError("Failed to switch network.");
      }
    }
  }, [isMetaMaskInstalled]);

  /** Disconnect wallet */
  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setError(null);
  }, []);

  // ── Listen for MetaMask events ──
  useEffect(() => {
    if (!isMetaMaskInstalled) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAccount(accounts[0]);
        connectWallet(); // Refresh signer
      }
    };

    const handleChainChanged = (newChainId) => {
      setChainId(parseInt(newChainId, 16));
      connectWallet(); // Refresh provider
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [isMetaMaskInstalled, connectWallet, disconnect]);

  // ── Auto-connect if previously connected ──
  useEffect(() => {
    if (isMetaMaskInstalled) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          if (accounts.length > 0) connectWallet();
        })
        .catch(() => {});
    }
  }, [isMetaMaskInstalled, connectWallet]);

  const value = {
    account,
    provider,
    signer,
    chainId,
    isConnecting,
    error,
    isMetaMaskInstalled,
    isCorrectNetwork,
    isConnected: !!account,
    connectWallet,
    switchNetwork,
    disconnect,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export default Web3Context;
