// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./PitchforksCore.sol";

/**
 * @title PitchforksGovernance
 * @dev Ecosystem-wide governance system for Pitchforks protocol
 * @notice Manages voting, proposals, and quorum for all ecosystem projects
 */
contract PitchforksGovernance is PitchforksCore {
    
    // ============ Structs ============
    
    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool canceled;
        mapping(address => bool) hasVoted;
        address[] voters;
        Project targetProject; // Which project this proposal affects
        bytes32 actionHash; // Hash of the proposed action
    }
    
    struct Vote {
        address voter;
        uint8 support; // 0 = against, 1 = for, 2 = abstain
        uint256 weight;
        uint256 timestamp;
    }
    
    // ============ State Variables ============
    
    IERC20 public immutable PFORK_TOKEN;
    uint256 public immutable VOTING_PERIOD; // in seconds
    uint256 public immutable QUORUM_THRESHOLD; // percentage basis points (10000 = 100%)
    uint256 public immutable EXECUTION_DELAY; // delay before execution
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => Vote[]) public proposalVotes;
    uint256 public proposalCounter;
    
    // Governance parameters
    uint256 public minProposalThreshold; // Minimum tokens required to propose
    uint256 public maxProposalsPerAccount; // Prevent spam
    mapping(address => uint256) public userProposalCount;
    mapping(address => uint256) public lastProposalTime;
    
    // Treasury integration
    PitchforksTreasury public treasuryContract;
    
    // ============ Events ============
    
    event ProposalCreated(
        uint256 indexed proposalId,
        string title,
        address indexed proposer,
        Project targetProject,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint8 support,
        uint256 weight,
        uint256 timestamp
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed executor,
        uint256 timestamp
    );
    
    event ProposalCanceled(
        uint256 indexed proposalId,
        address indexed canceler,
        string reason
    );
    
    event QuorumReached(
        uint256 indexed proposalId,
        uint256 totalVotes,
        uint256 requiredVotes
    );
    
    // ============ Constructor ============
    
    constructor(
        address _pforkToken,
        uint256 _votingPeriod,
        uint256 _quorumThreshold,
        uint256 _executionDelay
    ) PitchforksCore(Project.PROTOCOL) {
        require(_pforkToken != address(0), "Invalid PFORK token address");
        require(_votingPeriod > 0, "Voting period must be > 0");
        require(_quorumThreshold <= 10000, "Quorum threshold must be <= 100%");
        require(_executionDelay > 0, "Execution delay must be > 0");
        
        PFORK_TOKEN = IERC20(_pforkToken);
        VOTING_PERIOD = _votingPeriod;
        QUORUM_THRESHOLD = _quorumThreshold;
        EXECUTION_DELAY = _executionDelay;
        
        // Default governance parameters
        minProposalThreshold = 1000 * 10**18; // 1000 PFORK tokens
        maxProposalsPerAccount = 5;
    }
    
    // ============ Proposal Functions ============
    
    /**
     * @dev Create a new governance proposal
     */
    function createProposal(
        string memory _title,
        string memory _description,
        Project _targetProject,
        bytes memory _actionData
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(uint256(_targetProject) <= uint256(Project.APP), "Invalid project");
        
        // Check proposal thresholds
        uint256 userBalance = PFORK_TOKEN.balanceOf(msg.sender);
        require(userBalance >= minProposalThreshold, "Insufficient tokens to propose");
        require(userProposalCount[msg.sender] < maxProposalsPerAccount, "Too many proposals");
        require(block.timestamp >= lastProposalTime[msg.sender] + 1 days, "Proposal cooldown");
        
        uint256 proposalId = proposalCounter++;
        Proposal storage proposal = proposals[proposalId];
        
        proposal.id = proposalId;
        proposal.title = _title;
        proposal.description = _description;
        proposal.proposer = msg.sender;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + VOTING_PERIOD;
        proposal.targetProject = _targetProject;
        proposal.actionHash = keccak256(_actionData);
        
        // Update user proposal tracking
        userProposalCount[msg.sender]++;
        lastProposalTime[msg.sender] = block.timestamp;
        
        emit ProposalCreated(
            proposalId,
            _title,
            msg.sender,
            _targetProject,
            proposal.startTime,
            proposal.endTime
        );
        
        _emitStateChange(proposalId, "proposal_created", _actionData);
        
        return proposalId;
    }
    
    /**
     * @dev Cast a vote on a proposal
     */
    function vote(
        uint256 _proposalId,
        uint8 _support
    ) external {
        require(_support <= 2, "Invalid support value");
        
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.canceled, "Proposal canceled");
        require(!proposal.executed, "Proposal already executed");
        
        uint256 voterWeight = PFORK_TOKEN.balanceOf(msg.sender);
        require(voterWeight > 0, "No voting power");
        
        // Record vote
        proposal.hasVoted[msg.sender] = true;
        proposal.voters.push(msg.sender);
        
        if (_support == 1) {
            proposal.forVotes += voterWeight;
        } else if (_support == 0) {
            proposal.againstVotes += voterWeight;
        } else {
            proposal.abstainVotes += voterWeight;
        }
        
        // Store vote details
        proposalVotes[_proposalId].push(Vote({
            voter: msg.sender,
            support: _support,
            weight: voterWeight,
            timestamp: block.timestamp
        }));
        
        emit VoteCast(_proposalId, msg.sender, _support, voterWeight, block.timestamp);
        
        // Check if quorum is reached
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 totalSupply = PFORK_TOKEN.totalSupply();
        uint256 requiredVotes = (totalSupply * QUORUM_THRESHOLD) / 10000;
        
        if (totalVotes >= requiredVotes) {
            emit QuorumReached(_proposalId, totalVotes, requiredVotes);
        }
    }
    
    /**
     * @dev Execute a successful proposal
     */
    function executeProposal(uint256 _proposalId) external onlyWhenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        
        require(block.timestamp > proposal.endTime + EXECUTION_DELAY, "Execution delay not met");
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Proposal canceled");
        
        // Check if proposal passed (simple majority for now)
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        require(totalVotes > 0, "No votes cast");
        require(proposal.forVotes > proposal.againstVotes, "Proposal did not pass");
        
        // Check quorum
        uint256 totalSupply = PFORK_TOKEN.totalSupply();
        uint256 requiredVotes = (totalSupply * QUORUM_THRESHOLD) / 10000;
        uint256 actualVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        require(actualVotes >= requiredVotes, "Quorum not reached");
        
        proposal.executed = true;
        
        emit ProposalExecuted(_proposalId, msg.sender, block.timestamp);
        emit GovernanceAction(_proposalId, msg.sender, proposal.actionHash, block.timestamp);
        
        _emitStateChange(_proposalId, "proposal_executed", abi.encode(_proposalId));
    }
    
    /**
     * @dev Cancel a proposal (proposer only or emergency)
     */
    function cancelProposal(uint256 _proposalId, string calldata _reason) external {
        Proposal storage proposal = proposals[_proposalId];
        
        require(msg.sender == proposal.proposer || msg.sender == owner(), "Not authorized");
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Already canceled");
        
        proposal.canceled = true;
        
        emit ProposalCanceled(_proposalId, msg.sender, _reason);
        _emitStateChange(_proposalId, "proposal_canceled", abi.encode(_reason));
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 _proposalId) external view returns (
        uint256 id,
        string memory title,
        string memory description,
        address proposer,
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        bool executed,
        bool canceled,
        Project targetProject,
        uint256 voterCount
    ) {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.title,
            proposal.description,
            proposal.proposer,
            proposal.startTime,
            proposal.endTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.executed,
            proposal.canceled,
            proposal.targetProject,
            proposal.voters.length
        );
    }
    
    /**
     * @dev Check if proposal has passed
     */
    function hasProposalPassed(uint256 _proposalId) external view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];
        
        if (proposal.executed || proposal.canceled) return false;
        if (block.timestamp <= proposal.endTime) return false;
        
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        if (totalVotes == 0) return false;
        
        // Check majority
        if (proposal.forVotes <= proposal.againstVotes) return false;
        
        // Check quorum
        uint256 totalSupply = PFORK_TOKEN.totalSupply();
        uint256 requiredVotes = (totalSupply * QUORUM_THRESHOLD) / 10000;
        uint256 actualVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        
        return actualVotes >= requiredVotes;
    }
    
    /**
     * @dev Get voting power for an address
     */
    function getVotingPower(address _voter) external view returns (uint256) {
        return PFORK_TOKEN.balanceOf(_voter);
    }
    
    /**
     * @dev Check if address can vote on proposal
     */
    function canVote(uint256 _proposalId, address _voter) external view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];
        
        return (
            block.timestamp >= proposal.startTime &&
            block.timestamp <= proposal.endTime &&
            !proposal.hasVoted[_voter] &&
            !proposal.canceled &&
            !proposal.executed &&
            PFORK_TOKEN.balanceOf(_voter) > 0
        );
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Update governance parameters (only owner)
     */
    function updateGovernanceParams(
        uint256 _minProposalThreshold,
        uint256 _maxProposalsPerAccount
    ) external onlyOwner {
        minProposalThreshold = _minProposalThreshold;
        maxProposalsPerAccount = _maxProposalsPerAccount;
        
        _emitStateChange(0, "governance_params_updated", abi.encode(_minProposalThreshold, _maxProposalsPerAccount));
    }
    
    /**
     * @dev Set treasury contract address (only owner)
     */
    function setTreasury(address _treasuryContract) external onlyOwner {
        require(_treasuryContract != address(0), "Invalid treasury address");
        treasuryContract = PitchforksTreasury(_treasuryContract);
        
        _emitStateChange(0, "treasury_set", abi.encode(_treasuryContract));
    }
}
