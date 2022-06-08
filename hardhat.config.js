require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require('solidity-coverage')
require("hardhat-gas-trackooor");


task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const { API_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.4",
  
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337,
      // Its value should be "auto" or a number. If a number is used, it will be the gas limit used by default in every transaction. 
      // If "auto" is used, the gas limit will be automatically estimated. Default value: the same value as blockGasLimit.
      gas: 6_000_000, //"auto",
      gasPrice: "auto",
      //the block gas limit to use in Hardhat Network's blockchain. Default value: 30_000_000
      blockGasLimit: 40_000_000,
      // timeout: 4000,
      mining: {
        autho: false,
        interfval: 2000
      }
    },
    rinkeby: {
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    }
  },
};
