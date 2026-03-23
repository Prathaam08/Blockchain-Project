/**
 * useNGOs.js — React Query hooks for NGO data.
 *
 * Provides queries for fetching NGOs and analytics from the backend API.
 */

import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/**
 * Fetch all verified NGOs.
 */
export function useNGOs() {
  return useQuery({
    queryKey: ["ngos"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/ngos`);
      if (!response.ok) throw new Error("Failed to fetch NGOs");
      return response.json();
    },
  });
}

/**
 * Fetch all NGOs including unverified.
 */
export function useAllNGOs() {
  return useQuery({
    queryKey: ["ngos", "all"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/ngos/all`);
      if (!response.ok) throw new Error("Failed to fetch NGOs");
      return response.json();
    },
  });
}

/**
 * Fetch detailed NGO info by address.
 *
 * @param {string} address - NGO wallet address.
 */
export function useNGODetail(address) {
  return useQuery({
    queryKey: ["ngo", address],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/ngos/${address}`);
      if (!response.ok) throw new Error("Failed to fetch NGO details");
      return response.json();
    },
    enabled: !!address,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch platform analytics overview.
 */
export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/analytics/overview`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });
}

/**
 * Fetch per-NGO analytics.
 *
 * @param {string} address - NGO wallet address.
 */
export function useNGOAnalytics(address) {
  return useQuery({
    queryKey: ["analytics", "ngo", address],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/analytics/ngo/${address}`);
      if (!response.ok) throw new Error("Failed to fetch NGO analytics");
      return response.json();
    },
    enabled: !!address,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export default useNGOs;
