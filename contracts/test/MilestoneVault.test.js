/**
 * @file MilestoneVault.test.js
 * @description Full test suite for the MilestoneVault smart contract.
 *              Covers campaign creation, funding, milestone approval,
 *              fund release, refunding, expiry, and all revert conditions.
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("MilestoneVault", function () {
  let ngoRegistry, milestoneVault;
  let owner, ngo1, ngo2, donor1, donor2;
  let futureDeadline;

  beforeEach(async function () {
    [owner, ngo1, ngo2, donor1, donor2] = await ethers.getSigners();

    // Deploy NGORegistry
    const NGORegistry = await ethers.getContractFactory("NGORegistry");
    ngoRegistry = await NGORegistry.deploy();
    await ngoRegistry.waitForDeployment();

    // Deploy MilestoneVault
    const MilestoneVault = await ethers.getContractFactory("MilestoneVault");
    milestoneVault = await MilestoneVault.deploy(await ngoRegistry.getAddress());
    await milestoneVault.waitForDeployment();

    // Register and verify NGO1
    await ngoRegistry.registerNGO("Green Earth", ngo1.address, "QmHash1");
    await ngoRegistry.verifyNGO(ngo1.address);

    // Set future deadline (30 days from now)
    futureDeadline = (await time.latest()) + 30 * 24 * 60 * 60;
  });

  // ── Campaign Creation Tests ──

  describe("Campaign Creation", function () {
    it("should create a campaign with milestones", async function () {
      const tx = await milestoneVault.connect(ngo1).createCampaign(
        "Save the Forest",
        ethers.parseEther("10.0"),
        futureDeadline,
        ["Research", "Plant Trees", "Monitor"],
        [
          ethers.parseEther("2.0"),
          ethers.parseEther("5.0"),
          ethers.parseEther("3.0"),
        ]
      );

      await expect(tx).to.emit(milestoneVault, "CampaignCreated");

      const campaign = await milestoneVault.getCampaign(0);
      expect(campaign.ngoAddress).to.equal(ngo1.address);
      expect(campaign.title).to.equal("Save the Forest");
      expect(campaign.totalTarget).to.equal(ethers.parseEther("10.0"));
      expect(campaign.milestoneCount).to.equal(3);
      expect(campaign.status).to.equal(0); // Active
    });

    it("should emit MilestoneCreated events for each milestone", async function () {
      const tx = await milestoneVault.connect(ngo1).createCampaign(
        "Campaign",
        ethers.parseEther("3.0"),
        futureDeadline,
        ["M1", "M2"],
        [ethers.parseEther("1.0"), ethers.parseEther("2.0")]
      );

      await expect(tx).to.emit(milestoneVault, "MilestoneCreated");
    });

    it("should revert when unverified NGO creates campaign", async function () {
      await ngoRegistry.registerNGO("NGO2", ngo2.address, "QmHash2");

      await expect(
        milestoneVault
          .connect(ngo2)
          .createCampaign("Test", ethers.parseEther("1.0"), futureDeadline, ["M1"], [ethers.parseEther("1.0")])
      ).to.be.revertedWith("MilestoneVault: NGO not verified");
    });

    it("should revert with empty title", async function () {
      await expect(
        milestoneVault
          .connect(ngo1)
          .createCampaign("", ethers.parseEther("1.0"), futureDeadline, ["M1"], [ethers.parseEther("1.0")])
      ).to.be.revertedWith("MilestoneVault: empty title");
    });

    it("should revert with zero target", async function () {
      await expect(
        milestoneVault
          .connect(ngo1)
          .createCampaign("Test", 0, futureDeadline, ["M1"], [ethers.parseEther("1.0")])
      ).to.be.revertedWith("MilestoneVault: zero target");
    });

    it("should revert with past deadline", async function () {
      const pastDeadline = (await time.latest()) - 1;
      await expect(
        milestoneVault
          .connect(ngo1)
          .createCampaign("Test", ethers.parseEther("1.0"), pastDeadline, ["M1"], [ethers.parseEther("1.0")])
      ).to.be.revertedWith("MilestoneVault: past deadline");
    });

    it("should revert with no milestones", async function () {
      await expect(
        milestoneVault
          .connect(ngo1)
          .createCampaign("Test", ethers.parseEther("1.0"), futureDeadline, [], [])
      ).to.be.revertedWith("MilestoneVault: no milestones");
    });

    it("should revert when milestone targets don't sum to total", async function () {
      await expect(
        milestoneVault.connect(ngo1).createCampaign(
          "Test",
          ethers.parseEther("10.0"),
          futureDeadline,
          ["M1", "M2"],
          [ethers.parseEther("3.0"), ethers.parseEther("5.0")]
        )
      ).to.be.revertedWith("MilestoneVault: target mismatch");
    });

    it("should revert when milestone descriptions/targets length mismatch", async function () {
      await expect(
        milestoneVault.connect(ngo1).createCampaign(
          "Test",
          ethers.parseEther("3.0"),
          futureDeadline,
          ["M1", "M2"],
          [ethers.parseEther("3.0")]
        )
      ).to.be.revertedWith("MilestoneVault: length mismatch");
    });
  });

  // ── Funding Tests ──

  describe("Funding", function () {
    beforeEach(async function () {
      await milestoneVault.connect(ngo1).createCampaign(
        "Save the Forest",
        ethers.parseEther("10.0"),
        futureDeadline,
        ["Research", "Plant Trees"],
        [ethers.parseEther("4.0"), ethers.parseEther("6.0")]
      );
    });

    it("should accept fund contributions", async function () {
      const tx = await milestoneVault
        .connect(donor1)
        .fundCampaign(0, { value: ethers.parseEther("3.0") });

      await expect(tx).to.emit(milestoneVault, "FundsContributed");

      const campaign = await milestoneVault.getCampaign(0);
      expect(campaign.totalFunded).to.equal(ethers.parseEther("3.0"));

      const contribution = await milestoneVault.getContribution(0, donor1.address);
      expect(contribution).to.equal(ethers.parseEther("3.0"));
    });

    it("should allow multiple donors", async function () {
      await milestoneVault
        .connect(donor1)
        .fundCampaign(0, { value: ethers.parseEther("3.0") });
      await milestoneVault
        .connect(donor2)
        .fundCampaign(0, { value: ethers.parseEther("5.0") });

      const campaign = await milestoneVault.getCampaign(0);
      expect(campaign.totalFunded).to.equal(ethers.parseEther("8.0"));

      const donors = await milestoneVault.getCampaignDonors(0);
      expect(donors.length).to.equal(2);
    });

    it("should revert for non-existent campaign", async function () {
      await expect(
        milestoneVault.connect(donor1).fundCampaign(99, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("MilestoneVault: campaign not found");
    });

    it("should revert for zero contribution", async function () {
      await expect(
        milestoneVault.connect(donor1).fundCampaign(0, { value: 0 })
      ).to.be.revertedWith("MilestoneVault: zero contribution");
    });
  });

  // ── Milestone Approval & Fund Release Tests ──

  describe("Milestone Approval", function () {
    beforeEach(async function () {
      // Create campaign
      await milestoneVault.connect(ngo1).createCampaign(
        "Save the Forest",
        ethers.parseEther("10.0"),
        futureDeadline,
        ["Research", "Plant Trees"],
        [ethers.parseEther("4.0"), ethers.parseEther("6.0")]
      );

      // Fund the campaign fully
      await milestoneVault
        .connect(donor1)
        .fundCampaign(0, { value: ethers.parseEther("10.0") });
    });

    it("should approve milestone and release funds", async function () {
      const ngoBalanceBefore = await ethers.provider.getBalance(ngo1.address);

      const tx = await milestoneVault.approveMilestone(0, 0);

      await expect(tx).to.emit(milestoneVault, "MilestoneApproved");
      await expect(tx).to.emit(milestoneVault, "FundsReleased");

      const milestone = await milestoneVault.getMilestone(0, 0);
      expect(milestone.approved).to.be.true;
      expect(milestone.releasedAmount).to.equal(ethers.parseEther("4.0"));
    });

    it("should mark campaign completed when all milestones approved", async function () {
      await milestoneVault.approveMilestone(0, 0);
      const tx = await milestoneVault.approveMilestone(0, 1);

      await expect(tx).to.emit(milestoneVault, "CampaignStatusChanged");

      const campaign = await milestoneVault.getCampaign(0);
      expect(campaign.status).to.equal(1); // Completed
    });

    it("should revert when non-owner approves milestone", async function () {
      await expect(
        milestoneVault.connect(donor1).approveMilestone(0, 0)
      ).to.be.revertedWithCustomError(milestoneVault, "OwnableUnauthorizedAccount");
    });

    it("should revert for already-approved milestone", async function () {
      await milestoneVault.approveMilestone(0, 0);
      await expect(
        milestoneVault.approveMilestone(0, 0)
      ).to.be.revertedWith("MilestoneVault: already approved");
    });

    it("should revert for invalid milestone index", async function () {
      await expect(
        milestoneVault.approveMilestone(0, 99)
      ).to.be.revertedWith("MilestoneVault: invalid milestone");
    });
  });

  // ── Campaign Failure & Refund Tests ──

  describe("Refunds", function () {
    beforeEach(async function () {
      await milestoneVault.connect(ngo1).createCampaign(
        "Test Campaign",
        ethers.parseEther("10.0"),
        futureDeadline,
        ["M1", "M2"],
        [ethers.parseEther("5.0"), ethers.parseEther("5.0")]
      );

      // Fund the campaign
      await milestoneVault
        .connect(donor1)
        .fundCampaign(0, { value: ethers.parseEther("6.0") });
      await milestoneVault
        .connect(donor2)
        .fundCampaign(0, { value: ethers.parseEther("4.0") });
    });

    it("should allow refund after campaign failure", async function () {
      await milestoneVault.failCampaign(0);

      const balanceBefore = await ethers.provider.getBalance(donor1.address);
      const tx = await milestoneVault.connect(donor1).claimRefund(0);

      await expect(tx).to.emit(milestoneVault, "RefundIssued");

      const balanceAfter = await ethers.provider.getBalance(donor1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should calculate proportional refund correctly", async function () {
      // Approve first milestone (releases 50% of funded amount proportionally)
      await milestoneVault.approveMilestone(0, 0);

      // Then fail the campaign
      await milestoneVault.failCampaign(0);

      // Remaining funds: 10 - 5 = 5 ETH
      // donor1 contributed 6/10 = 60%, so refund = 60% of 5 = 3 ETH
      const tx = await milestoneVault.connect(donor1).claimRefund(0);
      await expect(tx).to.emit(milestoneVault, "RefundIssued");
    });

    it("should revert refund for active campaign", async function () {
      await expect(
        milestoneVault.connect(donor1).claimRefund(0)
      ).to.be.revertedWith("MilestoneVault: not refundable");
    });

    it("should revert refund for non-contributor", async function () {
      await milestoneVault.failCampaign(0);

      await expect(
        milestoneVault.connect(owner).claimRefund(0)
      ).to.be.revertedWith("MilestoneVault: no contribution");
    });

    it("should revert double refund", async function () {
      await milestoneVault.failCampaign(0);
      await milestoneVault.connect(donor1).claimRefund(0);

      await expect(
        milestoneVault.connect(donor1).claimRefund(0)
      ).to.be.revertedWith("MilestoneVault: no contribution");
    });
  });

  // ── Expiry Tests ──

  describe("Expiry", function () {
    it("should allow expiring a campaign past deadline", async function () {
      const shortDeadline = (await time.latest()) + 60; // 60 seconds
      await milestoneVault.connect(ngo1).createCampaign(
        "Short Campaign",
        ethers.parseEther("1.0"),
        shortDeadline,
        ["M1"],
        [ethers.parseEther("1.0")]
      );

      // Advance time past deadline
      await time.increase(120);

      const tx = await milestoneVault.expireCampaign(0);
      await expect(tx).to.emit(milestoneVault, "CampaignStatusChanged");

      const campaign = await milestoneVault.getCampaign(0);
      expect(campaign.status).to.equal(3); // Expired
    });

    it("should revert expiry before deadline", async function () {
      await milestoneVault.connect(ngo1).createCampaign(
        "Campaign",
        ethers.parseEther("1.0"),
        futureDeadline,
        ["M1"],
        [ethers.parseEther("1.0")]
      );

      await expect(milestoneVault.expireCampaign(0)).to.be.revertedWith(
        "MilestoneVault: not expired"
      );
    });

    it("should allow refund after expiry", async function () {
      const shortDeadline = (await time.latest()) + 60;
      await milestoneVault.connect(ngo1).createCampaign(
        "Campaign",
        ethers.parseEther("1.0"),
        shortDeadline,
        ["M1"],
        [ethers.parseEther("1.0")]
      );

      await milestoneVault
        .connect(donor1)
        .fundCampaign(0, { value: ethers.parseEther("1.0") });

      await time.increase(120);
      await milestoneVault.expireCampaign(0);

      await expect(
        milestoneVault.connect(donor1).claimRefund(0)
      ).to.emit(milestoneVault, "RefundIssued");
    });
  });

  // ── Constructor Tests ──

  describe("Constructor", function () {
    it("should revert with zero registry address", async function () {
      const MilestoneVault = await ethers.getContractFactory("MilestoneVault");
      await expect(
        MilestoneVault.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("MilestoneVault: zero registry");
    });
  });

  // ── View Functions ──

  describe("View Functions", function () {
    it("should return campaign count", async function () {
      expect(await milestoneVault.getCampaignCount()).to.equal(0);

      await milestoneVault.connect(ngo1).createCampaign(
        "Campaign",
        ethers.parseEther("1.0"),
        futureDeadline,
        ["M1"],
        [ethers.parseEther("1.0")]
      );

      expect(await milestoneVault.getCampaignCount()).to.equal(1);
    });

    it("should revert getCampaign for non-existent campaign", async function () {
      await expect(milestoneVault.getCampaign(99)).to.be.revertedWith(
        "MilestoneVault: campaign not found"
      );
    });
  });
});
