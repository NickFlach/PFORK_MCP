// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PFORKToken
 * @dev The governance token for the Pitchforks ecosystem
 * @notice ERC20 token with additional governance features
 */
contract PFORKToken is ERC20, Ownable {
    
    // ============ State Variables ============
    
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100000000 * 10**18; // 100 million tokens
    
    mapping(address => bool) public isGovernanceContract;
    mapping(address => bool) public isExcludedFromFee;
    
    // ============ Events ============
    
    event GovernanceContractAdded(address indexed contractAddress);
    event GovernanceContractRemoved(address indexed contractAddress);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    
    // ============ Constructor ============
    
    constructor() ERC20("Pitchforks Token", "PFORK") {
        // Mint initial supply to deployer
        _mint(msg.sender, INITIAL_SUPPLY);
        emit TokensMinted(msg.sender, INITIAL_SUPPLY);
    }
    
    // ============ Minting Functions ============
    
    /**
     * @dev Mint new tokens (only owner)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Burn tokens
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
    
    /**
     * @dev Burn tokens from specific address (with allowance)
     */
    function burnFrom(address from, uint256 amount) external {
        uint256 currentAllowance = allowance(from, msg.sender);
        require(currentAllowance >= amount, "Burn amount exceeds allowance");
        
        _approve(from, msg.sender, currentAllowance - amount);
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }
    
    // ============ Governance Contract Management ============
    
    /**
     * @dev Add governance contract (only owner)
     */
    function addGovernanceContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Invalid contract address");
        require(!isGovernanceContract[contractAddress], "Already a governance contract");
        
        isGovernanceContract[contractAddress] = true;
        emit GovernanceContractAdded(contractAddress);
    }
    
    /**
     * @dev Remove governance contract (only owner)
     */
    function removeGovernanceContract(address contractAddress) external onlyOwner {
        require(isGovernanceContract[contractAddress], "Not a governance contract");
        
        isGovernanceContract[contractAddress] = false;
        emit GovernanceContractRemoved(contractAddress);
    }
    
    /**
     * @dev Add address to fee exclusion list (only owner)
     */
    function addExcludedFromFee(address account) external onlyOwner {
        isExcludedFromFee[account] = true;
    }
    
    /**
     * @dev Remove address from fee exclusion list (only owner)
     */
    function removeExcludedFromFee(address account) external onlyOwner {
        isExcludedFromFee[account] = false;
    }
    
    // ============ Override Functions ============
    
    /**
     * @dev Override transfer to add governance contract checks
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        _beforeTokenTransfer(msg.sender, to, amount);
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom to add governance contract checks
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        _beforeTokenTransfer(from, to, amount);
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev Hook before token transfer for additional validation
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal view {
        // Add any pre-transfer validation here
        // For example, blacklist functionality or transfer limits
        require(to != address(0), "Cannot transfer to zero address");
        
        // Check if this is a critical transfer that requires special handling
        if (amount > totalSupply() / 100) { // More than 1% of total supply
            // Could add additional validation for large transfers
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get remaining mintable tokens
     */
    function getRemainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
    
    /**
     * @dev Check if address is governance contract
     */
    function isGovernance(address contractAddress) external view returns (bool) {
        return isGovernanceContract[contractAddress];
    }
    
    /**
     * @dev Get token metadata
     */
    function getTokenInfo() external view returns (
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 maxSupply,
        uint256 remainingMintable,
        address owner
    ) {
        return (
            name(),
            symbol(),
            totalSupply(),
            MAX_SUPPLY,
            MAX_SUPPLY - totalSupply(),
            owner()
        );
    }
}
