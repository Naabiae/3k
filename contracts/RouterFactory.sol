// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";

interface ISmartRouter {
    function initialize(
        address _owner,
        address _factory,
        uint256 _operatingPct,
        uint256 _treasuryPct,
        uint256 _lockedPct,
        uint256 _allowanceAmount,
        uint256 _allowancePeriod
    ) external;
}

contract RouterFactory {
    address public owner;
    address public pendingOwner;
    address public routerImplementation;

    // Mapping from Token Address => ERC4626 Vault Address
    mapping(address => address) public tokenToVault;

    // Mapping from Owner Address => Router Address
    mapping(address => address[]) public userRouters;

    event VaultWhitelisted(address indexed token, address indexed vault);
    event RouterDeployed(address indexed owner, address indexed router);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ImplementationUpdated(address indexed oldImpl, address indexed newImpl);

    error Unauthorized();
    error ZeroAddress();
    error NoPendingOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _routerImplementation) {
        if (_routerImplementation == address(0)) revert ZeroAddress();
        owner = msg.sender;
        routerImplementation = _routerImplementation;
    }

    /**
     * @dev Admin function to whitelist a vault for a specific token.
     */
    function whitelistVault(address token, address vault) external onlyOwner {
        if (token == address(0) || vault == address(0)) revert ZeroAddress();
        tokenToVault[token] = vault;
        emit VaultWhitelisted(token, vault);
    }

    /**
     * @dev Get the whitelisted vault for a token.
     */
    function getVault(address token) external view returns (address) {
        return tokenToVault[token];
    }

    /**
     * @dev Deploy a new SmartRouter proxy.
     */
    function deployRouter(
        uint256 operatingPct,
        uint256 treasuryPct,
        uint256 lockedPct,
        uint256 allowanceAmount,
        uint256 allowancePeriod
    ) external returns (address) {
        address clone = Clones.clone(routerImplementation);
        ISmartRouter(clone).initialize(
            msg.sender,
            address(this),
            operatingPct,
            treasuryPct,
            lockedPct,
            allowanceAmount,
            allowancePeriod
        );

        userRouters[msg.sender].push(clone);
        emit RouterDeployed(msg.sender, clone);

        return clone;
    }

    /**
     * @dev Get all routers deployed by a specific user.
     */
    function getUserRouters(address user) external view returns (address[] memory) {
        return userRouters[user];
    }

    /**
     * @dev Start ownership transfer to a new address. The new owner must accept.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /**
     * @dev Accept ownership transfer. Must be called by the pending owner.
     */
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NoPendingOwner();
        address oldOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, owner);
    }

    /**
     * @dev Update the router implementation address.
     */
    function updateImplementation(address newImplementation) external onlyOwner {
        if (newImplementation == address(0)) revert ZeroAddress();
        address oldImpl = routerImplementation;
        routerImplementation = newImplementation;
        emit ImplementationUpdated(oldImpl, newImplementation);
    }
}
