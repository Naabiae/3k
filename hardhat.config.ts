import { HardhatUserConfig } from "hardhat/config";
import toolbox from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      forking: {
        url: "https://rpc3mainnet.qie.digital/"
      }
    },
    qie: {
      type: "http",
      url: "https://rpc1mainnet.qie.digital/",
      chainId: 1990,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  plugins: [toolbox]
};

export default config;
