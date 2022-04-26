const { expect } = require("chai");
const { ethers } = require("hardhat");
const { add } = require("lodash");
const { pool } = require("workerpool");

describe("Voting", function () {
   
  it("Create a poll", async function(){
    const voting = await ethers.getContractFactory("Voting");
    const voter = await voting.deploy(); 

    const [admin, candWallet1, candWallet2] = await ethers.getSigners();
  
    pollName = "cities";

    await expect(await voter.createPoll(pollName, admin.address, ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]))
      .to.emit(voter, "PollCreatedEvent")
      .withArgs(pollName);
  })

  it("Add Voters", async function(){
    const [admin, voter1, voter2, voter3, candWallet1, candWallet2, pollWallet] = await ethers.getSigners();

    const voting = await ethers.getContractFactory("Voting");
    const voter = await voting.deploy();
  
    await expect(await voter.addVoters([voter1.address, voter2.address, voter3.address]))
      .to.emit(voter, "AddingVotersEvent").withArgs(voter1.address)
      .and
      .to.emit(voter, "AddingVotersEvent").withArgs(voter2.address)
      .and
      .to.emit(voter, "AddingVotersEvent").withArgs(voter3.address)
      ;

  });

  it("Should vote", async function(){
    const[admin, voter1, voter2, voter3, candWallet1, candWallet2, pollWallet] = await ethers.getSigners();

    const voting = await ethers.getContractFactory("Voting");
    const voter = await voting.deploy();

    pollName = "cities";
    
    await expect(await voter.createPoll(pollName, admin.address, ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]))
      .to.emit(voter, "PollCreatedEvent")
      .withArgs(pollName);

    await expect(await voter.addVoters([voter1.address, voter2.address, voter3.address]))
      .to.emit(voter, "AddingVotersEvent").withArgs(voter1.address)
      .and
      .to.emit(voter, "AddingVotersEvent").withArgs(voter2.address)
      .and
      .to.emit(voter, "AddingVotersEvent").withArgs(voter3.address);


    await expect(await voter.connect(voter1).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") })).to.emit(voter, "VoteEvent").withArgs(pollName, 0);
    await expect(await voter.connect(voter2).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") })).to.emit(voter, "VoteEvent").withArgs(pollName, 0);
    await expect(await voter.connect(voter3).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") })).to.emit(voter, "VoteEvent").withArgs(pollName, 1);
   
 
    await expect(await voter.connect(admin).closePoll(pollName, { value: ethers.utils.parseUnits("8999085173560582658028", "wei")}))
      .to.emit(voter, "PollClosedEvent").withArgs(pollName);


  });
});
