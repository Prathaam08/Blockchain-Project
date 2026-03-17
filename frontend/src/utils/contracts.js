/**
 * contracts.js — ABI imports and contract address constants.
 *
 * Loads contract ABIs from the abi/ directory and reads
 * contract addresses from environment variables.
 */

// ── Contract Addresses from env ──
export const NGO_REGISTRY_ADDRESS = import.meta.env.VITE_NGO_REGISTRY_ADDRESS || "";
export const DONATION_TRACKER_ADDRESS = import.meta.env.VITE_DONATION_TRACKER_ADDRESS || "";
export const MILESTONE_VAULT_ADDRESS = import.meta.env.VITE_MILESTONE_VAULT_ADDRESS || "";

// ── Contract ABIs ──
// These are loaded dynamically; provide fallback minimal ABIs for development
export const NGO_REGISTRY_ABI = [
  "function registerNGO(string name, address walletAddress, string metadataIPFSHash) external",
  "function verifyNGO(address ngoAddress) external",
  "function revokeNGO(address ngoAddress) external",
  "function isNGOVerified(address ngoAddress) external view returns (bool)",
  "function getNGO(address ngoAddress) external view returns (tuple(string name, address walletAddress, bool isVerified, string metadataIPFSHash, uint256 registeredAt, uint256 verifiedAt))",
  "function getNGOCount() external view returns (uint256)",
  "function getAllNGOAddresses() external view returns (address[])",
  "event NGORegistered(address indexed ngoAddress, string name, string metadataIPFSHash)",
  "event NGOVerified(address indexed ngoAddress, uint256 verifiedAt)",
  "event NGORevoked(address indexed ngoAddress)",
];

export const DONATION_TRACKER_ABI = [
  "function donate(address ngoAddress, string campaignId) external payable",
  "function withdraw(uint256 amount) external",
  "function ngoBalances(address) external view returns (uint256)",
  "function totalDonatedPerNGO(address) external view returns (uint256)",
  "function totalDonatedPerDonor(address) external view returns (uint256)",
  "function getDonationCount() external view returns (uint256)",
  "function getDonation(uint256 index) external view returns (tuple(address donor, address ngoAddress, uint256 amount, string campaignId, uint256 timestamp, uint256 blockNumber))",
  "function getCampaignTotal(address ngoAddress, string campaignId) external view returns (uint256)",
  "event DonationReceived(address indexed donor, address indexed ngoAddress, uint256 amount, string campaignId, uint256 timestamp, uint256 donationIndex)",
  "event FundsWithdrawn(address indexed ngoAddress, uint256 amount, uint256 timestamp)",
];

export const MILESTONE_VAULT_ABI = [
  "function createCampaign(string title, uint256 totalTarget, uint256 deadline, string[] milestoneDescriptions, uint256[] milestoneTargets) external",
  "function fundCampaign(uint256 campaignId) external payable",
  "function approveMilestone(uint256 campaignId, uint256 milestoneIndex) external",
  "function claimRefund(uint256 campaignId) external",
  "function getCampaign(uint256 campaignId) external view returns (tuple(uint256 id, address ngoAddress, string title, uint256 totalTarget, uint256 totalFunded, uint256 totalReleased, uint256 deadline, uint8 status, uint256 milestoneCount, uint256 createdAt))",
  "function getMilestone(uint256 campaignId, uint256 milestoneIndex) external view returns (tuple(string description, uint256 targetAmount, bool approved, uint256 approvedAt, uint256 releasedAmount))",
  "function getCampaignCount() external view returns (uint256)",
  "event CampaignCreated(uint256 indexed campaignId, address indexed ngoAddress, string title, uint256 totalTarget, uint256 deadline, uint256 milestoneCount)",
  "event FundsContributed(uint256 indexed campaignId, address indexed donor, uint256 amount, uint256 timestamp)",
  "event MilestoneApproved(uint256 indexed campaignId, uint256 milestoneIndex, uint256 approvedAt)",
  "event FundsReleased(uint256 indexed campaignId, address indexed ngoAddress, uint256 amount, uint256 milestoneIndex)",
  "event RefundIssued(uint256 indexed campaignId, address indexed donor, uint256 amount)",
];
