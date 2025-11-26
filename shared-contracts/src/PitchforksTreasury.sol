// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./PitchforksCore.sol";
import "./PitchforksGovernance.sol";

/**
 * @title PitchforksTreasury
 * @dev Ecosystem-wide treasury with budget allocations and multi-token support
 * @notice Manages funding for all Pitchforks projects with governance controls
 */
contract PitchforksTreasury is PitchforksCore {
    
    // ============ Structs ============
    
    struct Budget {
        uint256 allocatedAmount;     // Total allocated budget
        uint256 spentAmount;         // Total amount spent
        uint256 withdrawalLimit;     // Per-withdrawal limit for operators
        uint256 dailyLimit;          // Daily withdrawal limit
        uint256 lastWithdrawalTime;  // Last withdrawal timestamp
        uint256 dailySpent;          // Amount spent today
        bool isActive;               // Budget is active
        mapping(address => bool) authorizedOperators; // Project-specific operators
        address[] operatorList;      // List of authorized operators
    }
    
    struct ScheduledPayment {
        uint256 id;
        address recipient;
        IERC20 token;
        uint256 amount;
        uint256 frequency; // seconds between payments
        uint256 nextPaymentTime;
        uint256 totalPayments;
        uint256 remainingPayments;
        address creator;
        bool isActive;
    }
    
    struct TokenBalance {
        uint256 balance;
        uint256 totalAllocated;
        uint256 totalSpent;
        bool isSupported;
    }
    
    // ============ State Variables ============
    
    PitchforksGovernance public immutable GOVERNANCE_CONTRACT;
    IERC20 public immutable PFORK_TOKEN;
    
    // Budget management per project
    mapping(Project => Budget) public projectBudgets;
    mapping(Project => mapping(IERC20 => TokenBalance)) public tokenBalances;
    mapping(Project => IERC20[]) public supportedTokens;
    
    // Scheduled payments
    mapping(uint256 => ScheduledPayment) public scheduledPayments;
    mapping(Project => uint256[]) public projectScheduledPayments;
    uint256 public scheduledPaymentCounter;
    
    // Treasury settings
    uint256 public emergencyWithdrawalLimit = 1000 ether; // Default emergency limit
    uint256 public defaultOperatorLimit = 100 ether;
    uint256 public defaultDailyLimit = 500 ether;
    
    // ============ Events ============
    
    event BudgetAllocated(
        Project indexed project,
        IERC20 indexed token,
        uint256 amount,
        address indexed allocator
    );
    
    event FundsWithdrawn(
        Project indexed project,
        address indexed recipient,
        IERC20 indexed token,
        uint256 amount,
        address indexed operator
    );
    
    event ScheduledPaymentCreated(
        uint256 indexed paymentId,
        Project indexed project,
        address indexed recipient,
        IERC20 token,
        uint256 amount,
        uint256 frequency
    );
    
    event ScheduledPaymentExecuted(
        uint256 indexed paymentId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    event EmergencyWithdrawal(
        address indexed recipient,
        IERC20 indexed token,
        uint256 amount,
        string reason
    );
    
    // ============ Constructor ============
    
    constructor(
        address _governanceContract,
        address _pforkToken
    ) PitchforksCore(Project.PROTOCOL) {
        require(_governanceContract != address(0), "Invalid governance address");
        require(_pforkToken != address(0), "Invalid PFORK token address");
        
        GOVERNANCE_CONTRACT = PitchforksGovernance(_governanceContract);
        PFORK_TOKEN = IERC20(_pforkToken);
        
        // Initialize PFORK token as supported for all projects
        for (uint256 i = 0; i <= uint256(Project.APP); i++) {
            _addSupportedToken(Project(i), PFORK_TOKEN);
        }
    }
    
    // ============ Budget Management ============
    
    /**
     * @dev Allocate budget to a project (only governance or owner)
     */
    function allocateBudget(
        Project _project,
        IERC20 _token,
        uint256 _amount,
        uint256 _withdrawalLimit,
        uint256 _dailyLimit
    ) external {
        require(msg.sender == address(GOVERNANCE_CONTRACT) || msg.sender == owner(), 
                "Only governance can allocate budget");
        require(_amount > 0, "Amount must be > 0");
        require(_token != IERC20(address(0)), "Invalid token");
        
        Budget storage budget = projectBudgets[_project];
        TokenBalance storage tokenBalance = tokenBalances[_project][_token];
        
        // Transfer tokens to treasury
        require(_token.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        
        // Update budget and token balance
        budget.allocatedAmount += _amount;
        tokenBalance.balance += _amount;
        tokenBalance.totalAllocated += _amount;
        
        if (_withdrawalLimit > 0) {
            budget.withdrawalLimit = _withdrawalLimit;
        }
        if (_dailyLimit > 0) {
            budget.dailyLimit = _dailyLimit;
        }
        
        budget.isActive = true;
        
        // Add to supported tokens if not already added
        _addSupportedToken(_project, _token);
        
        emit BudgetAllocated(_project, _token, _amount, msg.sender);
        _emitStateChange(uint256(_project), "budget_allocated", abi.encode(_project, _token, _amount));
    }
    
    /**
     * @dev Withdraw funds from project budget
     */
    function withdrawFunds(
        Project _project,
        IERC20 _token,
        address _recipient,
        uint256 _amount
    ) external nonReentrant {
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");
        
        Budget storage budget = projectBudgets[_project];
        TokenBalance storage tokenBalance = tokenBalances[_project][_token];
        
        require(budget.isActive, "Budget not active");
        require(tokenBalance.isSupported, "Token not supported");
        
        // Check authorization
        require(
            msg.sender == owner() || 
            msg.sender == address(GOVERNANCE_CONTRACT) ||
            budget.authorizedOperators[msg.sender],
            "Not authorized to withdraw"
        );
        
        // Check limits
        uint256 availableAmount = tokenBalance.balance;
        require(availableAmount >= _amount, "Insufficient funds");
        
        if (msg.sender != owner() && msg.sender != address(GOVERNANCE_CONTRACT)) {
            require(_amount <= budget.withdrawalLimit, "Amount exceeds withdrawal limit");
            require(_checkDailyLimit(_project, _amount), "Amount exceeds daily limit");
        }
        
        // Execute withdrawal
        tokenBalance.balance -= _amount;
        tokenBalance.totalSpent += _amount;
        budget.spentAmount += _amount;
        
        require(_token.transfer(_recipient, _amount), "Transfer failed");
        
        emit FundsWithdrawn(_project, _recipient, _token, _amount, msg.sender);
        _emitStateChange(uint256(_project), "funds_withdrawn", abi.encode(_project, _recipient, _token, _amount));
    }
    
    /**
     * @dev Emergency withdrawal (owner only)
     */
    function emergencyWithdraw(
        IERC20 _token,
        address _recipient,
        uint256 _amount,
        string calldata _reason
    ) external onlyOwner {
        require(_amount <= emergencyWithdrawalLimit, "Amount exceeds emergency limit");
        require(_token.balanceOf(address(this)) >= _amount, "Insufficient treasury funds");
        
        require(_token.transfer(_recipient, _amount), "Transfer failed");
        
        emit EmergencyWithdrawal(_recipient, _token, _amount, _reason);
        _emitStateChange(0, "emergency_withdrawal", abi.encode(_recipient, _token, _amount, _reason));
    }
    
    // ============ Project Operator Management ============
    
    /**
     * @dev Add operator for specific project (owner or governance)
     */
    function addProjectOperator(
        Project _project,
        address _operator
    ) external {
        require(msg.sender == owner() || msg.sender == address(GOVERNANCE_CONTRACT), 
                "Not authorized");
        require(_operator != address(0), "Invalid operator");
        
        Budget storage budget = projectBudgets[_project];
        require(!budget.authorizedOperators[_operator], "Operator already authorized");
        
        budget.authorizedOperators[_operator] = true;
        budget.operatorList.push(_operator);
        
        _emitStateChange(uint256(_project), "operator_added", abi.encode(_project, _operator));
    }
    
    /**
     * @dev Remove operator from specific project
     */
    function removeProjectOperator(
        Project _project,
        address _operator
    ) external {
        require(msg.sender == owner() || msg.sender == address(GOVERNANCE_CONTRACT), 
                "Not authorized");
        
        Budget storage budget = projectBudgets[_project];
        require(budget.authorizedOperators[_operator], "Operator not authorized");
        
        budget.authorizedOperators[_operator] = false;
        
        // Remove from array
        for (uint256 i = 0; i < budget.operatorList.length; i++) {
            if (budget.operatorList[i] == _operator) {
                budget.operatorList[i] = budget.operatorList[budget.operatorList.length - 1];
                budget.operatorList.pop();
                break;
            }
        }
        
        _emitStateChange(uint256(_project), "operator_removed", abi.encode(_project, _operator));
    }
    
    // ============ Scheduled Payments ============
    
    /**
     * @dev Create scheduled payment (governance or owner)
     */
    function createScheduledPayment(
        Project _project,
        address _recipient,
        IERC20 _token,
        uint256 _amount,
        uint256 _frequency,
        uint256 _totalPayments
    ) external returns (uint256) {
        require(msg.sender == owner() || msg.sender == address(GOVERNANCE_CONTRACT), 
                "Not authorized");
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");
        require(_frequency > 0, "Frequency must be > 0");
        require(_totalPayments > 0, "Total payments must be > 0");
        
        uint256 paymentId = scheduledPaymentCounter++;
        ScheduledPayment storage payment = scheduledPayments[paymentId];
        
        payment.id = paymentId;
        payment.recipient = _recipient;
        payment.token = _token;
        payment.amount = _amount;
        payment.frequency = _frequency;
        payment.nextPaymentTime = block.timestamp + _frequency;
        payment.totalPayments = _totalPayments;
        payment.remainingPayments = _totalPayments;
        payment.creator = msg.sender;
        payment.isActive = true;
        
        projectScheduledPayments[_project].push(paymentId);
        
        emit ScheduledPaymentCreated(paymentId, _project, _recipient, _token, _amount, _frequency);
        _emitStateChange(paymentId, "scheduled_payment_created", abi.encode(_project, _recipient, _token, _amount));
        
        return paymentId;
    }
    
    /**
     * @dev Execute scheduled payment
     */
    function executeScheduledPayment(uint256 _paymentId) external {
        ScheduledPayment storage payment = scheduledPayments[_paymentId];
        
        require(payment.isActive, "Payment not active");
        require(block.timestamp >= payment.nextPaymentTime, "Payment not due");
        require(payment.remainingPayments > 0, "No remaining payments");
        
        // Check if sufficient funds are available
        require(payment.token.balanceOf(address(this)) >= payment.amount, "Insufficient funds");
        
        // Execute payment
        payment.nextPaymentTime += payment.frequency;
        payment.remainingPayments--;
        
        if (payment.remainingPayments == 0) {
            payment.isActive = false;
        }
        
        require(payment.token.transfer(payment.recipient, payment.amount), "Transfer failed");
        
        emit ScheduledPaymentExecuted(_paymentId, payment.recipient, payment.amount, block.timestamp);
        _emitStateChange(_paymentId, "scheduled_payment_executed", abi.encode(_paymentId, payment.amount));
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Add supported token for project
     */
    function _addSupportedToken(Project _project, IERC20 _token) internal {
        TokenBalance storage tokenBalance = tokenBalances[_project][_token];
        if (!tokenBalance.isSupported) {
            tokenBalance.isSupported = true;
            supportedTokens[_project].push(_token);
        }
    }
    
    /**
     * @dev Check daily withdrawal limit
     */
    function _checkDailyLimit(Project _project, uint256 _amount) internal returns (bool) {
        Budget storage budget = projectBudgets[_project];
        
        // Reset daily counter if new day
        if (block.timestamp >= budget.lastWithdrawalTime + 1 days) {
            budget.dailySpent = 0;
            budget.lastWithdrawalTime = block.timestamp;
        }
        
        if (budget.dailySpent + _amount > budget.dailyLimit) {
            return false;
        }
        
        budget.dailySpent += _amount;
        return true;
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get budget details for project
     */
    function getBudgetDetails(Project _project) external view returns (
        uint256 allocatedAmount,
        uint256 spentAmount,
        uint256 remainingAmount,
        uint256 withdrawalLimit,
        uint256 dailyLimit,
        uint256 dailySpent,
        bool isActive,
        uint256 operatorCount
    ) {
        Budget storage budget = projectBudgets[_project];
        return (
            budget.allocatedAmount,
            budget.spentAmount,
            budget.allocatedAmount - budget.spentAmount,
            budget.withdrawalLimit,
            budget.dailyLimit,
            budget.dailySpent,
            budget.isActive,
            budget.operatorList.length
        );
    }
    
    /**
     * @dev Get token balance for project
     */
    function getTokenBalance(Project _project, IERC20 _token) external view returns (
        uint256 balance,
        uint256 totalAllocated,
        uint256 totalSpent,
        bool isSupported
    ) {
        TokenBalance storage tokenBalance = tokenBalances[_project][_token];
        return (
            tokenBalance.balance,
            tokenBalance.totalAllocated,
            tokenBalance.totalSpent,
            tokenBalance.isSupported
        );
    }
    
    /**
     * @dev Get all supported tokens for project
     */
    function getSupportedTokens(Project _project) external view returns (address[] memory) {
        IERC20[] storage tokens = supportedTokens[_project];
        address[] memory result = new address[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            result[i] = address(tokens[i]);
        }
        
        return result;
    }
    
    /**
     * @dev Get project operators
     */
    function getProjectOperators(Project _project) external view returns (address[] memory) {
        return projectBudgets[_project].operatorList;
    }
    
    /**
     * @dev Get scheduled payments for project
     */
    function getProjectScheduledPayments(Project _project) external view returns (uint256[] memory) {
        return projectScheduledPayments[_project];
    }
    
    /**
     * @dev Get scheduled payment details
     */
    function getScheduledPayment(uint256 _paymentId) external view returns (
        address recipient,
        address token,
        uint256 amount,
        uint256 frequency,
        uint256 nextPaymentTime,
        uint256 remainingPayments,
        address creator,
        bool isActive
    ) {
        ScheduledPayment storage payment = scheduledPayments[_paymentId];
        return (
            payment.recipient,
            address(payment.token),
            payment.amount,
            payment.frequency,
            payment.nextPaymentTime,
            payment.remainingPayments,
            payment.creator,
            payment.isActive
        );
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Update treasury limits (owner only)
     */
    function updateTreasuryLimits(
        uint256 _emergencyWithdrawalLimit,
        uint256 _defaultOperatorLimit,
        uint256 _defaultDailyLimit
    ) external onlyOwner {
        emergencyWithdrawalLimit = _emergencyWithdrawalLimit;
        defaultOperatorLimit = _defaultOperatorLimit;
        defaultDailyLimit = _defaultDailyLimit;
        
        _emitStateChange(0, "treasury_limits_updated", abi.encode(_emergencyWithdrawalLimit, _defaultOperatorLimit, _defaultDailyLimit));
    }
}
