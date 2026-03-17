/**
 * @file NGORegistry.test.js
 * @description Full test suite for the NGORegistry smart contract.
 *              Covers registration, verification, revocation, metadata updates,
 *              access control, pausability, and all revert conditions.
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NGORegistry", function () {
  let ngoRegistry;
  let owner, ngo1, ngo2, nonOwner;

  beforeEach(async function () {
    [owner, ngo1, ngo2, nonOwner] = await ethers.getSigners();

    const NGORegistry = await ethers.getContractFactory("NGORegistry");
    ngoRegistry = await NGORegistry.deploy();
    await ngoRegistry.waitForDeployment();
  });

  // ── Registration Tests ──

  describe("Registration", function () {
    it("should register a new NGO", async function () {
      const tx = await ngoRegistry.registerNGO(
        "Green Earth",
        ngo1.address,
        "QmHash123"
      );

      await expect(tx)
        .to.emit(ngoRegistry, "NGORegistered")
        .withArgs(ngo1.address, "Green Earth", "QmHash123");

      const ngo = await ngoRegistry.getNGO(ngo1.address);
      expect(ngo.name).to.equal("Green Earth");
      expect(ngo.walletAddress).to.equal(ngo1.address);
      expect(ngo.isVerified).to.be.false;
      expect(ngo.metadataIPFSHash).to.equal("QmHash123");
    });

    it("should increment NGO count after registration", async function () {
      expect(await ngoRegistry.getNGOCount()).to.equal(0);

      await ngoRegistry.registerNGO("NGO 1", ngo1.address, "QmHash1");
      expect(await ngoRegistry.getNGOCount()).to.equal(1);

      await ngoRegistry.registerNGO("NGO 2", ngo2.address, "QmHash2");
      expect(await ngoRegistry.getNGOCount()).to.equal(2);
    });

    it("should revert when registering with zero address", async function () {
      await expect(
        ngoRegistry.registerNGO("Test", ethers.ZeroAddress, "QmHash")
      ).to.be.revertedWith("NGORegistry: zero address");
    });

    it("should revert when registering with empty name", async function () {
      await expect(
        ngoRegistry.registerNGO("", ngo1.address, "QmHash")
      ).to.be.revertedWith("NGORegistry: empty name");
    });

    it("should revert when registering a duplicate address", async function () {
      await ngoRegistry.registerNGO("NGO 1", ngo1.address, "QmHash1");
      await expect(
        ngoRegistry.registerNGO("NGO 1 Duplicate", ngo1.address, "QmHash2")
      ).to.be.revertedWith("NGORegistry: already registered");
    });

    it("should allow registration with empty IPFS hash", async function () {
      await expect(
        ngoRegistry.registerNGO("NGO 1", ngo1.address, "")
      ).to.not.be.reverted;
    });
  });

  // ── Verification Tests ──

  describe("Verification", function () {
    beforeEach(async function () {
      await ngoRegistry.registerNGO("Green Earth", ngo1.address, "QmHash123");
    });

    it("should verify an NGO (owner only)", async function () {
      const tx = await ngoRegistry.verifyNGO(ngo1.address);

      await expect(tx).to.emit(ngoRegistry, "NGOVerified");

      const ngo = await ngoRegistry.getNGO(ngo1.address);
      expect(ngo.isVerified).to.be.true;
      expect(ngo.verifiedAt).to.be.gt(0);
    });

    it("should return true for isNGOVerified after verification", async function () {
      expect(await ngoRegistry.isNGOVerified(ngo1.address)).to.be.false;
      await ngoRegistry.verifyNGO(ngo1.address);
      expect(await ngoRegistry.isNGOVerified(ngo1.address)).to.be.true;
    });

    it("should revert when non-owner tries to verify", async function () {
      await expect(
        ngoRegistry.connect(nonOwner).verifyNGO(ngo1.address)
      ).to.be.revertedWithCustomError(ngoRegistry, "OwnableUnauthorizedAccount");
    });

    it("should revert when verifying an unregistered NGO", async function () {
      await expect(
        ngoRegistry.verifyNGO(ngo2.address)
      ).to.be.revertedWith("NGORegistry: NGO not registered");
    });

    it("should revert when verifying an already verified NGO", async function () {
      await ngoRegistry.verifyNGO(ngo1.address);
      await expect(
        ngoRegistry.verifyNGO(ngo1.address)
      ).to.be.revertedWith("NGORegistry: already verified");
    });
  });

  // ── Revocation Tests ──

  describe("Revocation", function () {
    beforeEach(async function () {
      await ngoRegistry.registerNGO("Green Earth", ngo1.address, "QmHash123");
      await ngoRegistry.verifyNGO(ngo1.address);
    });

    it("should revoke a verified NGO", async function () {
      const tx = await ngoRegistry.revokeNGO(ngo1.address);

      await expect(tx)
        .to.emit(ngoRegistry, "NGORevoked")
        .withArgs(ngo1.address);

      const ngo = await ngoRegistry.getNGO(ngo1.address);
      expect(ngo.isVerified).to.be.false;
    });

    it("should revert when non-owner tries to revoke", async function () {
      await expect(
        ngoRegistry.connect(nonOwner).revokeNGO(ngo1.address)
      ).to.be.revertedWithCustomError(ngoRegistry, "OwnableUnauthorizedAccount");
    });

    it("should revert when revoking a non-verified NGO", async function () {
      await ngoRegistry.revokeNGO(ngo1.address);
      await expect(
        ngoRegistry.revokeNGO(ngo1.address)
      ).to.be.revertedWith("NGORegistry: not verified");
    });
  });

  // ── Metadata Update Tests ──

  describe("Metadata Update", function () {
    beforeEach(async function () {
      await ngoRegistry.registerNGO("Green Earth", ngo1.address, "QmHash123");
    });

    it("should allow owner to update metadata", async function () {
      const tx = await ngoRegistry.updateMetadata(ngo1.address, "QmNewHash");

      await expect(tx)
        .to.emit(ngoRegistry, "NGOMetadataUpdated")
        .withArgs(ngo1.address, "QmNewHash");

      const ngo = await ngoRegistry.getNGO(ngo1.address);
      expect(ngo.metadataIPFSHash).to.equal("QmNewHash");
    });

    it("should allow NGO to update its own metadata", async function () {
      await expect(
        ngoRegistry.connect(ngo1).updateMetadata(ngo1.address, "QmNewHash")
      ).to.not.be.reverted;
    });

    it("should revert when unauthorized user updates metadata", async function () {
      await expect(
        ngoRegistry.connect(nonOwner).updateMetadata(ngo1.address, "QmNewHash")
      ).to.be.revertedWith("NGORegistry: not authorized");
    });
  });

  // ── View Functions Tests ──

  describe("View Functions", function () {
    it("should return all NGO addresses", async function () {
      await ngoRegistry.registerNGO("NGO 1", ngo1.address, "QmHash1");
      await ngoRegistry.registerNGO("NGO 2", ngo2.address, "QmHash2");

      const addresses = await ngoRegistry.getAllNGOAddresses();
      expect(addresses.length).to.equal(2);
      expect(addresses[0]).to.equal(ngo1.address);
      expect(addresses[1]).to.equal(ngo2.address);
    });

    it("should revert getNGO for unregistered address", async function () {
      await expect(
        ngoRegistry.getNGO(ngo1.address)
      ).to.be.revertedWith("NGORegistry: NGO not registered");
    });
  });

  // ── Pausability Tests ──

  describe("Pausability", function () {
    it("should allow owner to pause", async function () {
      await ngoRegistry.pause();
      await expect(
        ngoRegistry.registerNGO("NGO", ngo1.address, "QmHash")
      ).to.be.revertedWithCustomError(ngoRegistry, "EnforcedPause");
    });

    it("should allow owner to unpause", async function () {
      await ngoRegistry.pause();
      await ngoRegistry.unpause();
      await expect(
        ngoRegistry.registerNGO("NGO", ngo1.address, "QmHash")
      ).to.not.be.reverted;
    });

    it("should revert when non-owner tries to pause", async function () {
      await expect(
        ngoRegistry.connect(nonOwner).pause()
      ).to.be.revertedWithCustomError(ngoRegistry, "OwnableUnauthorizedAccount");
    });
  });
});
