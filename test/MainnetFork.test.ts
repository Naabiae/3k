import { expect } from "chai";
import { network } from "hardhat";

const QUSDC_ADDRESS = "0x3F43DA82eC9A4f5285F10FaF1F26EcA7319E5DA5";
const CQUSDC_ADDRESS = "0x3EcD3b3fa22Cc251301BA78F4Ba014f78B6FE542";

// We need a QUSDC whale to fund our tests. 
// Ideally we can find one, but if not we can try to mint it if the contract allows, or find a whale.
// Let's use an impersonated account that has QUSDC, or we'll impersonate the QUSDC owner to mint.
const QUSDC_WHALE = "0x0000000000000000000000000000000000000000"; // Placeholder

describe("QIE Mainnet Fork Tests", function () {
  let ethers: any;
  let time: any;
  
  let qusdc: any;
  let cqusdc: any;
  let adapter: any;
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
    ALLOWANCE_AMOUNT = ethers.parseUnits("500", 6); // QUSDC has 6 decimals
  });

  beforeEach(async function () {
    [admin, entityOwner, sender, anyone] = await ethers.getSigners();

    // 1. Get mainnet contracts using ABI from compiled mock/interfaces
    qusdc = await ethers.getContractAt("MockERC20", QUSDC_ADDRESS);
    cqusdc = await ethers.getContractAt("ICToken", CQUSDC_ADDRESS);

    // 2. Deploy Adapter
    const Adapter = await ethers.getContractFactory("QIELendERC4626Adapter");
    adapter = await Adapter.deploy(
        QUSDC_ADDRESS,
        CQUSDC_ADDRESS,
        "QIE Lend USDC Vault",
        "yQUSDC"
    );
    await adapter.waitForDeployment();

    // 3. Deploy Router Implementation & Factory
    const SmartRouter = await ethers.getContractFactory("SmartRouter");
    smartRouterImpl = await SmartRouter.deploy();
    await smartRouterImpl.waitForDeployment();

    const RouterFactory = await ethers.getContractFactory("RouterFactory");
    routerFactory = await RouterFactory.deploy(await smartRouterImpl.getAddress());
    await routerFactory.waitForDeployment();

    // 4. Whitelist Adapter
    await routerFactory.whitelistVault(QUSDC_ADDRESS, await adapter.getAddress());

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

    // We need QUSDC to test. Since we are on a fork, let's forcefully set the balance of `sender` 
    // using hardhat_setStorageAt, or find the balance slot.
    // QUSDC is likely a standard ERC20. We can try to overwrite the balance slot.
    // The easiest way is usually to find the slot dynamically, or impersonate a known whale.
  });

  it("should process payments and correctly interface with QIE Lend", async function () {
      // Impersonate a whale or just use Hardhat's setStorageAt to give `sender` QUSDC
      // But it's easier to just deal with actual contract balance slot if known, 
      // or we can use `deal` equivalent if available, or just mock a whale transfer.
      // Let's use `hardhat_setBalance` for ETH, but for ERC20 we need storage slot.
      // Let's try to just impersonate a large holder. 
      // QUSDC owner / minter might be able to mint, or we find a whale.
      // Since this is a test and we might not know a whale address, let's just 
      // overwrite the balance slot of sender. For USDC-like tokens, balance mapping is usually slot 0 or 1.
      
      // We will just assume we can find the balance slot. QUSDC slot is usually 0, 1 or 2.
      const senderAddress = sender.address;
      
      // Function to find balance slot
      async function findBalanceSlot(tokenAddress: string, accountAddress: string) {
          const account = accountAddress.toLowerCase().replace("0x", "");
          for (let i = 0; i < 20; i++) {
              const slot = ethers.toBeHex(i).replace("0x", "").padStart(64, "0");
              const hash = ethers.keccak256("0x" + account.padStart(64, "0") + slot);
              const balance = await ethers.provider.send("eth_getStorageAt", [tokenAddress, hash, "latest"]);
              if (balance !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                  return i;
              }
          }
          return 1; // Default to 1 if we can't find it, often true for standard ERC20
      }

      const slot = await findBalanceSlot(QUSDC_ADDRESS, "0x0000000000000000000000000000000000000000"); // Just guess slot 1
      
      // Let's manually set the balance of sender to 10,000 QUSDC
      const account = senderAddress.toLowerCase().replace("0x", "");
      const storageSlot = ethers.toBeHex(1).replace("0x", "").padStart(64, "0"); // Guessing slot 1
      const hash = ethers.keccak256("0x" + account.padStart(64, "0") + storageSlot);
      
      const amountHex = "0x" + ethers.toBeHex(ethers.parseUnits("10000", 6)).replace("0x", "").padStart(64, "0");
      await ethers.provider.send("hardhat_setStorageAt", [
          QUSDC_ADDRESS,
          hash,
          amountHex
      ]);

      const balance = await qusdc.balanceOf(sender.address);
      if (balance == 0n) {
          // If slot 1 failed, let's try slot 0
          const storageSlot0 = ethers.toBeHex(0).replace("0x", "").padStart(64, "0");
          const hash0 = ethers.keccak256("0x" + account.padStart(64, "0") + storageSlot0);
          await ethers.provider.send("hardhat_setStorageAt", [QUSDC_ADDRESS, hash0, amountHex]);
      }
      
      const finalBalance = await qusdc.balanceOf(sender.address);
      expect(finalBalance).to.be.gt(0n);

      const paymentAmount = ethers.parseUnits("1000", 6);
      await qusdc.connect(sender).transfer(await smartRouter.getAddress(), paymentAmount);

      const ownerBalanceBefore = await qusdc.balanceOf(entityOwner.address);
      const cqusdcBalanceBefore = await cqusdc.balanceOf(await adapter.getAddress());

      await smartRouter.connect(anyone).processPayment(QUSDC_ADDRESS);

      const ownerBalanceAfter = await qusdc.balanceOf(entityOwner.address);
      const cqusdcBalanceAfter = await cqusdc.balanceOf(await adapter.getAddress());

      // 60% of 1000 = 600
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(ethers.parseUnits("600", 6));

      // Adapter should have received cTokens
      expect(cqusdcBalanceAfter).to.be.gt(cqusdcBalanceBefore);
      
      // Total assets in adapter should reflect the ~400 deposited
      const adapterTotalAssets = await adapter.totalAssets();
      // Allow a small margin of error due to integer division in exchange rate
      expect(adapterTotalAssets).to.be.closeTo(ethers.parseUnits("400", 6), 2);
  });
});