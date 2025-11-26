require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config.js').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    "neo-x": {
      url: "https://mainnet-2.rpc.banelabs.org",
      chainId: 47763,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000, // 20 gwei
    },
    "neo-x-testnet": {
      url: "https://testnet-1.rpc.banelabs.org",
      chainId: 12227,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    "localhost": {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      "neo-x": process.env.NEOX_API_KEY || "dummy-key",
    },
    customChains: [
      {
        network: "neo-x",
        chainId: 47763,
        urls: {
          apiURL: "https://xexplorer.neo.org/api",
          browserURL: "https://xexplorer.neo.org",
        },
      },
    ],
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
