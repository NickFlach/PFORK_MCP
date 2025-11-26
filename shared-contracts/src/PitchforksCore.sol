// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title PitchforksCore
 * @dev Base contract for all Pitchforks ecosystem contracts
 * @notice Provides shared access control, events, and utilities
 */
abstract contract PitchforksCore is Ownable, ReentrancyGuard, Pausable {
    
    // ============ Constants ============
    uint256 public constant VERSION = 1;
    bytes32 public constant DOMAIN_SEPARATOR = keccak256("Pitchforks Ecosystem");
    
    // ============ Project Identifiers ============
    enum Project {
        PROTOCOL,
        DEX,
        FERRY,
        ANALYST,
        APP
    }
    
    Project public immutable PROJECT_ID;
    
    // ============ Events (Standardized Across Ecosystem) ============
    event StateChanged(
        uint256 indexed entityId,
        bytes32 indexed stateHash,
        string action,
        address indexed operator,
        uint256 timestamp
    );
    
    event GovernanceAction(
        uint256 indexed proposalId,
        address indexed executor,
        bytes32 indexed actionHash,
        uint256 timestamp
    );
    
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 indexed transferId
    );
    
    event EmergencyAction(
        address indexed executor,
        string reason,
        bytes32 indexed actionHash,
        uint256 timestamp
    );
    
    // ============ Modifiers ============
    
    modifier onlyWhenNotPaused() {
        require(!paused(), "Contract is paused");
        _;
    }
    
    modifier validProject() {
        require(uint256(PROJECT_ID) <= uint256(Project.APP), "Invalid project ID");
        _;
    }
    
    modifier onlyAuthorizedOperator(address operator) {
        require(
            operator == owner() || _isAuthorizedOperator(operator),
            "Unauthorized operator"
        );
        _;
    }
    
    // ============ Constructor ============
    
    constructor(Project _projectId) {
        PROJECT_ID = _projectId;
    }
    
    // ============ Storage for Authorized Operators ============
    
    mapping(address => bool) private _authorizedOperators;
    address[] private _operatorList;
    
    // ============ Access Control Functions ============
    
    /**
     * @dev Add authorized operator (only owner)
     */
    function addAuthorizedOperator(address operator) external onlyOwner {
        require(operator != address(0), "Invalid operator address");
        require(!_authorizedOperators[operator], "Operator already authorized");
        
        _authorizedOperators[operator] = true;
        _operatorList.push(operator);
        
        emit StateChanged(
            uint256(PROJECT_ID),
            keccak256(abi.encodePacked(operator, "authorized")),
            "operator_added",
            msg.sender,
            block.timestamp
        );
    }
    
    /**
     * @dev Remove authorized operator (only owner)
     */
    function removeAuthorizedOperator(address operator) external onlyOwner {
        require(_authorizedOperators[operator], "Operator not authorized");
        
        _authorizedOperators[operator] = false;
        
        // Remove from array (gas intensive but necessary)
        for (uint256 i = 0; i < _operatorList.length; i++) {
            if (_operatorList[i] == operator) {
                _operatorList[i] = _operatorList[_operatorList.length - 1];
                _operatorList.pop();
                break;
            }
        }
        
        emit StateChanged(
            uint256(PROJECT_ID),
            keccak256(abi.encodePacked(operator, "unauthorized")),
            "operator_removed",
            msg.sender,
            block.timestamp
        );
    }
    
    /**
     * @dev Check if address is authorized operator
     */
    function _isAuthorizedOperator(address operator) internal view returns (bool) {
        return _authorizedOperators[operator];
    }
    
    /**
     * @dev Get all authorized operators
     */
    function getAuthorizedOperators() external view returns (address[] memory) {
        return _operatorList;
    }
    
    // ============ Utility Functions ============
    
    /**
     * @dev Generate standardized entity ID
     */
    function _generateEntityId(
        address creator,
        uint256 nonce
    ) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            address(this),
            PROJECT_ID,
            creator,
            nonce,
            block.timestamp
        )));
    }
    
    /**
     * @dev Generate action hash for event consistency
     */
    function _generateActionHash(
        string memory action,
        bytes memory data
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            PROJECT_ID,
            action,
            data,
            block.timestamp
        ));
    }
    
    /**
     * @dev Emit standardized state change event
     */
    function _emitStateChange(
        uint256 entityId,
        string memory action,
        bytes memory data
    ) internal {
        emit StateChanged(
            entityId,
            _generateActionHash(action, data),
            action,
            msg.sender,
            block.timestamp
        );
    }
    
    /**
     * @dev Emergency pause function
     */
    function emergencyPause(string calldata reason) external onlyOwner {
        _pause();
        emit EmergencyAction(msg.sender, reason, bytes32("emergency_pause"), block.timestamp);
    }
    
    /**
     * @dev Emergency unpause function
     */
    function emergencyUnpause(string calldata reason) external onlyOwner {
        _unpause();
        emit EmergencyAction(msg.sender, reason, bytes32("emergency_unpause"), block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get project name as string
     */
    function getProjectName() external view returns (string memory) {
        require(uint256(PROJECT_ID) <= uint256(Project.APP), "Invalid project ID");
        
        string[5] memory names = [
            "PROTOCOL",
            "DEX", 
            "FERRY",
            "ANALYST",
            "APP"
        ];
        
        return names[uint256(PROJECT_ID)];
    }
    
    /**
     * @dev Get contract metadata for API integration
     */
    function getContractMetadata() external view returns (
        uint256 version,
        Project projectId,
        string memory projectName,
        address contractOwner,
        bool isPaused,
        uint256 operatorCount
    ) {
        return (
            VERSION,
            PROJECT_ID,
            this.getProjectName(),
            owner(),
            paused(),
            _operatorList.length
        );
    }
}
