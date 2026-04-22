import { expect } from "chai";
import { network } from "hardhat";

describe("QIELendERC4626Adapter", function () {
  let ethers: any;
  let mockERC20: any;
  let mockCToken: any;
  let adapter: any;
  let owner: any;
  let user: any;

  before(async function() {
    const net = await network.getOrCreate();
    ethers = net.ethers;
  });

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Mock USDC", "USDC");
    await mockERC20.waitForDeployment();

    const MockCToken = await ethers.getContractFactory("MockCToken");
    mockCToken = await MockCToken.deploy(await mockERC20.getAddress());
    await mockCToken.waitForDeployment();

    const Adapter = await ethers.getContractFactory("QIELendERC4626Adapter");
    adapter = await Adapter.deploy(
        await mockERC20.getAddress(),
        await mockCToken.getAddress(),
        "QIE Lend Adapter",
        "yQIE"
    );
    await adapter.waitForDeployment();

    await mockERC20.mint(user.address, ethers.parseUnits("1000", 18));
  });

  it("should deposit underlying and mint adapter shares", async function () {
    const depositAmount = ethers.parseUnits("100", 18);
    await mockERC20.connect(user).approve(await adapter.getAddress(), depositAmount);

    await adapter.connect(user).deposit(depositAmount, user.address);

    const adapterShares = await adapter.balanceOf(user.address);
    expect(adapterShares).to.equal(depositAmount); // 1:1 initially

    const cTokenBalance = await mockCToken.balanceOf(await adapter.getAddress());
    expect(cTokenBalance).to.equal(depositAmount); // 1e18 exchange rate
  });

  it("should withdraw underlying using adapter shares", async function () {
    const depositAmount = ethers.parseUnits("100", 18);
    await mockERC20.connect(user).approve(await adapter.getAddress(), depositAmount);
    await adapter.connect(user).deposit(depositAmount, user.address);

    const adapterShares = await adapter.balanceOf(user.address);
    await adapter.connect(user).withdraw(depositAmount, user.address, user.address);

    const userBalance = await mockERC20.balanceOf(user.address);
    expect(userBalance).to.equal(ethers.parseUnits("1000", 18)); // Back to original
  });

  it("should calculate correct totalAssets when exchange rate changes", async function () {
    const depositAmount = ethers.parseUnits("100", 18);
    await mockERC20.connect(user).approve(await adapter.getAddress(), depositAmount);
    await adapter.connect(user).deposit(depositAmount, user.address);

    // Increase exchange rate by 10% (1.1e18)
    await mockCToken.setExchangeRate(ethers.parseUnits("1.1", 18));

    const totalAssets = await adapter.totalAssets();
    expect(totalAssets).to.equal(ethers.parseUnits("110", 18));
  });
});
