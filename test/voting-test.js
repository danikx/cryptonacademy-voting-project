const { expect } = require("chai");
const { ethers } = require("hardhat");
const { add } = require("lodash");
const { pool } = require("workerpool");

describe("Voting", function () {
  
  // it("Create Poll", async function () {
  //   const Voting = await ethers.getContractFactory("Voting");
  //   const voter = await Voting.deploy();
  //   await voter.deployed();

  //   await voter.createPoll("test", [], []);

  //   expect((await voter.getPolls())[0]).to.equals("test")
  
  //   // const setGreetingTx = await voter.setGreeting("Hola, mundo!");

  //   // wait until the transaction is mined
  //   // await setGreetingTx.wait();

  //   // expect(await voter.greet()).to.equal("Hola, mundo!");
  // });

  it("Vote smart contract", async function(){
    const [admin, voter1, voter2, voter3, candWallet1, candWallet2, pollWallet] = await ethers.getSigners();

    console.log(' admin', admin.address);
    console.log('voter1', voter1.address);
    console.log('voter2', voter2.address);
    console.log('voter3', voter3.address);

    console.log();
    console.log('candidate-wallet-1', candWallet1.address);
    console.log('candidate-wallet-2', candWallet2.address);
    
    console.log();
    console.log('poll-wallet', pollWallet.address);

    console.log();

    const pollName = "Cities"

    const voting = await ethers.getContractFactory("Voting");
    const voter = await voting.deploy();
    // await voter.deployed();

    await voter.createPoll(pollName, admin.address, ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]);
    await voter.addVoters([voter1.address, voter2.address, voter3.address]);
    
    console.log("voting.....");
    await voter.connect(voter1).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") });
    await voter.connect(voter2).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    await voter.connect(voter3).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
 
    console.log("vote complited.");

    await voter.connect(admin).closePoll(pollName, { value: ethers.utils.parseUnits("8999085173560582658028", "wei") });
    // await voter.connect(admin).closePoll(pollName, { value: ethers.utils.parseUnits("1", "ether") });
    // await voter.connect(admin).closePoll(pollName);
 
    //console.log(voter);
    expect("test").to.equal("test")
  });
});
