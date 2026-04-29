import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const INITIAL_MOCK_QUSDC_MINT = 1_000_000n * 10n ** 18n;

const QieTestnetMockDeployment = buildModule("QieTestnetMockDeployment", (m) => {
  const deployer = m.getAccount(0);
  const feeRecipient = m.getParameter("feeRecipient", deployer);
  const initialMint = m.getParameter("initialMockQusdcMint", INITIAL_MOCK_QUSDC_MINT);

  const mockQusdc = m.contract("MockERC20", ["Mock QUSDC", "mQUSDC"]);
  const mockCToken = m.contract("MockCToken", [mockQusdc]);

  const qusdcAdapter = m.contract("QIELendERC4626Adapter", [
    mockQusdc,
    mockCToken,
    "Mock QIE Lend QUSDC Vault",
    "ymQUSDC",
  ]);

  const smartRouterImpl = m.contract("SmartRouter");
  const routerFactory = m.contract("RouterFactory", [smartRouterImpl]);

  m.call(routerFactory, "whitelistVault", [mockQusdc, qusdcAdapter], {
    id: "whitelistMockQusdcVault",
  });

  m.call(mockQusdc, "mint", [deployer, initialMint], {
    id: "mintMockQusdcToDeployer",
  });
   
  // deploy social jackpot

  const jackpot = m.contract("SocialJackpot", [feeRecipient]);


  return {
    mockQusdc,
    mockCToken,
    qusdcAdapter,
    smartRouterImpl,
    routerFactory,
    jackpot
  };
});

export default QieTestnetMockDeployment;
