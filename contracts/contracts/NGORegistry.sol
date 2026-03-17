// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title NGORegistry
 * @author NGO Donation Platform
 * @notice Manages registration and verification of NGO addresses.
 * @dev Only the contract owner can verify or revoke NGOs.
 *      Each NGO has a name, wallet address, verification status,
 *      and an optional IPFS metadata hash for off-chain data.
 */
contract NGORegistry is Ownable, Pausable {
    /// @notice Data structure for each registered NGO
    struct NGO {
        string name;
        address walletAddress;
        bool isVerified;
        string metadataIPFSHash;
        uint256 registeredAt;
        uint256 verifiedAt;
    }

    /// @notice Mapping from wallet address to NGO data
    mapping(address => NGO) public ngos;

    /// @notice Array of all registered NGO addresses for enumeration
    address[] public ngoAddresses;

    /// @notice Mapping to check if an address is already registered
    mapping(address => bool) public isRegistered;

    // ── Events ──

    /// @notice Emitted when a new NGO is registered
    /// @param ngoAddress The wallet address of the NGO
    /// @param name The name of the NGO
    /// @param metadataIPFSHash IPFS hash for additional metadata
    event NGORegistered(
        address indexed ngoAddress,
        string name,
        string metadataIPFSHash
    );

    /// @notice Emitted when an NGO is verified by the owner
    /// @param ngoAddress The wallet address of the verified NGO
    /// @param verifiedAt Timestamp of verification
    event NGOVerified(address indexed ngoAddress, uint256 verifiedAt);

    /// @notice Emitted when an NGO's verification is revoked
    /// @param ngoAddress The wallet address of the revoked NGO
    event NGORevoked(address indexed ngoAddress);

    /// @notice Emitted when an NGO's metadata is updated
    /// @param ngoAddress The wallet address of the NGO
    /// @param newMetadataIPFSHash New IPFS hash
    event NGOMetadataUpdated(
        address indexed ngoAddress,
        string newMetadataIPFSHash
    );

    // ── Modifiers ──

    /// @notice Ensures the NGO address is registered
    modifier onlyRegistered(address _ngoAddress) {
        require(isRegistered[_ngoAddress], "NGORegistry: NGO not registered");
        _;
    }

    /**
     * @notice Constructor sets the deployer as the owner
     */
    constructor() Ownable(msg.sender) {}

    // ── Public Functions ──

    /**
     * @notice Register a new NGO
     * @dev Anyone can register an NGO, but only the owner can verify it.
     * @param _name The name of the NGO
     * @param _walletAddress The wallet address of the NGO
     * @param _metadataIPFSHash IPFS hash pointing to NGO metadata
     */
    function registerNGO(
        string calldata _name,
        address _walletAddress,
        string calldata _metadataIPFSHash
    ) external whenNotPaused {
        require(_walletAddress != address(0), "NGORegistry: zero address");
        require(bytes(_name).length > 0, "NGORegistry: empty name");
        require(!isRegistered[_walletAddress], "NGORegistry: already registered");

        ngos[_walletAddress] = NGO({
            name: _name,
            walletAddress: _walletAddress,
            isVerified: false,
            metadataIPFSHash: _metadataIPFSHash,
            registeredAt: block.timestamp,
            verifiedAt: 0
        });

        ngoAddresses.push(_walletAddress);
        isRegistered[_walletAddress] = true;

        emit NGORegistered(_walletAddress, _name, _metadataIPFSHash);
    }

    /**
     * @notice Verify an NGO (owner only)
     * @dev Sets the NGO's isVerified flag to true
     * @param _ngoAddress The wallet address of the NGO to verify
     */
    function verifyNGO(
        address _ngoAddress
    ) external onlyOwner onlyRegistered(_ngoAddress) whenNotPaused {
        require(!ngos[_ngoAddress].isVerified, "NGORegistry: already verified");

        ngos[_ngoAddress].isVerified = true;
        ngos[_ngoAddress].verifiedAt = block.timestamp;

        emit NGOVerified(_ngoAddress, block.timestamp);
    }

    /**
     * @notice Revoke an NGO's verification (owner only)
     * @dev Sets the NGO's isVerified flag to false
     * @param _ngoAddress The wallet address of the NGO to revoke
     */
    function revokeNGO(
        address _ngoAddress
    ) external onlyOwner onlyRegistered(_ngoAddress) {
        require(ngos[_ngoAddress].isVerified, "NGORegistry: not verified");

        ngos[_ngoAddress].isVerified = false;
        ngos[_ngoAddress].verifiedAt = 0;

        emit NGORevoked(_ngoAddress);
    }

    /**
     * @notice Update NGO metadata IPFS hash
     * @dev Only the NGO itself or the owner can update metadata
     * @param _ngoAddress The wallet address of the NGO
     * @param _newMetadataIPFSHash New IPFS hash
     */
    function updateMetadata(
        address _ngoAddress,
        string calldata _newMetadataIPFSHash
    ) external onlyRegistered(_ngoAddress) whenNotPaused {
        require(
            msg.sender == _ngoAddress || msg.sender == owner(),
            "NGORegistry: not authorized"
        );

        ngos[_ngoAddress].metadataIPFSHash = _newMetadataIPFSHash;

        emit NGOMetadataUpdated(_ngoAddress, _newMetadataIPFSHash);
    }

    // ── View Functions ──

    /**
     * @notice Check if an NGO is verified
     * @param _ngoAddress The wallet address to check
     * @return True if the NGO is verified
     */
    function isNGOVerified(address _ngoAddress) external view returns (bool) {
        return ngos[_ngoAddress].isVerified;
    }

    /**
     * @notice Get the total number of registered NGOs
     * @return Count of registered NGOs
     */
    function getNGOCount() external view returns (uint256) {
        return ngoAddresses.length;
    }

    /**
     * @notice Get full NGO details
     * @param _ngoAddress The wallet address of the NGO
     * @return NGO struct with all fields
     */
    function getNGO(address _ngoAddress) external view returns (NGO memory) {
        require(isRegistered[_ngoAddress], "NGORegistry: NGO not registered");
        return ngos[_ngoAddress];
    }

    /**
     * @notice Get all registered NGO addresses
     * @return Array of NGO addresses
     */
    function getAllNGOAddresses() external view returns (address[] memory) {
        return ngoAddresses;
    }

    // ── Admin Functions ──

    /**
     * @notice Pause the contract (owner only)
     * @dev Prevents registration and verification operations
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
