import { expect } from "chai";
import { network } from "hardhat";

describe("SmartRouter", function () {
  let ethers: any;
  let time: any;
  let mockERC20: any;
  let mockVault: any;
  let routerFactory: any;
  let smartRouterImpl: any;
  let smartRouter: any;
  
  let admin: any;
  let entityOwner: any;
  let sender: any;
  let anyone: any;

  const OPERATING_PCT = 6000n; // 60%
  const TREASURY_PCT = 2000n;  // 20%
  const LOCKED_PCT = 2000n;    // 20%
  let ALLOWANCE_AMOUNT: any;
  const ALLOWANCE_PERIOD = 7n * 24n * 60n * 60n; // 1 week

  before(async function() {
    const net = await network.getOrCreate();
    ethers = net.ethers;
    time = (net as any).networkHelpers.time;
    ALLOWANCE_AMOUNT = ethers.parseUnits("500", 18);
  });

  beforeEach(async function () {
    [admin, entityOwner, sender, anyone] = await ethers.getSigners();

    // 1. Deploy Mock Token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Mock USDC", "USDC");
    await mockERC20.waitForDeployment();

    // 2. Deploy Mock Vault
    const MockVault = await ethers.getContractFactory("MockERC4626Vault");
    mockVault = await MockVault.deploy(await mockERC20.getAddress(), "Yield USDC", "yUSDC");
    await mockVault.waitForDeployment();

    // 3. Deploy Router Implementation & Factory
    const SmartRouter = await ethers.getContractFactory("SmartRouter");
    smartRouterImpl = await SmartRouter.deploy();
    await smartRouterImpl.waitForDeployment();

    const RouterFactory = await ethers.getContractFactory("RouterFactory");
    routerFactory = await RouterFactory.deploy(await smartRouterImpl.getAddress());
    await routerFactory.waitForDeployment();

    // 4. Whitelist Vault
    await routerFactory.whitelistVault(await mockERC20.getAddress(), await mockVault.getAddress());

    // 5. Deploy a Router for entityOwner
    const deployTx = await routerFactory.connect(entityOwner).deployRouter(
      OPERATING_PCT,
      TREASURY_PCT,
      LOCKED_PCT,
      ALLOWANCE_AMOUNT,
      ALLOWANCE_PERIOD
    );
    const receipt = await deployTx.wait();
    
    // Parse logs to find RouterDeployed event
    const event = receipt.logs.find((log: any) => {
        try {
            return routerFactory.interface.parseLog(log)?.name === "RouterDeployed";
        } catch {
            return false;
        }
    });
    
    const routerAddress = routerFactory.interface.parseLog(event).args.router;
    smartRouter = await ethers.getContractAt("SmartRouter", routerAddress);

    // 6. Mint tokens to Sender
    await mockERC20.mint(sender.address, ethers.parseUnits("10000", 18));
  });

  it("Should process payments correctly", async function () {
    const paymentAmount = ethers.parseUnits("1000", 18);
    await mockERC20.connect(sender).transfer(await smartRouter.getAddress(), paymentAmount);

    const ownerBalanceBefore = await mockERC20.balanceOf(entityOwner.address);
    const vaultBalanceBefore = await mockERC20.balanceOf(await mockVault.getAddress());

    await smartRouter.connect(anyone).processPayment(await mockERC20.getAddress());

    const ownerBalanceAfter = await mockERC20.balanceOf(entityOwner.address);
    const vaultBalanceAfter = await mockERC20.balanceOf(await mockVault.getAddress());

    // Operating capital goes directly to owner: 60% of 1000 = 600
    expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(ethers.parseUnits("600", 18));

    // Remaining 40% goes to vault = 400
    expect(vaultBalanceAfter - vaultBalanceBefore).to.equal(ethers.parseUnits("400", 18));

    // Internal shares should be correctly split
    // Since exchange rate is 1:1 at start, 200 shares for treasury, 200 shares for locked
    const tShares = await smartRouter.treasuryShares();
    const lShares = await smartRouter.lockedShares();
    expect(tShares).to.equal(ethers.parseUnits("200", 18));
    expect(lShares).to.equal(ethers.parseUnits("200", 18));
  });

  it("Should claim allowance correctly after time passes", async function () {
    // Send initial 10000
    await mockERC20.connect(sender).transfer(await smartRouter.getAddress(), ethers.parseUnits("10000", 18));
    await smartRouter.processPayment(await mockERC20.getAddress());
    // Locked balance should be 2000

    // Claiming early should revert
    await expect(smartRouter.claimAllowance(await mockERC20.getAddress())).to.be.revertedWithCustomError(smartRouter, "AllowancePeriodNotMet");

    // Fast forward 1 week
    await time.increase(Number(ALLOWANCE_PERIOD) + 1);

    const ownerBalanceBefore = await mockERC20.balanceOf(entityOwner.address);
    
    // Claim allowance
    await smartRouter.claimAllowance(await mockERC20.getAddress());

    const ownerBalanceAfter = await mockERC20.balanceOf(entityOwner.address);
    
    // Should have received 500
    expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(ALLOWANCE_AMOUNT);
  });

  it("Should allow withdrawal of treasury with yield", async function () {
    await mockERC20.connect(sender).transfer(await smartRouter.getAddress(), ethers.parseUnits("10000", 18));
    await smartRouter.processPayment(await mockERC20.getAddress());

    // Treasury has 2000 shares
    expect(await smartRouter.treasuryShares()).to.equal(ethers.parseUnits("2000", 18));

    // Simulate yield: +10% to the vault
    // Vault total assets is 4000. Let's add 400 more tokens.
    await mockVault.simulateYield(ethers.parseUnits("400", 18));

    const ownerBalanceBefore = await mockERC20.balanceOf(entityOwner.address);
    
    // Owner withdraws all their treasury shares using max uint
    await smartRouter.connect(entityOwner).withdrawTreasury(await mockERC20.getAddress(), ethers.MaxUint256);

    const ownerBalanceAfter = await mockERC20.balanceOf(entityOwner.address);
    
    expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(2199999999999999999999n);
    expect(await smartRouter.treasuryShares()).to.equal(0n);
  });
});
