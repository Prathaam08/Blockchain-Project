/**
 * @file deploy.js
 * @description Hardhat deployment script for all NGO Donation Platform contracts.
 *              Deploys in order: NGORegistry → DonationTracker → MilestoneVault
 *              and logs all deployed addresses.
 */

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Deploying contracts with:", deployer.address);
  console.log("  Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── 1. Deploy NGORegistry ──
  console.log("\n📋 Deploying NGORegistry...");
  const NGORegistry = await ethers.getContractFactory("NGORegistry");
  const ngoRegistry = await NGORegistry.deploy();
  await ngoRegistry.waitForDeployment();
  const registryAddress = await ngoRegistry.getAddress();
  console.log("NGORegistry deployed to:", registryAddress);

  // ── 2. Deploy DonationTracker (needs NGORegistry address) ──
  console.log("\n💰 Deploying DonationTracker...");
  const DonationTracker = await ethers.getContractFactory("DonationTracker");
  const donationTracker = await DonationTracker.deploy(registryAddress);
  await donationTracker.waitForDeployment();
  const trackerAddress = await donationTracker.getAddress();
  console.log("DonationTracker deployed to:", trackerAddress);

  // ── 3. Deploy MilestoneVault (needs NGORegistry address) ──
  console.log("\n🏗️  Deploying MilestoneVault...");
  const MilestoneVault = await ethers.getContractFactory("MilestoneVault");
  const milestoneVault = await MilestoneVault.deploy(registryAddress);
  await milestoneVault.waitForDeployment();
  const vaultAddress = await milestoneVault.getAddress();
  console.log("MilestoneVault deployed to:", vaultAddress);

  // ── Summary ──
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ✅ All contracts deployed!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  NGORegistry:     ", registryAddress);
  console.log("  DonationTracker: ", trackerAddress);
  console.log("  MilestoneVault:  ", vaultAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return { registryAddress, trackerAddress, vaultAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
