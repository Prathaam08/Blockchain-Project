/**
 * useDonations.js — React Query hooks for donation data.
 *
 * Provides queries for fetching donations from the backend API
 * and mutations for recording new donations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Fetch all donations with optional NGO filter.
 *
 * @param {Object} options
 * @param {string} [options.ngoAddress] - Filter by NGO address.
 * @param {number} [options.limit] - Max results to return.
 */
export function useDonations({ ngoAddress, limit = 100 } = {}) {
  return useQuery({
    queryKey: ["donations", ngoAddress, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (ngoAddress) params.set("ngo_address", ngoAddress);
      params.set("limit", limit.toString());

      const response = await fetch(`${API_URL}/api/donations?${params}`);
      if (!response.ok) throw new Error("Failed to fetch donations");
      return response.json();
    },
  });
}

/**
 * Fetch donation history for a specific donor.
 *
 * @param {string} donorAddress - The donor's wallet address.
 */
export function useDonorHistory(donorAddress) {
  return useQuery({
    queryKey: ["donations", "donor", donorAddress],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/donations/${donorAddress}`);
      if (!response.ok) throw new Error("Failed to fetch donor history");
      return response.json();
    },
    enabled: !!donorAddress,
  });
}

/**
 * Mutation to record a new donation in the backend.
 */
export function useRecordDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (donationData) => {
      const response = await fetch(`${API_URL}/api/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donationData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to record donation");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export default useDonations;
