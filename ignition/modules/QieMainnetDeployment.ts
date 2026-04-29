import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const QUSDC = "0x3F43DA82eC9A4f5285F10FaF1F26EcA7319E5DA5";
const cQUSDC = "0x3EcD3b3fa22Cc251301BA78F4Ba014f78B6FE542";

const QieMainnetDeployment = buildModule("QieMainnetDeployment", (m) => {
  // 1. Deploy the Adapter for QUSDC
  const qusdcAdapter = m.contract("QIELendERC4626Adapter", [
    QUSDC,
    cQUSDC,
    "QIE Lend USDC Vault",
    "yQUSDC"
  ]);

  // 2. Deploy SmartRouter Implementation
  const smartRouterImpl = m.contract("SmartRouter");

  // 3. Deploy RouterFactory
  const routerFactory = m.contract("RouterFactory", [smartRouterImpl]);

  // 4. Whitelist the Adapter in the Factory
  m.call(routerFactory, "whitelistVault", [QUSDC, qusdcAdapter]);

  return { qusdcAdapter, smartRouterImpl, routerFactory };
});

export default QieMainnetDeployment;
