import { expect } from "chai";
import { network } from "hardhat";

describe("Pay and Save Feature", function () {
  let ethers: any;
  let mockERC20: any;
  let mockVault: any;
  let routerFactory: any;
  let smartRouterImpl: any;
  let smartRouter: any;
  
  let admin: any;
  let entityOwner: any;
  let merchant: any;

  before(async function() {
    const net = await network.getOrCreate();
    ethers = net.ethers;
  });

  beforeEach(async function () {
    [admin, entityOwner, merchant] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Mock USDC", "USDC");
    await mockERC20.waitForDeployment();

    const MockVault = await ethers.getContractFactory("MockERC4626Vault");
    mockVault = await MockVault.deploy(await mockERC20.getAddress(), "Yield USDC", "yUSDC");
    await mockVault.waitForDeployment();

    const SmartRouter = await ethers.getContractFactory("SmartRouter");
    smartRouterImpl = await SmartRouter.deploy();
    await smartRouterImpl.waitForDeployment();

    const RouterFactory = await ethers.getContractFactory("RouterFactory");
    routerFactory = await RouterFactory.deploy(await smartRouterImpl.getAddress());
    await routerFactory.waitForDeployment();

    await routerFactory.whitelistVault(await mockERC20.getAddress(), await mockVault.getAddress());

    const deployTx = await routerFactory.connect(entityOwner).deployRouter(
      6000n, 2000n, 2000n, ethers.parseUnits("500", 18), 604800n
    );
    const receipt = await deployTx.wait();
    
    const event = receipt.logs.find((log: any) => {
        try { return routerFactory.interface.parseLog(log)?.name === "RouterDeployed"; } 
        catch { return false; }
    });
    
    const routerAddress = routerFactory.interface.parseLog(event).args.router;
    smartRouter = await ethers.getContractAt("SmartRouter", routerAddress);

    // Mint funds to owner for them to spend
    await mockERC20.mint(entityOwner.address, ethers.parseUnits("1000", 18));
  });

  it("should allow owner to set savePct", async function () {
    await smartRouter.connect(entityOwner).updateSavePct(1000n); // 10%
    expect(await smartRouter.savePct()).to.equal(1000n);
  });

  it("should process payAndSave correctly", async function () {
    await smartRouter.connect(entityOwner).updateSavePct(1000n); // 10%

    // Owner approves the router to spend their tokens
    const paymentAmount = ethers.parseUnits("50", 18);
    const saveAmount = ethers.parseUnits("5", 18); // 10%
    const totalRequired = paymentAmount + saveAmount;

    await mockERC20.connect(entityOwner).approve(await smartRouter.getAddress(), totalRequired);

    await smartRouter.connect(entityOwner).payAndSave(
      await mockERC20.getAddress(),
      merchant.address,
      paymentAmount
    );

    // Check balances
    expect(await mockERC20.balanceOf(merchant.address)).to.equal(paymentAmount);
    expect(await mockVault.balanceOf(await smartRouter.getAddress())).to.equal(saveAmount);
    
    // Check tracking
    expect(await smartRouter.savedPrincipal()).to.equal(saveAmount);
    expect(await smartRouter.savedShares()).to.equal(saveAmount); // 1:1 initially
  });

  it("should track principal and yield accurately after simulated yield", async function () {
    await smartRouter.connect(entityOwner).updateSavePct(1000n); // 10%
    const totalRequired = ethers.parseUnits("55", 18);
    await mockERC20.connect(entityOwner).approve(await smartRouter.getAddress(), totalRequired);
    await smartRouter.connect(entityOwner).payAndSave(await mockERC20.getAddress(), merchant.address, ethers.parseUnits("50", 18));

    // Initially saved 5 USDC
    let savings = await smartRouter.getSavingsValue(await mockERC20.getAddress());
    expect(savings.principal).to.equal(ethers.parseUnits("5", 18));
    expect(savings.totalValue).to.equal(ethers.parseUnits("5", 18));
    expect(savings.yieldEarned).to.equal(0n);

    // Simulate yield: add 5 USDC directly to vault
    await mockVault.simulateYield(ethers.parseUnits("5", 18));

    savings = await smartRouter.getSavingsValue(await mockERC20.getAddress());
    expect(savings.principal).to.equal(ethers.parseUnits("5", 18));
    expect(savings.totalValue).to.be.closeTo(ethers.parseUnits("10", 18), 2n); // Close to 10 (allow tiny rounding error from shares)
    expect(savings.yieldEarned).to.be.closeTo(ethers.parseUnits("5", 18), 2n);
  });

  it("should allow partial withdrawal of savings and reduce principal correctly", async function () {
    await smartRouter.connect(entityOwner).updateSavePct(1000n); // 10%
    const totalRequired = ethers.parseUnits("55", 18);
    await mockERC20.connect(entityOwner).approve(await smartRouter.getAddress(), totalRequired);
    await smartRouter.connect(entityOwner).payAndSave(await mockERC20.getAddress(), merchant.address, ethers.parseUnits("50", 18));

    // Withdraw 2.5 USDC (half of the 5 USDC saved)
    const ownerBalBefore = await mockERC20.balanceOf(entityOwner.address);
    await smartRouter.connect(entityOwner).withdrawSavings(await mockERC20.getAddress(), ethers.parseUnits("2.5", 18));
    const ownerBalAfter = await mockERC20.balanceOf(entityOwner.address);

    expect(ownerBalAfter - ownerBalBefore).to.equal(ethers.parseUnits("2.5", 18));

    // Principal should be reduced by half
    const savings = await smartRouter.getSavingsValue(await mockERC20.getAddress());
    expect(savings.principal).to.equal(ethers.parseUnits("2.5", 18));
  });
});