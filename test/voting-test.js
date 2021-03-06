const { expect } = require("chai");
const { ethers } = require("hardhat");


const CLOSED_NO_WINNER = 0;  
const CLOSED_HAS_WINNER = 1;
const OPENED = 2;
const VOTING = 3; 
const EQUAL_VOTE = 4;

const AddingVotersEvent = "AddingVotersEvent";
const PollCreatedEvent = "PollCreatedEvent";
const VoteEvent = "VoteEvent";
const Received = "Received";
const PollClosedEvent = "PollClosedEvent";
const OwnerWithdrawCommissionEvent = "OwnerWithdrawCommissionEvent";


describe("Voting", function () {
  let voterContract;
  let owner;
  let candidate1;
  let candidate2;
  let voter1;
  let voter2;
  let voter3;

  let printGas = false;
  let pollName = "cities";

  beforeEach(async function(){
    [owner, candidate1, candidate2, voter1, voter2, voter3] = await ethers.getSigners();

    const voting = await ethers.getContractFactory("Voting", owner);
    if(printGas){
      voterContract = new GasTracker(await voting.deploy(), { logAfterTx: true, });
    } else {
      voterContract = await voting.deploy();
    }
  });

  it("Should create a poll", async function(){  
    await expect(await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]))
      .to.emit(voterContract, PollCreatedEvent)
      .withArgs(pollName);
  })

  it("Should add Voters", async function(){
    // add voter
    await expect(await voterContract.addVoter(voter3.address)).to.emit(voterContract, AddingVotersEvent).withArgs(voter3.address);
    // add voters
    await expect(await voterContract.addVoters([voter1.address, voter2.address]))
      .to.emit(voterContract, AddingVotersEvent).withArgs(voter1.address)
      .and
      .to.emit(voterContract, AddingVotersEvent).withArgs(voter2.address);
  });

  

  it("Should vote successfully", async function(){
    // create a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);

    // vote 3 times
    await expect(voterContract.connect(voter1).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") }))
      .to.changeEtherBalance(voterContract, ethers.utils.parseEther("0.01"))
      .and
      .to.emit(voterContract, VoteEvent).withArgs(pollName, 0)
      .and
      .to.emit(voterContract, Received).withArgs(voterContract.address, ethers.utils.parseEther("0.01"));

    await expect(voterContract.connect(voter2).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") }))
      .to.changeEtherBalance(voterContract, ethers.utils.parseEther("0.01"))
      .and
      .to.emit(voterContract, VoteEvent).withArgs(pollName, 1);

    await expect(await voterContract.connect(voter3).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") }))
      .to.changeEtherBalance(voterContract, ethers.utils.parseEther("0.01"))
      .and
      .to.emit(voterContract, VoteEvent).withArgs(pollName, 1);
  });

  it("Should close poll", async function(){
    // create a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // shift the time
    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (4 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 
    // close poll (any voter can close poll after poll ends)
    await expect(await voterContract.connect(voter2).closePoll(pollName)).to.emit(voterContract, PollClosedEvent).withArgs(pollName, CLOSED_NO_WINNER);
    // check that voter can't vote after poll is closed.
    await expect(voterContract.connect(voter2).vote(pollName, 1)).to.be.revertedWith("The poll is closed");
  });
 
  it("Should allow only owner to create the poll", async function(){ 
    await expect(voterContract.connect(voter2).createPoll("cities", ["Astana", "Almaty"], [candidate1.address, candidate2.address])).to.be.revertedWith("Only owner");
  });

  it("Should allow owner to withdraw fee after poll is closed", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);
    // vote
    await voterContract.connect(voter1).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter2).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter3).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    // shift the time
    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (5 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 
    // close poll
    await expect(await voterContract.connect(voter2).closePoll(pollName))
      .to.emit(voterContract, PollClosedEvent).withArgs(pollName, CLOSED_HAS_WINNER)
      .and
      .to.changeEtherBalance(voterContract, ethers.utils.parseEther("-0.027"))
      .and
      .to.changeEtherBalance(candidate2, ethers.utils.parseEther("0.027"));  
    
    // claim as owner commission from poll
    await expect(await voterContract.connect(owner).withdrawPollCommission(pollName))
      .to.changeEtherBalance(owner, ethers.utils.parseEther("0.003"))
      .and
      .to.emit(voterContract, OwnerWithdrawCommissionEvent).withArgs(pollName, ethers.utils.parseEther("0.003"));
  });
  
  it("Should not allow to withdraw commission while the poll is not closed", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // trying to withdraw commission
    await expect(voterContract.connect(owner).withdrawPollCommission(pollName)).to.be.revertedWith("The poll is not closed yet");
  });

  it("Should allow to vote only once", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);
    // vote
    await voterContract.connect(voter1).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    // test
    await expect(voterContract.connect(voter1).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("voter can only vote once for a poll") 
  });

  it("Should return pollWinner Almaty", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);
    // vote
    await voterContract.connect(voter1).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter2).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter3).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    // shift the time
    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (10 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 
    // close poll
    await voterContract.connect(voter2).closePoll(pollName);
    // test
    await expect(await voterContract.pollWinner(pollName)).to.be.contains("Almaty");
  });

  it("Should return pollWinner Astana", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);
    // vote
    await voterContract.connect(voter1).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter2).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter3).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") });
    // shift the time
    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (14 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 
    // close poll
    await voterContract.connect(voter2).closePoll(pollName);
    // test
    await expect(await voterContract.pollWinner(pollName)).to.be.contains("Astana");
  });

  it("Should return error when called get pollWinner", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // test poll winner
    await expect(await voterContract.pollWinner(pollName)).to.be.contains("Error the poll is not closed")
  });

  it("Should return pollNames", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // test
    await expect(await voterContract.getPolls()).to.be.length(1).and.to.contain(pollName);
  });

  it("Should return balance", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);
    // vote
    await voterContract.connect(voter1).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    //test
    await expect(await voterContract.getBalance()).to.be.equal(ethers.utils.parseEther("0.01").toString());
  });

  it("Should be ok trying to close the poll twice", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);
    // vote
    await voterContract.connect(voter1).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter2).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter3).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    // shift the time
    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (17 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 
    // close poll
    await voterContract.connect(voter2).closePoll(pollName);
    // test close the poll twice
    await expect(voterContract.connect(voter3).closePoll(pollName)).to.be.revertedWith("Poll is closed");
  });

  it("Should return the poll candidates", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // get candidates
    const candidates = await voterContract.getPollCandidates(pollName);
    // test
    expect(candidates.map((i)=> i.name).join()).to.be.equal("Astana,Almaty");
  });

  it("Should revert withdraw with zero balance", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // shift the time
    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (23 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 
    // creat a poll
    await voterContract.closePoll(pollName);
    // trying to withdraw commission
    await expect(voterContract.connect(owner).withdrawPollCommission(pollName)).to.be.revertedWith("The poll balance is zero");
  });

  it("Should revert not enough funds to vote", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]); 
    // test
    await expect(voterContract.connect(voter1).vote(pollName, 1)).to.be.revertedWith("Not enough funds to vote");
  });

  it("Should vote only until the poll end date", async function(){
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // shift the time
    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (27 * 24 * 60 * 60 * 1000)]);
    await network.provider.send("evm_mine"); 
    // test
    await expect(voterContract.connect(voter1).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("can only vote until poll end date");
  });

  it("Should allow close poll after end date", async function() {
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // test
    await expect(voterContract.closePoll(pollName)).to.be.revertedWith("Can be closed only after poll end date");
  });

  it("Should not allow add voter for not owners", async function(){
    // add voters
    await expect(voterContract.connect(voter1).addVoter(voter1.address)).to.be.revertedWith("Only owner");
    await expect(voterContract.connect(voter1).addVoters([voter1.address, voter2.address, voter3.address])).to.be.revertedWith("Only owner");
  });

  it("Should only voters can vote", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // vote
    await expect(voterContract.connect(voter1).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("only voters can vote");
  });

});