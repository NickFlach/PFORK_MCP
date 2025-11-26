// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../src/PitchforksCore.sol";
import "../src/PitchforksGovernance.sol";
import "../src/PitchforksTreasury.sol";

/**
 * @title DexAdapter
 * @dev Bridge between PitchforksDEX and new governance system
 * @notice Enables governance oversight of DEX operations (liquidity pools, trading, etc.)
 */
contract DexAdapter is PitchforksCore, ReentrancyGuard {
    
    // ============ Interfaces for Existing Contracts ============
    
    interface ILiquidityPool {
        function addLiquidity(
            address tokenA,
            address tokenB,
            uint256 amountA,
            uint256 amountB,
            uint256 minAmountA,
            uint256 minAmountB
        ) external returns (uint256 liquidity);
        
        function removeLiquidity(
            address tokenA,
            address tokenB,
            uint256 liquidity,
            uint256 minAmountA,
            uint256 minAmountB
        ) external returns (uint256 amountA, uint256 amountB);
        
        function swap(
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 minAmountOut
        ) external returns (uint256 amountOut);
        
        function getReserves(address tokenA, address tokenB) 
            external view returns (uint256 reserveA, uint256 reserveB);
    }
    
    interface IProtectedRouter {
        function swapExactTokensForTokensProtected(
            uint256 amountIn,
            uint256 amountOutMin,
            address[] calldata path,
            address to,
            uint256 deadline
        ) external returns (uint256[] memory amounts);
        
        function commitSwap(
            bytes32 commitment,
            uint256 expiresAt
        ) external;
        
        function revealSwap(
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            address to,
            uint256 deadline,
            bytes32 salt
        ) external returns (uint256[] memory amounts);
    }
    
    // ============ Structs ============
    
    struct LiquidityPoolInfo {
        address tokenA;
        address tokenB;
        uint256 totalLiquidity;
        uint256 apr;
        bool isActive;
        uint256 lastUpdate;
    }
    
    struct TradingPair {
        address tokenA;
        address tokenB;
        uint256 volume24h;
        uint256 price;
        bool isActive;
    }
    
    // ============ State Variables ============
    
    PitchforksGovernance public immutable GOVERNANCE_CONTRACT;
    PitchforksTreasury public immutable TREASURY_CONTRACT;
    
    // Existing contract addresses
    ILiquidityPool public immutable LIQUIDITY_POOL;
    IProtectedRouter public immutable PROTECTED_ROUTER;
    IERC20 public immutable PFORK_TOKEN;
    
    // Governance tracking
    mapping(address => bool) public governanceApprovedPairs;
    mapping(address => uint256) public tradingVolumes;
    mapping(address => LiquidityPoolInfo) public poolInfo;
    
    // DEX parameters
    uint256 public minLiquidityAmount = 100 * 10**18; // 100 tokens minimum
    uint256 public maxSlippage = 500; // 5% max slippage (500 basis points)
    uint256 public governanceThreshold = 50000 * 10**18; // 50K PFORK for governance review
    
    // Emergency controls
    bool public emergencyPauseEnabled;
    mapping(address => bool) public authorizedLiquidityProviders;
    
    // Supported tokens
    address[] public supportedTokens;
    mapping(address => bool) public isTokenSupported;
    
    // ============ Events ============
    
    event LiquidityAddedWithGovernance(
        address indexed provider,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    
    event SwapWithGovernance(
        address indexed trader,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    event PairGovernanceApproved(
        address indexed tokenA,
        address indexed tokenB,
        address indexed approver
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
        address _liquidityPool,
        address _protectedRouter,
        address _pforkToken
    ) PitchforksCore(Project.DEX) {
        require(_governanceContract != address(0), "Invalid governance address");
        require(_treasuryContract != address(0), "Invalid treasury address");
        require(_liquidityPool != address(0), "Invalid liquidity pool address");
        require(_protectedRouter != address(0), "Invalid protected router address");
        require(_pforkToken != address(0), "Invalid PFORK token address");
        
        GOVERNANCE_CONTRACT = PitchforksGovernance(_governanceContract);
        TREASURY_CONTRACT = PitchforksTreasury(_treasuryContract);
        LIQUIDITY_POOL = ILiquidityPool(_liquidityPool);
        PROTECTED_ROUTER = IProtectedRouter(_protectedRouter);
        PFORK_TOKEN = IERC20(_pforkToken);
        
        // Set up initial authorized liquidity provider (deployer)
        authorizedLiquidityProviders[msg.sender] = true;
        
        // Add PFORK token as supported
        _addSupportedToken(_pforkToken);
    }
    
    // ============ Governance-Integrated DEX Functions ============
    
    /**
     * @dev Add liquidity with governance oversight
     */
    function addLiquidityWithGovernance(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 minAmountA,
        uint256 minAmountB
    ) external nonReentrant returns (uint256) {
        require(!emergencyPauseEnabled, "Emergency pause active");
        require(isTokenSupported[tokenA] && isTokenSupported[tokenB], "Tokens not supported");
        require(amountA >= minLiquidityAmount && amountB >= minLiquidityAmount, "Amount below minimum");
        
        // Check if provider is authorized or amount is below threshold
        if (!authorizedLiquidityProviders[msg.sender]) {
            require(amountA <= governanceThreshold && amountB <= governanceThreshold, 
                    "Amount exceeds threshold for unauthorized provider");
        }
        
        // Transfer tokens to this contract
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
        
        // Approve tokens for liquidity pool
        IERC20(tokenA).approve(address(LIQUIDITY_POOL), amountA);
        IERC20(tokenB).approve(address(LIQUIDITY_POOL), amountB);
        
        // Add liquidity through existing contract
        uint256 liquidity = LIQUIDITY_POOL.addLiquidity(
            tokenA,
            tokenB,
            amountA,
            amountB,
            minAmountA,
            minAmountB
        );
        
        // Update pool info
        _updatePoolInfo(tokenA, tokenB);
        
        emit LiquidityAddedWithGovernance(msg.sender, tokenA, tokenB, amountA, amountB, liquidity);
        _emitStateChange(uint256(liquidity), "liquidity_added", abi.encode(tokenA, tokenB, amountA, amountB));
        
        return liquidity;
    }
    
    /**
     * @dev Protected swap with governance tracking
     */
    function swapWithGovernance(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant returns (uint256[] memory amounts) {
        require(!emergencyPauseEnabled, "Emergency pause active");
        require(isTokenSupported[tokenIn] && isTokenSupported[tokenOut], "Tokens not supported");
        require(amountIn > 0, "Amount must be > 0");
        require(deadline > block.timestamp, "Deadline expired");
        
        // Check if trading pair is approved
        address pairKey = _getPairKey(tokenIn, tokenOut);
        if (amountIn > governanceThreshold) {
            require(governanceApprovedPairs[pairKey], "Trading pair not approved by governance");
        }
        
        // Transfer input tokens to this contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve tokens for router
        IERC20(tokenIn).approve(address(PROTECTED_ROUTER), amountIn);
        
        // Create path for swap
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        // Execute swap through protected router
        amounts = PROTECTED_ROUTER.swapExactTokensForTokensProtected(
            amountIn,
            amountOutMin,
            path,
            msg.sender,
            deadline
        );
        
        // Track trading volume
        tradingVolumes[pairKey] += amountIn;
        
        emit SwapWithGovernance(msg.sender, tokenIn, tokenOut, amountIn, amounts[amounts.length - 1]);
        _emitStateChange(uint256(amountIn), "swap_executed", abi.encode(tokenIn, tokenOut, amountIn));
        
        return amounts;
    }
    
    /**
     * @dev Commit-reveal swap for enhanced MEV protection
     */
    function commitRevealSwap(
        bytes32 commitment,
        uint256 expiresAt,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline,
        bytes32 salt
    ) external nonReentrant returns (uint256[] memory amounts) {
        require(!emergencyPauseEnabled, "Emergency pause active");
        require(isTokenSupported[tokenIn] && isTokenSupported[tokenOut], "Tokens not supported");
        
        // Step 1: Commit
        PROTECTED_ROUTER.commitSwap(commitment, expiresAt);
        
        // Step 2: Reveal (after delay)
        require(block.timestamp >= expiresAt, "Too early to reveal");
        
        // Transfer and approve tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(PROTECTED_ROUTER), amountIn);
        
        // Execute reveal swap
        amounts = PROTECTED_ROUTER.revealSwap(
            tokenIn,
            tokenOut,
            amountIn,
            amountOutMin,
            msg.sender,
            deadline,
            salt
        );
        
        emit SwapWithGovernance(msg.sender, tokenIn, tokenOut, amountIn, amounts[amounts.length - 1]);
        _emitStateChange(uint256(amountIn), "commit_reveal_swap", abi.encode(tokenIn, tokenOut, amountIn));
        
        return amounts;
    }
    
    // ============ Governance Integration Functions ============
    
    /**
     * @dev Approve trading pair through governance proposal
     */
    function approveTradingPair(address tokenA, address tokenB) external {
        require(msg.sender == address(GOVERNANCE_CONTRACT), "Only governance can approve");
        
        address pairKey = _getPairKey(tokenA, tokenB);
        governanceApprovedPairs[pairKey] = true;
        
        emit PairGovernanceApproved(tokenA, tokenB, msg.sender);
        _emitStateChange(uint256(pairKey), "pair_approved", abi.encode(tokenA, tokenB));
    }
    
    /**
     * @dev Add supported token (governance only)
     */
    function addSupportedToken(address token) external {
        require(msg.sender == address(GOVERNANCE_CONTRACT) || msg.sender == owner(), 
                "Only governance or owner can add token");
        _addSupportedToken(token);
    }
    
    /**
     * @dev Update DEX parameters (governance only)
     */
    function updateDexParameters(
        uint256 _minLiquidityAmount,
        uint256 _maxSlippage,
        uint256 _governanceThreshold
    ) external {
        require(msg.sender == address(GOVERNANCE_CONTRACT) || msg.sender == owner(), 
                "Only governance or owner can update parameters");
        
        minLiquidityAmount = _minLiquidityAmount;
        maxSlippage = _maxSlippage;
        governanceThreshold = _governanceThreshold;
        
        _emitStateChange(0, "dex_parameters_updated", abi.encode(_minLiquidityAmount, _maxSlippage, _governanceThreshold));
    }
    
    // ============ Token Management ============
    
    /**
     * @dev Add supported token internally
     */
    function _addSupportedToken(address token) internal {
        if (!isTokenSupported[token]) {
            isTokenSupported[token] = true;
            supportedTokens.push(token);
            _emitStateChange(0, "token_supported", abi.encode(token));
        }
    }
    
    /**
     * @dev Get pair key for mapping
     */
    function _getPairKey(address tokenA, address tokenB) internal pure returns (address) {
        return address(uint160(tokenA) ^ uint160(tokenB));
    }
    
    /**
     * @dev Update pool information
     */
    function _updatePoolInfo(address tokenA, address tokenB) internal {
        LiquidityPoolInfo storage info = poolInfo[_getPairKey(tokenA, tokenB)];
        info.tokenA = tokenA;
        info.tokenB = tokenB;
        info.lastUpdate = block.timestamp;
        info.isActive = true;
        
        // Get reserves from underlying pool
        (uint256 reserveA, uint256 reserveB) = LIQUIDITY_POOL.getReserves(tokenA, tokenB);
        info.totalLiquidity = reserveA + reserveB;
        
        // Calculate APR (simplified)
        info.apr = _calculateAPR(tokenA, tokenB);
    }
    
    /**
     * @dev Calculate APR for pool (simplified calculation)
     */
    function _calculateAPR(address tokenA, address tokenB) internal pure returns (uint256) {
        // This would be a complex calculation based on fees and volume
        // For now, return a placeholder value
        return 500; // 5% APR
    }
    
    // ============ Liquidity Provider Management ============
    
    /**
     * @dev Add authorized liquidity provider (owner only)
     */
    function addAuthorizedProvider(address provider) external onlyOwner {
        require(provider != address(0), "Invalid provider address");
        authorizedLiquidityProviders[provider] = true;
        _emitStateChange(0, "provider_authorized", abi.encode(provider));
    }
    
    /**
     * @dev Remove authorized liquidity provider (owner only)
     */
    function removeAuthorizedProvider(address provider) external onlyOwner {
        authorizedLiquidityProviders[provider] = false;
        _emitStateChange(0, "provider_unauthorized", abi.encode(provider));
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
     * @dev Get DEX statistics
     */
    function getDexStats() external view returns (
        uint256 totalVolume,
        uint256 supportedTokenCount,
        bool isPaused,
        uint256 authorizedProviderCount
    ) {
        return (
            _getTotalVolume(),
            supportedTokens.length,
            emergencyPauseEnabled,
            _getAuthorizedProviderCount()
        );
    }
    
    /**
     * @dev Check if trading pair is approved
     */
    function isPairApproved(address tokenA, address tokenB) external view returns (bool) {
        return governanceApprovedPairs[_getPairKey(tokenA, tokenB)];
    }
    
    /**
     * @dev Get pool information
     */
    function getPoolInfo(address tokenA, address tokenB) external view returns (
        address tokenA_,
        address tokenB_,
        uint256 totalLiquidity,
        uint256 apr,
        bool isActive,
        uint256 lastUpdate
    ) {
        LiquidityPoolInfo storage info = poolInfo[_getPairKey(tokenA, tokenB)];
        return (
            info.tokenA,
            info.tokenB,
            info.totalLiquidity,
            info.apr,
            info.isActive,
            info.lastUpdate
        );
    }
    
    /**
     * @dev Get all supported tokens
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }
    
    /**
     * @dev Get adapter configuration
     */
    function getAdapterConfig() external view returns (
        address governanceContract,
        address treasuryContract,
        address liquidityPool,
        address protectedRouter,
        address pforkToken,
        uint256 minLiquidity,
        uint256 maxSlippage,
        uint256 govThreshold
    ) {
        return (
            address(GOVERNANCE_CONTRACT),
            address(TREASURY_CONTRACT),
            address(LIQUIDITY_POOL),
            address(PROTECTED_ROUTER),
            address(PFORK_TOKEN),
            minLiquidityAmount,
            maxSlippage,
            governanceThreshold
        );
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Get total trading volume
     */
    function _getTotalVolume() internal view returns (uint256) {
        uint256 total = 0;
        // This would iterate through all pairs in production
        return total;
    }
    
    /**
     * @dev Get authorized provider count
     */
    function _getAuthorizedProviderCount() internal view returns (uint256) {
        uint256 count = 0;
        // This would iterate through all providers in production
        return count;
    }
    
    // ============ Receive Function ============
    
    receive() external payable {
        // Allow contract to receive ETH if needed
    }
}
