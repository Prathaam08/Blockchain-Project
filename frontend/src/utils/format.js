/**
 * format.js — Utility functions for formatting blockchain data.
 *
 * Includes Wei→ETH conversion, address truncation, timestamp formatting,
 * and number formatting helpers.
 */

import { ethers } from "ethers";

/**
 * Convert Wei to ETH string with specified decimal places.
 *
 * @param {string|bigint} wei - Amount in Wei.
 * @param {number} [decimals=4] - Number of decimal places.
 * @returns {string} Formatted ETH string.
 */
export function weiToEth(wei, decimals = 4) {
  try {
    const eth = ethers.formatEther(wei);
    return parseFloat(eth).toFixed(decimals);
  } catch {
    return "0.0000";
  }
}

/**
 * Truncate an Ethereum address for display.
 *
 * @param {string} address - Full Ethereum address (0x...).
 * @param {number} [startChars=6] - Characters to show at start.
 * @param {number} [endChars=4] - Characters to show at end.
 * @returns {string} Truncated address (e.g., "0x1234...5678").
 */
export function truncateAddress(address, startChars = 6, endChars = 4) {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format a UNIX timestamp or Date to a human-readable string.
 *
 * @param {number|string|Date} timestamp - Timestamp to format.
 * @returns {string} Formatted date string.
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return "—";
  try {
    let date;
    if (typeof timestamp === "number") {
      date = new Date(timestamp * 1000);
    } else {
      // Append 'Z' if it's missing to force UTC parsing since backend returns naive UTC datetimes
      let timeStr = timestamp;
      if (typeof timeStr === "string" && !timeStr.endsWith("Z") && !timeStr.includes("+") && timeStr.includes("T")) {
        timeStr += "Z";
      }
      date = new Date(timeStr);
    }
    
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * Format a number with commas for display.
 *
 * @param {number} num - Number to format.
 * @returns {string} Formatted number string.
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Get the block explorer URL for a transaction hash.
 *
 * @param {string} txHash - Transaction hash.
 * @param {number} [chainId=31337] - Chain ID.
 * @returns {string} Block explorer URL.
 */
export function getExplorerTxUrl(txHash, chainId) {
  const id = chainId || parseInt(import.meta.env.VITE_CHAIN_ID || "31337");
  if (id === 11155111) {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }
  return `#tx-${txHash}`;
}

/**
 * Get the block explorer URL for an address.
 *
 * @param {string} address - Wallet address.
 * @param {number} [chainId] - Chain ID.
 * @returns {string} Block explorer URL.
 */
export function getExplorerAddressUrl(address, chainId) {
  const id = chainId || parseInt(import.meta.env.VITE_CHAIN_ID || "31337");
  if (id === 11155111) {
    return `https://sepolia.etherscan.io/address/${address}`;
  }
  return `#address-${address}`;
}

/**
 * Format ETH amount for display.
 *
 * @param {number|string} amount - Amount in ETH.
 * @param {number} [decimals=4] - Decimal places.
 * @returns {string} Formatted ETH string with symbol.
 */
export function formatEth(amount, decimals = 4) {
  if (!amount) return "0 ETH";
  return `${parseFloat(amount).toFixed(decimals)} ETH`;
}
