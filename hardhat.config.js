require("@nomiclabs/hardhat-waffle");


task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("deploy", "deploy smartcontract", async(taskArgs, hre)=>{

});

module.exports = {
  solidity: "0.8.4",
  
  networks:{
    hardhat:{
      chainId: 1337
    }
  }
};
