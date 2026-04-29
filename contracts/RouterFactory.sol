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
    address public routerImplementation;

    // Mapping from Token Address => ERC4626 Vault Address
    mapping(address => address) public tokenToVault;

    // Mapping from Owner Address => Router Address
    mapping(address => address[]) public userRouters;

    event VaultWhitelisted(address indexed token, address indexed vault);
    event RouterDeployed(address indexed owner, address indexed router);

    error Unauthorized();
    error ZeroAddress();

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
}
