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

  it("deploy", async function(){
    const [owner, add1, add2, add3, add4, add5, add6] = await ethers.getSigners();

    console.log('owner', owner.address);
    console.log('add1', add1.address);
    console.log('add2', add2.address);
    console.log('add3', add3.address);

    console.log('add4', add4.address);
    console.log('add5', add5.address);
    console.log('add6', add6.address);
    console.log();

    //console.log('owner', owner);
    const pollName = "danik"

    const voting = await ethers.getContractFactory("Voting");
    const voter = await voting.deploy();
    // await voter.deployed();

    await voter.createPoll(pollName, add6.address, ["Oral", "Almaty"], [add4.address, add5.address]);
    await voter.addVoters([add1.address, add2.address, add3.address]);
    
    // await voter.vote(pollName, 0);
    
    await voter.connect(add1).vote(pollName, 0);
    await voter.connect(add2).vote(pollName, 1);
    await voter.connect(add3).vote(pollName, 1);

    await voter.connect(owner).closePoll(pollName);
 
    //console.log(voter);
    expect("test").to.equal("test")
  });
});
