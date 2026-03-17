/**
 * useContracts.js — Hook providing ethers.js contract instances.
 *
 * Creates contract instances using the signer from Web3Context
 * and ABIs from the abi/ directory.
 */

import { useMemo } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../contexts/Web3Context";
import {
  NGO_REGISTRY_ADDRESS,
  DONATION_TRACKER_ADDRESS,
  MILESTONE_VAULT_ADDRESS,
  NGO_REGISTRY_ABI,
  DONATION_TRACKER_ABI,
  MILESTONE_VAULT_ABI,
} from "../utils/contracts";

/**
 * Hook to get typed smart contract instances.
 *
 * @returns {Object} Contract instances: ngoRegistry, donationTracker, milestoneVault.
 */
export function useContracts() {
  const { signer, provider, isConnected } = useWeb3();

  const contracts = useMemo(() => {
    const signerOrProvider = signer || provider;
    if (!signerOrProvider) return { ngoRegistry: null, donationTracker: null, milestoneVault: null };

    let ngoRegistry = null;
    let donationTracker = null;
    let milestoneVault = null;

    try {
      if (NGO_REGISTRY_ADDRESS) {
        ngoRegistry = new ethers.Contract(NGO_REGISTRY_ADDRESS, NGO_REGISTRY_ABI, signerOrProvider);
      }
      if (DONATION_TRACKER_ADDRESS) {
        donationTracker = new ethers.Contract(DONATION_TRACKER_ADDRESS, DONATION_TRACKER_ABI, signerOrProvider);
      }
      if (MILESTONE_VAULT_ADDRESS) {
        milestoneVault = new ethers.Contract(MILESTONE_VAULT_ADDRESS, MILESTONE_VAULT_ABI, signerOrProvider);
      }
    } catch (err) {
      console.error("Failed to create contract instances:", err);
    }

    return { ngoRegistry, donationTracker, milestoneVault };
  }, [signer, provider]);

  return contracts;
}

export default useContracts;
