// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Interface for NGORegistry verification check
interface INGORegistryVault {
    function isNGOVerified(address _ngoAddress) external view returns (bool);
    function isRegistered(address _ngoAddress) external view returns (bool);
}

/**
 * @title MilestoneVault
 * @author NGO Donation Platform
 * @notice Manages milestone-based campaigns where funds are locked and released
 *         upon milestone completion approval.
 * @dev NGOs create campaigns with milestones and funding targets. Donors lock
 *      funds into the vault per campaign. An admin/oracle approves milestone
 *      completion, triggering fund release. Includes refund mechanism for
 *      failed or expired campaigns.
 */
contract MilestoneVault is Ownable, Pausable, ReentrancyGuard {
    /// @notice Reference to the NGORegistry contract
    INGORegistryVault public ngoRegistry;

    /// @notice Campaign status enum
    enum CampaignStatus {
        Active,
        Completed,
        Failed,
        Expired
    }

    /// @notice Milestone data structure
    struct Milestone {
        string description;
        uint256 targetAmount;
        bool approved;
        uint256 approvedAt;
        uint256 releasedAmount;
    }

    /// @notice Campaign data structure
    struct Campaign {
        uint256 id;
        address ngoAddress;
        string title;
        uint256 totalTarget;
        uint256 totalFunded;
        uint256 totalReleased;
        uint256 deadline;
        CampaignStatus status;
        uint256 milestoneCount;
        uint256 createdAt;
    }

    /// @notice Auto-incrementing campaign ID counter
    uint256 public campaignCounter;

    /// @notice Mapping from campaign ID to Campaign data
    mapping(uint256 => Campaign) public campaigns;

    /// @notice Mapping from campaign ID to milestone index to Milestone
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;

    /// @notice Mapping from campaign ID to donor address to contributed amount
    mapping(uint256 => mapping(address => uint256)) public contributions;

    /// @notice Mapping from campaign ID to list of donor addresses
    mapping(uint256 => address[]) public campaignDonors;

    /// @notice Track if a donor has already contributed to a campaign (to avoid duplicate entries)
    mapping(uint256 => mapping(address => bool)) public hasDonated;

    // ── Events ──

    /// @notice Emitted when a new campaign is created
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed ngoAddress,
        string title,
        uint256 totalTarget,
        uint256 deadline,
        uint256 milestoneCount
    );

    /// @notice Emitted when a milestone is created within a campaign
    event MilestoneCreated(
        uint256 indexed campaignId,
        uint256 milestoneIndex,
        string description,
        uint256 targetAmount
    );

    /// @notice Emitted when funds are contributed to a campaign
    event FundsContributed(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when a milestone is approved by the admin
    event MilestoneApproved(
        uint256 indexed campaignId,
        uint256 milestoneIndex,
        uint256 approvedAt
    );

    /// @notice Emitted when funds are released to an NGO upon milestone approval
    event FundsReleased(
        uint256 indexed campaignId,
        address indexed ngoAddress,
        uint256 amount,
        uint256 milestoneIndex
    );

    /// @notice Emitted when a refund is issued to a donor
    event RefundIssued(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount
    );

    /// @notice Emitted when a campaign status changes
    event CampaignStatusChanged(
        uint256 indexed campaignId,
        CampaignStatus newStatus
    );

    /**
     * @notice Constructor
     * @param _ngoRegistry Address of the deployed NGORegistry contract
     */
    constructor(address _ngoRegistry) Ownable(msg.sender) {
        require(_ngoRegistry != address(0), "MilestoneVault: zero registry");
        ngoRegistry = INGORegistryVault(_ngoRegistry);
    }

    // ── Campaign Management ──

    /**
     * @notice Create a new campaign with milestones
     * @dev Only verified NGOs can create campaigns.
     * @param _title Title of the campaign
     * @param _totalTarget Total funding target in wei
     * @param _deadline Unix timestamp deadline for the campaign
     * @param _milestoneDescriptions Array of milestone descriptions
     * @param _milestoneTargets Array of milestone target amounts in wei
     */
    function createCampaign(
        string calldata _title,
        uint256 _totalTarget,
        uint256 _deadline,
        string[] calldata _milestoneDescriptions,
        uint256[] calldata _milestoneTargets
    ) external whenNotPaused {
        require(
            ngoRegistry.isNGOVerified(msg.sender),
            "MilestoneVault: NGO not verified"
        );
        require(bytes(_title).length > 0, "MilestoneVault: empty title");
        require(_totalTarget > 0, "MilestoneVault: zero target");
        require(_deadline > block.timestamp, "MilestoneVault: past deadline");
        require(
            _milestoneDescriptions.length > 0,
            "MilestoneVault: no milestones"
        );
        require(
            _milestoneDescriptions.length == _milestoneTargets.length,
            "MilestoneVault: length mismatch"
        );

        // Verify milestone targets sum to total target
        uint256 milestoneSum;
        for (uint256 i = 0; i < _milestoneTargets.length; i++) {
            require(
                _milestoneTargets[i] > 0,
                "MilestoneVault: zero milestone target"
            );
            milestoneSum += _milestoneTargets[i];
        }
        require(
            milestoneSum == _totalTarget,
            "MilestoneVault: target mismatch"
        );

        uint256 campaignId = campaignCounter++;

        campaigns[campaignId] = Campaign({
            id: campaignId,
            ngoAddress: msg.sender,
            title: _title,
            totalTarget: _totalTarget,
            totalFunded: 0,
            totalReleased: 0,
            deadline: _deadline,
            status: CampaignStatus.Active,
            milestoneCount: _milestoneDescriptions.length,
            createdAt: block.timestamp
        });

        for (uint256 i = 0; i < _milestoneDescriptions.length; i++) {
            milestones[campaignId][i] = Milestone({
                description: _milestoneDescriptions[i],
                targetAmount: _milestoneTargets[i],
                approved: false,
                approvedAt: 0,
                releasedAmount: 0
            });

            emit MilestoneCreated(
                campaignId,
                i,
                _milestoneDescriptions[i],
                _milestoneTargets[i]
            );
        }

        emit CampaignCreated(
            campaignId,
            msg.sender,
            _title,
            _totalTarget,
            _deadline,
            _milestoneDescriptions.length
        );
    }

    /**
     * @notice Contribute funds to a campaign
     * @dev Campaign must be active and not expired.
     * @param _campaignId ID of the campaign to fund
     */
    function fundCampaign(
        uint256 _campaignId
    ) external payable whenNotPaused nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.totalTarget > 0, "MilestoneVault: campaign not found");
        require(
            campaign.status == CampaignStatus.Active,
            "MilestoneVault: campaign not active"
        );
        require(
            block.timestamp <= campaign.deadline,
            "MilestoneVault: campaign expired"
        );
        require(msg.value > 0, "MilestoneVault: zero contribution");

        campaign.totalFunded += msg.value;
        contributions[_campaignId][msg.sender] += msg.value;

        if (!hasDonated[_campaignId][msg.sender]) {
            campaignDonors[_campaignId].push(msg.sender);
            hasDonated[_campaignId][msg.sender] = true;
        }

        emit FundsContributed(
            _campaignId,
            msg.sender,
            msg.value,
            block.timestamp
        );
    }

    /**
     * @notice Approve a milestone and release funds to the NGO
     * @dev Only the contract owner (admin/oracle) can approve milestones.
     *      Funds are released proportionally based on the milestone target.
     * @param _campaignId ID of the campaign
     * @param _milestoneIndex Index of the milestone to approve
     */
    function approveMilestone(
        uint256 _campaignId,
        uint256 _milestoneIndex
    ) external onlyOwner whenNotPaused nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.totalTarget > 0, "MilestoneVault: campaign not found");
        require(
            campaign.status == CampaignStatus.Active,
            "MilestoneVault: campaign not active"
        );
        require(
            _milestoneIndex < campaign.milestoneCount,
            "MilestoneVault: invalid milestone"
        );

        Milestone storage milestone = milestones[_campaignId][_milestoneIndex];
        require(!milestone.approved, "MilestoneVault: already approved");

        milestone.approved = true;
        milestone.approvedAt = block.timestamp;

        emit MilestoneApproved(_campaignId, _milestoneIndex, block.timestamp);

        // Calculate release amount: proportional to funded amount
        uint256 releaseAmount = (campaign.totalFunded *
            milestone.targetAmount) / campaign.totalTarget;

        // Don't release more than available
        uint256 availableFunds = campaign.totalFunded - campaign.totalReleased;
        if (releaseAmount > availableFunds) {
            releaseAmount = availableFunds;
        }

        if (releaseAmount > 0) {
            milestone.releasedAmount = releaseAmount;
            campaign.totalReleased += releaseAmount;

            (bool success, ) = payable(campaign.ngoAddress).call{
                value: releaseAmount
            }("");
            require(success, "MilestoneVault: transfer failed");

            emit FundsReleased(
                _campaignId,
                campaign.ngoAddress,
                releaseAmount,
                _milestoneIndex
            );
        }

        // Check if all milestones are approved → mark campaign completed
        bool allApproved = true;
        for (uint256 i = 0; i < campaign.milestoneCount; i++) {
            if (!milestones[_campaignId][i].approved) {
                allApproved = false;
                break;
            }
        }
        if (allApproved) {
            campaign.status = CampaignStatus.Completed;
            emit CampaignStatusChanged(
                _campaignId,
                CampaignStatus.Completed
            );
        }
    }

    /**
     * @notice Mark a campaign as failed and enable refunds (owner only)
     * @param _campaignId ID of the campaign to fail
     */
    function failCampaign(
        uint256 _campaignId
    ) external onlyOwner {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.totalTarget > 0, "MilestoneVault: campaign not found");
        require(
            campaign.status == CampaignStatus.Active,
            "MilestoneVault: campaign not active"
        );

        campaign.status = CampaignStatus.Failed;
        emit CampaignStatusChanged(_campaignId, CampaignStatus.Failed);
    }

    /**
     * @notice Mark an expired campaign (anyone can call after deadline)
     * @param _campaignId ID of the campaign
     */
    function expireCampaign(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.totalTarget > 0, "MilestoneVault: campaign not found");
        require(
            campaign.status == CampaignStatus.Active,
            "MilestoneVault: campaign not active"
        );
        require(
            block.timestamp > campaign.deadline,
            "MilestoneVault: not expired"
        );

        campaign.status = CampaignStatus.Expired;
        emit CampaignStatusChanged(_campaignId, CampaignStatus.Expired);
    }

    /**
     * @notice Claim refund for a failed or expired campaign
     * @dev Only donors who contributed can claim. Refund is proportional
     *      to their contribution minus any already-released funds.
     * @param _campaignId ID of the campaign
     */
    function claimRefund(
        uint256 _campaignId
    ) external whenNotPaused nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(
            campaign.status == CampaignStatus.Failed ||
                campaign.status == CampaignStatus.Expired,
            "MilestoneVault: not refundable"
        );

        uint256 contributed = contributions[_campaignId][msg.sender];
        require(contributed > 0, "MilestoneVault: no contribution");

        // Calculate refund: proportional share of remaining funds
        uint256 remainingFunds = campaign.totalFunded - campaign.totalReleased;
        uint256 refundAmount = (remainingFunds * contributed) /
            campaign.totalFunded;

        require(refundAmount > 0, "MilestoneVault: zero refund");

        contributions[_campaignId][msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "MilestoneVault: transfer failed");

        emit RefundIssued(_campaignId, msg.sender, refundAmount);
    }

    // ── View Functions ──

    /**
     * @notice Get campaign details
     * @param _campaignId ID of the campaign
     * @return Campaign struct
     */
    function getCampaign(
        uint256 _campaignId
    ) external view returns (Campaign memory) {
        require(
            campaigns[_campaignId].totalTarget > 0,
            "MilestoneVault: campaign not found"
        );
        return campaigns[_campaignId];
    }

    /**
     * @notice Get a specific milestone of a campaign
     * @param _campaignId ID of the campaign
     * @param _milestoneIndex Index of the milestone
     * @return Milestone struct
     */
    function getMilestone(
        uint256 _campaignId,
        uint256 _milestoneIndex
    ) external view returns (Milestone memory) {
        require(
            _milestoneIndex < campaigns[_campaignId].milestoneCount,
            "MilestoneVault: invalid milestone"
        );
        return milestones[_campaignId][_milestoneIndex];
    }

    /**
     * @notice Get the contribution of a donor to a campaign
     * @param _campaignId ID of the campaign
     * @param _donor Address of the donor
     * @return Amount contributed in wei
     */
    function getContribution(
        uint256 _campaignId,
        address _donor
    ) external view returns (uint256) {
        return contributions[_campaignId][_donor];
    }

    /**
     * @notice Get all donors for a campaign
     * @param _campaignId ID of the campaign
     * @return Array of donor addresses
     */
    function getCampaignDonors(
        uint256 _campaignId
    ) external view returns (address[] memory) {
        return campaignDonors[_campaignId];
    }

    /**
     * @notice Get the total number of campaigns
     * @return Total campaign count
     */
    function getCampaignCount() external view returns (uint256) {
        return campaignCounter;
    }

    // ── Admin Functions ──

    /**
     * @notice Update the NGORegistry address (owner only)
     * @param _newRegistry New registry address
     */
    function updateRegistry(address _newRegistry) external onlyOwner {
        require(_newRegistry != address(0), "MilestoneVault: zero address");
        ngoRegistry = INGORegistryVault(_newRegistry);
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
