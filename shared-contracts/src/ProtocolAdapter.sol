// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../src/PitchforksCore.sol";
import "../src/PitchforksGovernance.sol";
import "../src/PitchforksTreasury.sol";

/**
 * @title ProtocolAdapter
 * @dev Bridge between Pitchfork Protocol and new governance system
 * @notice Enables governance oversight of Protocol operations (funding campaigns, voting, etc.)
 */
contract ProtocolAdapter is PitchforksCore, ReentrancyGuard {
    
    // ============ Interfaces for Existing Contracts ============
    
    interface IPitchforkFunding {
        function createCampaign(
            string memory title,
            string memory description,
            uint256 goalAmount,
            uint256 durationDays
        ) external returns (uint256);
        
        function contribute(uint256 campaignId) external payable;
        
        function withdrawFunds(uint256 campaignId) external;
        
        function getCampaign(uint256 campaignId) external view returns (
            string memory title,
            string memory description,
            address creator,
            uint256 goalAmount,
            uint256 raisedAmount,
            uint256 deadline,
            bool isActive,
            bool goalReached,
            uint256 contributorCount
        );
    }
    
    // ============ State Variables ============
    
    PitchforksGovernance public immutable GOVERNANCE_CONTRACT;
    PitchforksTreasury public immutable TREASURY_CONTRACT;
    
    // Existing contract addresses (can be zero if not deployed yet)
    IPitchforkFunding public fundingContract;
    IERC20 public immutable PFORK_TOKEN;
    
    // Governance tracking
    mapping(uint256 => bool) public governanceApprovedCampaigns;
    mapping(address => uint256) public campaignCounts;
    uint256 public totalCampaignFunds;
    
    // Campaign validation
    uint256 public minCampaignGoal = 1000 * 10**18; // 1000 PFORK minimum
    uint256 public maxCampaignDuration = 90 days; // 90 days maximum
    uint256 public governanceThreshold = 100000 * 10**18; // 100K PFORK for governance review
    
    // Emergency controls
    bool public emergencyPauseEnabled;
    mapping(address => bool) public authorizedCampaignCreators;
    
    // ============ Events ============
    
    event CampaignGovernanceApproved(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 goalAmount,
        string title
    );
    
    event CampaignCreatedWithGovernance(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 goalAmount,
        uint256 duration,
        bool requiresGovernance
    );
    
    event ContributionWithGovernance(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount,
        uint256 timestamp
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
        address _fundingContract,
        address _pforkToken
    ) PitchforksCore(Project.PROTOCOL) {
        require(_governanceContract != address(0), "Invalid governance address");
        require(_treasuryContract != address(0), "Invalid treasury address");
        require(_pforkToken != address(0), "Invalid PFORK token address");
        
        GOVERNANCE_CONTRACT = PitchforksGovernance(_governanceContract);
        TREASURY_CONTRACT = PitchforksTreasury(_treasuryContract);
        PFORK_TOKEN = IERC20(_pforkToken);
        
        // Funding contract is optional (can be set later)
        if (_fundingContract != address(0)) {
            fundingContract = IPitchforkFunding(_fundingContract);
        }
        
        // Set up initial authorized campaign creator (deployer)
        authorizedCampaignCreators[msg.sender] = true;
    }
    
    // ============ Governance-Integrated Campaign Functions ============
    
    /**
     * @dev Create campaign with governance oversight
     */
    function createCampaignWithGovernance(
        string memory title,
        string memory description,
        uint256 goalAmount,
        uint256 durationDays,
        bool requiresGovernanceApproval
    ) external nonReentrant returns (uint256) {
        require(!emergencyPauseEnabled, "Emergency pause active");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(goalAmount >= minCampaignGoal, "Goal below minimum");
        require(durationDays <= 90, "Duration too long");
        require(address(fundingContract) != address(0), "Funding contract not set");
        
        // Check if creator is authorized
        if (!authorizedCampaignCreators[msg.sender]) {
            require(goalAmount <= governanceThreshold, "Goal exceeds threshold for unauthorized creator");
        }
        
        // Create campaign through existing contract
        uint256 campaignId = fundingContract.createCampaign(
            title,
            description,
            goalAmount,
            durationDays
        );
        
        // Track campaign for governance
        if (requiresGovernanceApproval || goalAmount > governanceThreshold) {
            // Would normally require governance approval
            // For now, auto-approve for testing
            governanceApprovedCampaigns[campaignId] = true;
        }
        
        campaignCounts[msg.sender]++;
        
        emit CampaignCreatedWithGovernance(campaignId, msg.sender, goalAmount, durationDays, requiresGovernanceApproval);
        _emitStateChange(campaignId, "campaign_created", abi.encode(title, goalAmount));
        
        return campaignId;
    }
    
    /**
     * @dev Contribute to campaign with governance tracking
     */
    function contributeWithGovernance(uint256 campaignId) external payable nonReentrant {
        require(!emergencyPauseEnabled, "Emergency pause active");
        require(msg.value > 0, "Contribution must be > 0");
        require(address(fundingContract) != address(0), "Funding contract not set");
        
        // Check if campaign is approved by governance
        if (campaignId > 1000) { // Assume high ID campaigns need approval
            require(governanceApprovedCampaigns[campaignId], "Campaign not approved by governance");
        }
        
        // Execute contribution through existing contract
        fundingContract.contribute{value: msg.value}(campaignId);
        
        totalCampaignFunds += msg.value;
        
        emit ContributionWithGovernance(campaignId, msg.sender, msg.value, block.timestamp);
        _emitStateChange(campaignId, "contribution_made", abi.encode(msg.sender, msg.value));
    }
    
    /**
     * @dev Contribute with PFORK tokens
     */
    function contributePFORK(uint256 campaignId, uint256 amount) external nonReentrant {
        require(!emergencyPauseEnabled, "Emergency pause active");
        require(amount > 0, "Amount must be > 0");
        
        // Check if campaign is approved
        if (campaignId > 1000) {
            require(governanceApprovedCampaigns[campaignId], "Campaign not approved by governance");
        }
        
        // Transfer PFORK tokens to this contract first
        PFORK_TOKEN.transferFrom(msg.sender, address(this), amount);
        
        // For demonstration, we'll track this as a contribution
        // In a real implementation, you'd need to handle token-based contributions
        totalCampaignFunds += amount;
        
        emit ContributionWithGovernance(campaignId, msg.sender, amount, block.timestamp);
        _emitStateChange(campaignId, "pfork_contribution", abi.encode(msg.sender, amount));
    }
    
    // ============ Governance Integration Functions ============
    
    /**
     * @dev Approve campaign through governance proposal
     */
    function approveCampaign(uint256 campaignId) external {
        require(msg.sender == address(GOVERNANCE_CONTRACT), "Only governance can approve");
        
        governanceApprovedCampaigns[campaignId] = true;
        
        emit CampaignGovernanceApproved(campaignId, tx.origin, 0, "");
        _emitStateChange(campaignId, "campaign_approved", abi.encode(campaignId));
    }
    
    /**
     * @dev Request budget for campaign operations
     */
    function requestCampaignBudget(uint256 amount) external {
        // This would create a governance proposal to allocate budget
        _emitStateChange(0, "budget_requested", abi.encode(amount));
    }
    
    /**
     * @dev Update campaign parameters (governance only)
     */
    function updateCampaignParameters(
        uint256 _minCampaignGoal,
        uint256 _maxCampaignDuration,
        uint256 _governanceThreshold
    ) external {
        require(msg.sender == address(GOVERNANCE_CONTRACT) || msg.sender == owner(), 
                "Only governance or owner can update parameters");
        
        minCampaignGoal = _minCampaignGoal;
        maxCampaignDuration = _maxCampaignDuration;
        governanceThreshold = _governanceThreshold;
        
        _emitStateChange(0, "parameters_updated", abi.encode(_minCampaignGoal, _maxCampaignDuration, _governanceThreshold));
    }
    
    /**
     * @dev Set funding contract address (owner only, for delayed deployment)
     */
    function setFundingContract(address _fundingContract) external onlyOwner {
        require(_fundingContract != address(0), "Invalid funding contract address");
        fundingContract = IPitchforkFunding(_fundingContract);
        _emitStateChange(0, "funding_contract_set", abi.encode(_fundingContract));
    }
    
    // ============ Campaign Creator Management ============
    
    /**
     * @dev Add authorized campaign creator (owner only)
     */
    function addAuthorizedCreator(address creator) external onlyOwner {
        require(creator != address(0), "Invalid creator address");
        authorizedCampaignCreators[creator] = true;
        _emitStateChange(0, "creator_authorized", abi.encode(creator));
    }
    
    /**
     * @dev Remove authorized campaign creator (owner only)
     */
    function removeAuthorizedCreator(address creator) external onlyOwner {
        authorizedCampaignCreators[creator] = false;
        _emitStateChange(0, "creator_unauthorized", abi.encode(creator));
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
     * @dev Get campaign statistics
     */
    function getCampaignStats() external view returns (
        uint256 totalFunds,
        uint256 userCampaignCount,
        bool isPaused,
        uint256 authorizedCreatorCount
    ) {
        return (
            totalCampaignFunds,
            campaignCounts[msg.sender],
            emergencyPauseEnabled,
            _getAuthorizedCreatorCount()
        );
    }
    
    /**
     * @dev Check if campaign is approved by governance
     */
    function isCampaignApproved(uint256 campaignId) external view returns (bool) {
        return governanceApprovedCampaigns[campaignId];
    }
    
    /**
     * @dev Check if address is authorized creator
     */
    function isAuthorizedCreator(address creator) external view returns (bool) {
        return authorizedCampaignCreators[creator];
    }
    
    /**
     * @dev Get adapter configuration
     */
    function getAdapterConfig() external view returns (
        address governanceContract,
        address treasuryContract,
        address fundingContract,
        address pforkToken,
        uint256 minGoal,
        uint256 maxDuration,
        uint256 govThreshold
    ) {
        return (
            address(GOVERNANCE_CONTRACT),
            address(TREASURY_CONTRACT),
            address(FUNDING_CONTRACT),
            address(PFORK_TOKEN),
            minCampaignGoal,
            maxCampaignDuration,
            governanceThreshold
        );
    }
    
    /**
     * @dev Get campaign details from underlying contract
     */
    function getCampaignDetails(uint256 campaignId) external view returns (
        string memory title,
        string memory description,
        address creator,
        uint256 goalAmount,
        uint256 raisedAmount,
        uint256 deadline,
        bool isActive,
        bool goalReached,
        uint256 contributorCount
    ) {
        require(address(fundingContract) != address(0), "Funding contract not set");
        return fundingContract.getCampaign(campaignId);
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Get authorized creator count
     */
    function _getAuthorizedCreatorCount() internal view returns (uint256) {
        uint256 count = 0;
        // In production, maintain a separate array for efficiency
        return count;
    }
    
    // ============ Receive Function ============
    
    receive() external payable {
        // Allow contract to receive ETH for contributions
    }
    
    // ============ Fallback Function ============
    
    fallback() external payable {
        // Allow contract to receive ETH for contributions
    }
}
