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

    await expect(await voter.createPoll(pollName, ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]))
      .to.emit(voter, "PollCreatedEvent")
      .withArgs(pollName);
  })

  it("Add Voters", async function(){
    const [admin, voter1, voter2, voter3, candWallet1, candWallet2, voter4] = await ethers.getSigners();

    const voting = await ethers.getContractFactory("Voting");
    const voter = await voting.deploy();
  
    await expect(await voter.addVoter(voter4.address)).to.emit(voter, "AddingVotersEvent").withArgs(voter4.address);

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
    
    await expect(voter.createPoll(pollName, ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]))
      .to.emit(voter, "PollCreatedEvent")
      .withArgs(pollName);

    await expect(await voter.getPolls()).to.be.members([pollName]);

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
    await expect(voter.connect(voter2).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") })).to.emit(voter, "VoteEvent").withArgs(pollName, 1);
    await expect(voter.connect(voter3).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") })).to.emit(voter, "VoteEvent").withArgs(pollName, 1);
   

    await expect(voter.sentWinnerCommission(pollName)).to.be.revertedWith("The poll is not closed")
    // await expect(voter.sentWinnerCommission(pollName)).to.be.reverted("There is no winner in the poll")

    // // check that voter can't close poll because poll is not ended.
    await expect(voter.connect(voter2).closePoll(pollName)).to.be.revertedWith("Can be closed only after poll end date");

    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (3 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 

    // // close poll (any voter can close poll after poll ends)
    await expect(await voter.connect(voter2).closePoll(pollName)).to.emit(voter, "PollClosedEvent").withArgs(pollName, 1); // 1 is index of CLOSED_HAS_WINNER

    // // check that voter can't vote after poll is closed.
    await expect(voter.connect(voter4).vote(pollName, 1)).to.be.revertedWith("The poll is closed");

    // // checkt that winner is Almaty with 2 votes.
    const v = await voter.pollWinner(pollName); 
    await expect([v[0], v[1].toNumber()]).to.have.members(["Almaty", 2]); ethers.BigNumber.from(2)

    const winnerAmount = await voter.getWinnerCommission(pollName);
    
    await voter.connect(admin).sentWinnerCommission(pollName, { value: ethers.utils.parseUnits(winnerAmount.toString(), "wei")});

    await expect( await voter.connect(admin).sentWinnerCommission(pollName, { value: ethers.utils.parseUnits(winnerAmount.toString(), "wei")}))
    .to.changeEtherBalance(admin, "-" + winnerAmount.toString());
 
    await expect( await voter.connect(admin).sentWinnerCommission(pollName, { value: ethers.utils.parseUnits(winnerAmount.toString(), "wei")}))
    .to.changeEtherBalance(candWallet2, winnerAmount.toString());

  });

  it("Testing when is no one voted", async function(){
    const[admin, voter1, voter2, voter3, voter4, candWallet1, candWallet2, pollWallet] = await ethers.getSigners();

    const voting = await ethers.getContractFactory("Voting");
    const voter = await voting.deploy();

    pollName = "cities";
    
    await expect(voter.createPoll(pollName, ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]))
      .to.emit(voter, "PollCreatedEvent")
      .withArgs(pollName);

    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (10 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 
  
    // close poll (any voter can close poll after poll ends)
    await expect(await voter.connect(voter2).closePoll(pollName)).to.emit(voter, "PollClosedEvent").withArgs(pollName, 0); // 0 is index of CLOSED_NO_WINNER
  
    // check that voter can't vote after poll is closed.
    await expect(voter.connect(voter4).vote(pollName, 1)).to.be.revertedWith("The poll is closed");
  
    // check that winner is Astana with 2 votes.
    const v = await voter.pollWinner(pollName);

    const candidates = await voter.getPollCandidates(pollName);
    console.log(candidates);
  });
  
  it("Only admin can create the poll", async function(){
    const[admin, voter1, voter2, voter3, voter4, candWallet1, candWallet2, pollWallet] = await ethers.getSigners();

    const voting = await ethers.getContractFactory("Voting");
    const voter = await voting.deploy();
    
    await expect(voter.connect(voter2).createPoll("cities", ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]))
      .to.be.revertedWith("Only admin");
  });

  it("Trying to get winner commision when the poll is not closed", async function(){
    const[admin, voter1, voter2, voter3, voter4, candWallet1, candWallet2, pollWallet] = await ethers.getSigners();

    const voting = await ethers.getContractFactory("Voting");
    const voter = await voting.deploy();
    
    await voter.createPoll("cities", ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]);

    await expect(voter.getWinnerCommission("cities")).to.be.revertedWith("The poll is not closed")
  });

  it("Trying to get winner commission when the poll has not winnner", async function(){
    const[admin, voter1, voter2, voter3, voter4, candWallet1, candWallet2, pollWallet] = await ethers.getSigners();

    const voting = await ethers.getContractFactory("Voting");
    const voter = await voting.deploy();
    
    await voter.createPoll("cities", ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]);

    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (15 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 

    await voter.closePoll("cities");

    await expect(voter.getWinnerCommission("cities")).to.be.revertedWith("There is no winner in the poll");
    await expect(voter.sentWinnerCommission("cities")).to.be.revertedWith("There is no winner in the poll"); 
  });

  it("checking while voting", async function(){
    const[admin, voter1, voter2, voter3, voter4, candWallet1, candWallet2, dump] = await ethers.getSigners();
    
    // const randomWallet = await ethers.Wallet.createRandom();
    // const voter5 = await randomWallet.connect(await ethers.getDefaultProvider());
    // console.log('random wallet', await voter5.getBalance());

    // console.log(voter3.address);
       
    const voting = await ethers.getContractFactory("Voting");
    const voter = await voting.deploy();
    
    voter.addVoters([voter1.address, voter2.address]);

    await voter.createPoll("cities", ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]);

    voter.connect(voter1).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") });

    // only registered voters can vote.
    await expect(voter.connect(voter4).vote(pollName, 1)).to.be.revertedWith("only voters can vote");

    // can vote only once
    await expect(voter.connect(voter1).vote(pollName, 0)).to.be.revertedWith("voter can only vote once for a poll");

    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (25 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 

    // can only vote until poll end date
    await expect(voter.connect(voter2).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("can only vote until poll end date");
    
    await voter.closePoll("cities");
  });

  
});
