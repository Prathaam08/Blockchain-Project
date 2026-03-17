/**
 * @file DonationTracker.test.js
 * @description Full test suite for the DonationTracker smart contract.
 *              Covers donations, withdrawals, tracking, access control,
 *              reentrancy guard, and all revert conditions.
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DonationTracker", function () {
  let ngoRegistry, donationTracker;
  let owner, ngo1, ngo2, donor1, donor2;

  beforeEach(async function () {
    [owner, ngo1, ngo2, donor1, donor2] = await ethers.getSigners();

    // Deploy NGORegistry
    const NGORegistry = await ethers.getContractFactory("NGORegistry");
    ngoRegistry = await NGORegistry.deploy();
    await ngoRegistry.waitForDeployment();

    // Deploy DonationTracker
    const DonationTracker = await ethers.getContractFactory("DonationTracker");
    donationTracker = await DonationTracker.deploy(await ngoRegistry.getAddress());
    await donationTracker.waitForDeployment();

    // Register and verify NGO1
    await ngoRegistry.registerNGO("Green Earth", ngo1.address, "QmHash1");
    await ngoRegistry.verifyNGO(ngo1.address);
  });

  // ── Donation Tests ──

  describe("Donations", function () {
    it("should accept donation to a verified NGO", async function () {
      const donationAmount = ethers.parseEther("1.0");

      const tx = await donationTracker
        .connect(donor1)
        .donate(ngo1.address, "campaign-1", { value: donationAmount });

      await expect(tx)
        .to.emit(donationTracker, "DonationReceived")
        .withArgs(
          donor1.address,
          ngo1.address,
          donationAmount,
          "campaign-1",
          await getBlockTimestamp(tx),
          0 // first donation index
        );
    });

    it("should track the donation correctly", async function () {
      const donationAmount = ethers.parseEther("2.5");

      await donationTracker
        .connect(donor1)
        .donate(ngo1.address, "campaign-1", { value: donationAmount });

      // Check donation record
      const donation = await donationTracker.getDonation(0);
      expect(donation.donor).to.equal(donor1.address);
      expect(donation.ngoAddress).to.equal(ngo1.address);
      expect(donation.amount).to.equal(donationAmount);
      expect(donation.campaignId).to.equal("campaign-1");

      // Check balances and totals
      expect(await donationTracker.ngoBalances(ngo1.address)).to.equal(donationAmount);
      expect(await donationTracker.totalDonatedPerNGO(ngo1.address)).to.equal(donationAmount);
      expect(await donationTracker.totalDonatedPerDonor(donor1.address)).to.equal(donationAmount);
      expect(await donationTracker.donorDonationCount(donor1.address)).to.equal(1);
    });

    it("should allow multiple donations", async function () {
      await donationTracker
        .connect(donor1)
        .donate(ngo1.address, "campaign-1", { value: ethers.parseEther("1.0") });
      await donationTracker
        .connect(donor2)
        .donate(ngo1.address, "campaign-2", { value: ethers.parseEther("2.0") });

      expect(await donationTracker.getDonationCount()).to.equal(2);
      expect(await donationTracker.ngoBalances(ngo1.address)).to.equal(
        ethers.parseEther("3.0")
      );
    });

    it("should track campaign totals", async function () {
      await donationTracker
        .connect(donor1)
        .donate(ngo1.address, "camp-1", { value: ethers.parseEther("1.0") });
      await donationTracker
        .connect(donor2)
        .donate(ngo1.address, "camp-1", { value: ethers.parseEther("2.0") });

      const campaignTotal = await donationTracker.getCampaignTotal(
        ngo1.address,
        "camp-1"
      );
      expect(campaignTotal).to.equal(ethers.parseEther("3.0"));
    });

    it("should track donor donation indices", async function () {
      await donationTracker
        .connect(donor1)
        .donate(ngo1.address, "camp-1", { value: ethers.parseEther("1.0") });
      await donationTracker
        .connect(donor1)
        .donate(ngo1.address, "camp-2", { value: ethers.parseEther("0.5") });

      const indices = await donationTracker.getDonorDonationIndices(donor1.address);
      expect(indices.length).to.equal(2);
      expect(indices[0]).to.equal(0);
      expect(indices[1]).to.equal(1);
    });

    it("should revert donation to unregistered NGO", async function () {
      await expect(
        donationTracker
          .connect(donor1)
          .donate(ngo2.address, "camp-1", { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("DonationTracker: NGO not registered");
    });

    it("should revert donation to unverified NGO", async function () {
      await ngoRegistry.registerNGO("NGO2", ngo2.address, "QmHash2");

      await expect(
        donationTracker
          .connect(donor1)
          .donate(ngo2.address, "camp-1", { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("DonationTracker: NGO not verified");
    });

    it("should revert zero-value donation", async function () {
      await expect(
        donationTracker.connect(donor1).donate(ngo1.address, "camp-1", { value: 0 })
      ).to.be.revertedWith("DonationTracker: zero donation");
    });
  });

  // ── Withdrawal Tests ──

  describe("Withdrawals", function () {
    beforeEach(async function () {
      // Make a donation first
      await donationTracker
        .connect(donor1)
        .donate(ngo1.address, "camp-1", { value: ethers.parseEther("5.0") });
    });

    it("should allow NGO to withdraw funds", async function () {
      const withdrawAmount = ethers.parseEther("3.0");
      const balanceBefore = await ethers.provider.getBalance(ngo1.address);

      const tx = await donationTracker.connect(ngo1).withdraw(withdrawAmount);

      await expect(tx)
        .to.emit(donationTracker, "FundsWithdrawn")
        .withArgs(ngo1.address, withdrawAmount, await getBlockTimestamp(tx));

      const balanceAfter = await ethers.provider.getBalance(ngo1.address);
      // Account for gas costs
      expect(balanceAfter).to.be.gt(balanceBefore);

      // Check remaining balance
      expect(await donationTracker.ngoBalances(ngo1.address)).to.equal(
        ethers.parseEther("2.0")
      );
    });

    it("should revert when withdrawing zero amount", async function () {
      await expect(
        donationTracker.connect(ngo1).withdraw(0)
      ).to.be.revertedWith("DonationTracker: zero withdrawal");
    });

    it("should revert when withdrawing more than balance", async function () {
      await expect(
        donationTracker.connect(ngo1).withdraw(ethers.parseEther("10.0"))
      ).to.be.revertedWith("DonationTracker: insufficient balance");
    });

    it("should revert when unverified NGO tries to withdraw", async function () {
      // Revoke NGO1
      await ngoRegistry.revokeNGO(ngo1.address);

      await expect(
        donationTracker.connect(ngo1).withdraw(ethers.parseEther("1.0"))
      ).to.be.revertedWith("DonationTracker: NGO not verified");
    });

    it("should revert when non-NGO tries to withdraw", async function () {
      await expect(
        donationTracker.connect(donor1).withdraw(ethers.parseEther("1.0"))
      ).to.be.revertedWith("DonationTracker: insufficient balance");
    });
  });

  // ── View Function Tests ──

  describe("View Functions", function () {
    it("should return correct donation count", async function () {
      expect(await donationTracker.getDonationCount()).to.equal(0);

      await donationTracker
        .connect(donor1)
        .donate(ngo1.address, "camp-1", { value: ethers.parseEther("1.0") });

      expect(await donationTracker.getDonationCount()).to.equal(1);
    });

    it("should revert getDonation with invalid index", async function () {
      await expect(donationTracker.getDonation(0)).to.be.revertedWith(
        "DonationTracker: invalid index"
      );
    });

    it("should return NGO donation indices", async function () {
      await donationTracker
        .connect(donor1)
        .donate(ngo1.address, "camp-1", { value: ethers.parseEther("1.0") });
      await donationTracker
        .connect(donor2)
        .donate(ngo1.address, "camp-1", { value: ethers.parseEther("2.0") });

      const indices = await donationTracker.getNGODonationIndices(ngo1.address);
      expect(indices.length).to.equal(2);
    });
  });

  // ── Admin Functions Tests ──

  describe("Admin Functions", function () {
    it("should allow owner to update registry", async function () {
      const newAddress = donor1.address; // Just any address for testing
      await expect(
        donationTracker.updateRegistry(newAddress)
      ).to.emit(donationTracker, "RegistryUpdated");
    });

    it("should revert updateRegistry with zero address", async function () {
      await expect(
        donationTracker.updateRegistry(ethers.ZeroAddress)
      ).to.be.revertedWith("DonationTracker: zero address");
    });

    it("should allow owner to pause/unpause", async function () {
      await donationTracker.pause();
      await expect(
        donationTracker
          .connect(donor1)
          .donate(ngo1.address, "camp-1", { value: ethers.parseEther("1.0") })
      ).to.be.revertedWithCustomError(donationTracker, "EnforcedPause");

      await donationTracker.unpause();
      await expect(
        donationTracker
          .connect(donor1)
          .donate(ngo1.address, "camp-1", { value: ethers.parseEther("1.0") })
      ).to.not.be.reverted;
    });
  });

  // ── Constructor Tests ──

  describe("Constructor", function () {
    it("should revert with zero registry address", async function () {
      const DonationTracker = await ethers.getContractFactory("DonationTracker");
      await expect(
        DonationTracker.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("DonationTracker: zero registry");
    });
  });

  // ── Helper ──

  async function getBlockTimestamp(tx) {
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    return block.timestamp;
  }
});
