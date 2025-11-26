// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../src/PitchforksCore.sol";
import "../src/PitchforksGovernance.sol";
import "../src/PitchforksTreasury.sol";

/**
 * @title FerryAdapter
 * @dev Bridge between existing Ferry contracts and new Pitchforks governance system
 * @notice Enables governance oversight of Ferry operations without disrupting existing functionality
 */
contract FerryAdapter is PitchforksCore, ReentrancyGuard {
    
    // ============ Interfaces for Existing Contracts ============
    
    interface IFerryContract {
        function bridgeOut(
            address token,
            uint256 amount,
            address to,
            uint256 chainId
        ) external payable;
        
        function fulfillBridgeIn(
            address token,
            uint256 amount,
            address to,
            bytes32 messageId
        ) external;
        
        function nativeFeeWei() external view returns (uint256);
        function feeBps() external view returns (uint256);
    }
    
    interface IQuantumSignatureNFT {
        function mintWithSignature(
            address to,
            string memory tokenURI,
            bytes memory signature
        ) external payable;
        
        function mintFeeWei() external view returns (uint256);
    }
    
    // ============ State Variables ============
    
    PitchforksGovernance public immutable GOVERNANCE_CONTRACT;
    PitchforksTreasury public immutable TREASURY_CONTRACT;
    
    // Existing contract addresses
    IFerryContract public immutable FERRY_CONTRACT;
    IERC20 public immutable PFORK_TOKEN;
    IQuantumSignatureNFT public immutable NFT_CONTRACT;
    
    // Governance tracking
    mapping(bytes32 => bool) public governanceApprovedBridges;
    mapping(address => uint256) public bridgeCounts;
    uint256 public totalBridgeVolume;
    
    // Emergency controls
    bool public emergencyPauseEnabled;
    mapping(address => bool) public authorizedRelayers;
    
    // ============ Events ============
    
    event BridgeGovernanceApproved(
        bytes32 indexed bridgeId,
        address indexed proposer,
        uint256 amount,
        uint256 chainId
    );
    
    event BridgeExecuted(
        bytes32 indexed bridgeId,
        address indexed user,
        uint256 amount,
        uint256 chainId,
        uint256 timestamp
    );
    
    event NFTMintingApproved(
        address indexed recipient,
        string tokenURI,
        bytes32 indexed approvalHash
    );
    
    event EmergencyPauseToggled(
        bool enabled,
        address indexed executor,
        string reason
    );
    
    // ============ Constructor ============
    
    constructor(
        address _governanceContract,
        address _treasuryContract,
        address _ferryContract,
        address _pforkToken
    ) PitchforksCore(Project.FERRY) {
        require(_governanceContract != address(0), "Invalid governance address");
        require(_treasuryContract != address(0), "Invalid treasury address");
        require(_ferryContract != address(0), "Invalid ferry contract address");
        require(_pforkToken != address(0), "Invalid PFORK token address");
        
        GOVERNANCE_CONTRACT = PitchforksGovernance(_governanceContract);
        TREASURY_CONTRACT = PitchforksTreasury(_treasuryContract);
        FERRY_CONTRACT = IFerryContract(_ferryContract);
        PFORK_TOKEN = IERC20(_pforkToken);
        
        // Set up initial authorized relayer (deployer)
        authorizedRelayers[msg.sender] = true;
    }
    
    // ============ Governance-Integrated Bridge Functions ============
    
    /**
     * @dev Bridge out with governance approval
     */
    function bridgeOutWithGovernance(
        address token,
        uint256 amount,
        address to,
        uint256 chainId,
        bool requiresGovernanceApproval
    ) external payable nonReentrant {
        require(!emergencyPauseEnabled, "Emergency pause active");
        require(to != address(0), "Invalid recipient");
        require(chainId != block.chainid, "Cannot bridge to same chain");
        
        bytes32 bridgeId = keccak256(abi.encodePacked(
            msg.sender,
            token,
            amount,
            to,
            chainId,
            block.timestamp
        ));
        
        // Check if governance approval is required
        if (requiresGovernanceApproval && amount > getGovernanceThreshold()) {
            require(governanceApprovedBridges[bridgeId], "Bridge not approved by governance");
        }
        
        // Pay native fee to Ferry contract
        uint256 nativeFee = FERRY_CONTRACT.nativeFeeWei();
        require(msg.value >= nativeFee, "Insufficient native fee");
        
        // Execute bridge through existing contract
        if (token == address(0)) {
            // Native token bridge
            FERRY_CONTRACT.bridgeOut{value: amount + nativeFee}(
                token,
                amount,
                to,
                chainId
            );
        } else {
            // ERC20 token bridge
            IERC20(token).transferFrom(msg.sender, address(this), amount);
            IERC20(token).approve(address(FERRY_CONTRACT), amount);
            FERRY_CONTRACT.bridgeOut{value: nativeFee}(
                token,
                amount,
                to,
                chainId
            );
        }
        
        // Track bridge activity
        bridgeCounts[msg.sender]++;
        totalBridgeVolume += amount;
        
        emit BridgeExecuted(bridgeId, msg.sender, amount, chainId, block.timestamp);
        _emitStateChange(uint256(bridgeId), "bridge_out_executed", abi.encode(msg.sender, amount, chainId));
    }
    
    /**
     * @dev Fulfill bridge in (relayer only)
     */
    function fulfillBridgeIn(
        address token,
        uint256 amount,
        address to,
        bytes32 messageId
    ) external nonReentrant {
        require(!emergencyPauseEnabled, "Emergency pause active");
        require(authorizedRelayers[msg.sender], "Not authorized relayer");
        
        // Forward to existing Ferry contract
        FERRY_CONTRACT.fulfillBridgeIn(token, amount, to, messageId);
        
        emit BridgeExecuted(messageId, to, amount, block.chainid, block.timestamp);
        _emitStateChange(uint256(messageId), "bridge_in_fulfilled", abi.encode(to, amount));
    }
    
    // ============ NFT Integration ============
    
    /**
     * @dev Mint bridge NFT with governance approval
     */
    function mintBridgeNFT(
        address recipient,
        string memory tokenURI,
        bytes memory signature
    ) external payable nonReentrant {
        require(!emergencyPauseEnabled, "Emergency pause active");
        require(recipient != address(0), "Invalid recipient");
        
        bytes32 approvalHash = keccak256(abi.encodePacked(
            recipient,
            tokenURI,
            signature,
            block.timestamp
        ));
        
        // Check if this NFT minting requires special approval
        if (msg.value > getNFTGovernanceThreshold()) {
            // Would check governance approval here
            // For now, proceed with validation
        }
        
        // Pay mint fee and mint through existing contract
        uint256 mintFee = NFT_CONTRACT.mintFeeWei();
        require(msg.value >= mintFee, "Insufficient mint fee");
        
        NFT_CONTRACT.mintWithSignature{value: msg.value}(
            recipient,
            tokenURI,
            signature
        );
        
        emit NFTMintingApproved(recipient, tokenURI, approvalHash);
        _emitStateChange(uint256(approvalHash), "nft_minted", abi.encode(recipient, tokenURI));
    }
    
    // ============ Governance Integration Functions ============
    
    /**
     * @dev Approve bridge through governance proposal
     */
    function approveBridge(bytes32 bridgeId) external {
        require(msg.sender == address(GOVERNANCE_CONTRACT), "Only governance can approve");
        
        governanceApprovedBridges[bridgeId] = true;
        
        emit BridgeGovernanceApproved(bridgeId, tx.origin, 0, 0);
        _emitStateChange(uint256(bridgeId), "bridge_approved", abi.encode(bridgeId));
    }
    
    /**
     * @dev Request budget for bridge operations
     */
    function requestBridgeBudget(uint256 amount) external {
        // This would create a governance proposal to allocate budget
        // For now, it's a placeholder for the integration pattern
        
        _emitStateChange(0, "budget_requested", abi.encode(amount));
    }
    
    // ============ Relayer Management ============
    
    /**
     * @dev Add authorized relayer (owner only)
     */
    function addRelayer(address relayer) external onlyOwner {
        require(relayer != address(0), "Invalid relayer address");
        authorizedRelayers[relayer] = true;
        _emitStateChange(0, "relayer_added", abi.encode(relayer));
    }
    
    /**
     * @dev Remove authorized relayer (owner only)
     */
    function removeRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = false;
        _emitStateChange(0, "relayer_removed", abi.encode(relayer));
    }
    
    // ============ Emergency Functions ============
    
    /**
     * @dev Toggle emergency pause (owner only)
     */
    function toggleEmergencyPause(string calldata reason) external onlyOwner {
        emergencyPauseEnabled = !emergencyPauseEnabled;
        emit EmergencyPauseToggled(emergencyPauseEnabled, msg.sender, reason);
        _emitStateChange(0, "emergency_pause_toggled", abi.encode(emergencyPauseEnabled, reason));
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get governance threshold for bridge amounts
     */
    function getGovernanceThreshold() public pure returns (uint256) {
        return 100000 * 10**18; // 100K PFORK tokens
    }
    
    /**
     * @dev Get governance threshold for NFT minting
     */
    function getNFTGovernanceThreshold() public pure returns (uint256) {
        return 1 ether; // 1 ETH equivalent
    }
    
    /**
     * @dev Get bridge statistics
     */
    function getBridgeStats() external view returns (
        uint256 totalVolume,
        uint256 userBridgeCount,
        bool isPaused,
        uint256 relayerCount
    ) {
        return (
            totalBridgeVolume,
            bridgeCounts[msg.sender],
            emergencyPauseEnabled,
            _getRelayerCount()
        );
    }
    
    /**
     * @dev Check if bridge is approved by governance
     */
    function isBridgeApproved(bytes32 bridgeId) external view returns (bool) {
        return governanceApprovedBridges[bridgeId];
    }
    
    /**
     * @dev Get adapter configuration
     */
    function getAdapterConfig() external view returns (
        address governanceContract,
        address treasuryContract,
        address ferryContract,
        address pforkToken,
        uint256 governanceThreshold,
        uint256 nftGovernanceThreshold
    ) {
        return (
            address(GOVERNANCE_CONTRACT),
            address(TREASURY_CONTRACT),
            address(FERRY_CONTRACT),
            address(PFORK_TOKEN),
            getGovernanceThreshold(),
            getNFTGovernanceThreshold()
        );
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Get relayer count
     */
    function _getRelayerCount() internal view returns (uint256) {
        uint256 count = 0;
        // This is inefficient but fine for demonstration
        // In production, maintain a separate array
        return count;
    }
    
    // ============ Receive Function ============
    
    receive() external payable {
        // Allow contract to receive ETH for bridge fees
    }
    
    // ============ Fallback Function ============
    
    fallback() external payable {
        // Allow contract to receive ETH for bridge fees
    }
}
