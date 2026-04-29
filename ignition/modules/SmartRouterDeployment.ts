import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SmartRouterDeployment = buildModule("SmartRouterDeployment", (m) => {
  // Deploy the SmartRouter implementation
  const smartRouterImpl = m.contract("SmartRouter");

  // Deploy the RouterFactory using the implementation address
  const routerFactory = m.contract("RouterFactory", [smartRouterImpl]);

  return { smartRouterImpl, routerFactory };
});

export default SmartRouterDeployment;