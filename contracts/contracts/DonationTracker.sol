// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Interface for NGORegistry to check verification status
interface INGORegistry {
    function isNGOVerified(address _ngoAddress) external view returns (bool);
    function isRegistered(address _ngoAddress) external view returns (bool);
}

/**
 * @title DonationTracker
 * @author NGO Donation Platform
 * @notice Tracks ETH donations to verified NGOs with campaign support.
 * @dev Integrates with NGORegistry to verify NGOs before accepting donations.
 *      Uses ReentrancyGuard on all fund movements. NGOs can withdraw
 *      their accumulated balance at any time.
 */
contract DonationTracker is Ownable, Pausable, ReentrancyGuard {
    /// @notice Reference to the NGORegistry contract
    INGORegistry public ngoRegistry;

    /// @notice Data structure for each donation
    struct Donation {
        address donor;
        address ngoAddress;
        uint256 amount;
        string campaignId;
        uint256 timestamp;
        uint256 blockNumber;
    }

    /// @notice All donations stored in order
    Donation[] public donations;

    /// @notice Total balance available for withdrawal per NGO
    mapping(address => uint256) public ngoBalances;

    /// @notice Total donated per NGO (lifetime, not reduced by withdrawals)
    mapping(address => uint256) public totalDonatedPerNGO;

    /// @notice Total donated per campaign (NGO address + campaignId hash)
    mapping(bytes32 => uint256) public totalDonatedPerCampaign;

    /// @notice Total donated per donor
    mapping(address => uint256) public totalDonatedPerDonor;

    /// @notice Donation count per donor
    mapping(address => uint256) public donorDonationCount;

    /// @notice Donation indices per donor for lookups
    mapping(address => uint256[]) public donorDonationIndices;

    /// @notice Donation indices per NGO for lookups
    mapping(address => uint256[]) public ngoDonationIndices;

    // ── Events ──

    /// @notice Emitted when a donation is received
    /// @param donor Address of the donor
    /// @param ngoAddress Address of the NGO receiving the donation
    /// @param amount Amount of ETH donated (in wei)
    /// @param campaignId Campaign identifier string
    /// @param timestamp Block timestamp
    /// @param donationIndex Index in the donations array
    event DonationReceived(
        address indexed donor,
        address indexed ngoAddress,
        uint256 amount,
        string campaignId,
        uint256 timestamp,
        uint256 donationIndex
    );

    /// @notice Emitted when an NGO withdraws funds
    /// @param ngoAddress Address of the NGO
    /// @param amount Amount withdrawn (in wei)
    /// @param timestamp Block timestamp
    event FundsWithdrawn(
        address indexed ngoAddress,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when the NGORegistry address is updated
    /// @param newRegistry Address of the new NGORegistry
    event RegistryUpdated(address indexed newRegistry);

    /**
     * @notice Constructor
     * @param _ngoRegistry Address of the deployed NGORegistry contract
     */
    constructor(address _ngoRegistry) Ownable(msg.sender) {
        require(_ngoRegistry != address(0), "DonationTracker: zero registry");
        ngoRegistry = INGORegistry(_ngoRegistry);
    }

    // ── Core Functions ──

    /**
     * @notice Donate ETH to a verified NGO
     * @dev The NGO must be verified in the NGORegistry.
     *      msg.value must be greater than 0.
     * @param _ngoAddress Address of the NGO to donate to
     * @param _campaignId Campaign identifier (can be empty for general donations)
     */
    function donate(
        address _ngoAddress,
        string calldata _campaignId
    ) external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "DonationTracker: zero donation");
        require(
            ngoRegistry.isRegistered(_ngoAddress),
            "DonationTracker: NGO not registered"
        );
        require(
            ngoRegistry.isNGOVerified(_ngoAddress),
            "DonationTracker: NGO not verified"
        );

        uint256 donationIndex = donations.length;

        donations.push(
            Donation({
                donor: msg.sender,
                ngoAddress: _ngoAddress,
                amount: msg.value,
                campaignId: _campaignId,
                timestamp: block.timestamp,
                blockNumber: block.number
            })
        );

        // Update balances and tracking
        ngoBalances[_ngoAddress] += msg.value;
        totalDonatedPerNGO[_ngoAddress] += msg.value;
        totalDonatedPerDonor[msg.sender] += msg.value;
        donorDonationCount[msg.sender]++;

        // Track campaign totals
        bytes32 campaignKey = keccak256(
            abi.encodePacked(_ngoAddress, _campaignId)
        );
        totalDonatedPerCampaign[campaignKey] += msg.value;

        // Track indices for lookups
        donorDonationIndices[msg.sender].push(donationIndex);
        ngoDonationIndices[_ngoAddress].push(donationIndex);

        emit DonationReceived(
            msg.sender,
            _ngoAddress,
            msg.value,
            _campaignId,
            block.timestamp,
            donationIndex
        );
    }

    /**
     * @notice Withdraw accumulated funds (NGO only)
     * @dev Only the NGO itself can withdraw its balance.
     *      Uses ReentrancyGuard to prevent reentrancy attacks.
     * @param _amount Amount to withdraw in wei
     */
    function withdraw(uint256 _amount) external whenNotPaused nonReentrant {
        require(_amount > 0, "DonationTracker: zero withdrawal");
        require(
            ngoBalances[msg.sender] >= _amount,
            "DonationTracker: insufficient balance"
        );
        require(
            ngoRegistry.isNGOVerified(msg.sender),
            "DonationTracker: NGO not verified"
        );

        ngoBalances[msg.sender] -= _amount;

        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        require(success, "DonationTracker: transfer failed");

        emit FundsWithdrawn(msg.sender, _amount, block.timestamp);
    }

    // ── View Functions ──

    /**
     * @notice Get the total number of donations
     * @return Total donation count
     */
    function getDonationCount() external view returns (uint256) {
        return donations.length;
    }

    /**
     * @notice Get a specific donation by index
     * @param _index Index in the donations array
     * @return Donation struct
     */
    function getDonation(
        uint256 _index
    ) external view returns (Donation memory) {
        require(_index < donations.length, "DonationTracker: invalid index");
        return donations[_index];
    }

    /**
     * @notice Get all donation indices for a specific donor
     * @param _donor Address of the donor
     * @return Array of donation indices
     */
    function getDonorDonationIndices(
        address _donor
    ) external view returns (uint256[] memory) {
        return donorDonationIndices[_donor];
    }

    /**
     * @notice Get all donation indices for a specific NGO
     * @param _ngoAddress Address of the NGO
     * @return Array of donation indices
     */
    function getNGODonationIndices(
        address _ngoAddress
    ) external view returns (uint256[] memory) {
        return ngoDonationIndices[_ngoAddress];
    }

    /**
     * @notice Get total donated for a specific campaign
     * @param _ngoAddress Address of the NGO
     * @param _campaignId Campaign identifier
     * @return Total donated in wei
     */
    function getCampaignTotal(
        address _ngoAddress,
        string calldata _campaignId
    ) external view returns (uint256) {
        bytes32 campaignKey = keccak256(
            abi.encodePacked(_ngoAddress, _campaignId)
        );
        return totalDonatedPerCampaign[campaignKey];
    }

    // ── Admin Functions ──

    /**
     * @notice Update the NGORegistry address (owner only)
     * @param _newRegistry New NGORegistry address
     */
    function updateRegistry(address _newRegistry) external onlyOwner {
        require(_newRegistry != address(0), "DonationTracker: zero address");
        ngoRegistry = INGORegistry(_newRegistry);
        emit RegistryUpdated(_newRegistry);
    }

    /**
     * @notice Pause the contract (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
