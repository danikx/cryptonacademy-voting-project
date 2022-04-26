const { expect } = require("chai");
const { ethers } = require("hardhat");
const { add } = require("lodash");
const { pool } = require("workerpool");

describe("Testing Vote smart contract", function () {
   
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
      .to.emit(voter, "AddingVotersEvent").withArgs(voter3.address);
  });

  it("Should vote", async function(){
    const[admin, voter1, voter2, voter3, voter4, candWallet1, candWallet2, pollWallet] = await ethers.getSigners();

    const voting = await ethers.getContractFactory("Voting");
    const voter = await voting.deploy();

    pollName = "cities";
    
    await expect(voter.createPoll(pollName, admin.address, ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]))
      .to.emit(voter, "PollCreatedEvent")
      .withArgs(pollName);

    await expect(voter.addVoters([voter1.address, voter2.address, voter3.address, voter4.address]))
      .to.emit(voter, "AddingVotersEvent").withArgs(voter1.address)
      .and
      .to.emit(voter, "AddingVotersEvent").withArgs(voter2.address)
      .and
      .to.emit(voter, "AddingVotersEvent").withArgs(voter3.address)
      .and
      .to.emit(voter, "AddingVotersEvent").withArgs(voter4.address);;


    // vote 3 times
    await expect(voter.connect(voter1).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") })).to.emit(voter, "VoteEvent").withArgs(pollName, 0);
    await expect(voter.connect(voter2).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") })).to.emit(voter, "VoteEvent").withArgs(pollName, 0);
    await expect(voter.connect(voter3).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") })).to.emit(voter, "VoteEvent").withArgs(pollName, 1);
   
    // check that voter can't close poll because poll is not ended.
    await expect(voter.connect(voter2).closePoll(pollName)).to.be.revertedWith("can be closed after poll end date");

    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (3 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 

    // close poll (any voter can close poll after poll ends)
    await expect(await voter.connect(voter2).closePoll(pollName)).to.emit(voter, "PollClosedEvent").withArgs(pollName);

    // check that voter can't vote after poll is closed.
    await expect(voter.connect(voter4).vote(pollName, 1)).to.be.revertedWith("poll is closed");

    // , { value: ethers.utils.parseUnits("8999085173560582658028", "wei")}

    // checkt that winner is Astana with 2 votes.
    const v = await voter.pollWinner(pollName); 
    await expect([v[0], v[1].toNumber()]).to.have.members(["Astana", 2]); ethers.BigNumber.from(2)

    const winnerAmount = await voter.getWinnerCommission(pollName);
    
    await voter.connect(admin).sentWinnerCommission(pollName, { value: ethers.utils.parseUnits(winnerAmount.toString(), "wei")});

    await expect( await voter.connect(admin).sentWinnerCommission(pollName, { value: ethers.utils.parseUnits(winnerAmount.toString(), "wei")}))
    .to.changeEtherBalance(admin, "-" + winnerAmount.toString());

    await expect( await voter.connect(admin).sentWinnerCommission(pollName, { value: ethers.utils.parseUnits(winnerAmount.toString(), "wei")}))
    .to.changeEtherBalance(candWallet1, winnerAmount.toString());

  });


});
