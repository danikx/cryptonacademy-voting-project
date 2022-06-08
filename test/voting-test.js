const { expect } = require("chai");
const { ethers } = require("hardhat");

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
    pollName = "cities";

    await expect(await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]))
      .to.emit(voterContract, "PollCreatedEvent")
      .withArgs(pollName);
  })

  it("Should add Voters", async function(){
    // add voter
    await expect(await voterContract.addVoter(voter3.address)).to.emit(voterContract, "AddingVotersEvent").withArgs(voter3.address);
    // add voters
    await expect(await voterContract.addVoters([voter1.address, voter2.address]))
      .to.emit(voterContract, "AddingVotersEvent").withArgs(voter1.address)
      .and
      .to.emit(voterContract, "AddingVotersEvent").withArgs(voter2.address);
  });

  it("Should vote successfully", async function(){
    pollName = "cities";
    // create a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);

    // vote 3 times
    await expect(voterContract.connect(voter1).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") }))
      .to.changeEtherBalance(voterContract, ethers.utils.parseEther("0.01"))
      .and
      .to.emit(voterContract, "VoteEvent").withArgs(pollName, 0)
      .and
      .to.emit(voterContract, "Received").withArgs(voterContract.address, ethers.utils.parseEther("0.01"));

    await expect(voterContract.connect(voter2).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") }))
      .to.changeEtherBalance(voterContract, ethers.utils.parseEther("0.01"))
      .and
      .to.emit(voterContract, "VoteEvent").withArgs(pollName, 1);

    await expect(await voterContract.connect(voter3).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") }))
      .to.changeEtherBalance(voterContract, ethers.utils.parseEther("0.01"))
      .and
      .to.emit(voterContract, "VoteEvent").withArgs(pollName, 1);
  });

  it("Should close poll", async function(){
    // create a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // shift time
    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (4 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 
    // close poll (any voter can close poll after poll ends)
    await expect(await voterContract.connect(voter2).closePoll(pollName)).to.emit(voterContract, "PollClosedEvent").withArgs(pollName, 0); // 0 is index of CLOSED_NO_WINNER
    // check that voter can't vote after poll is closed.
    await expect(voterContract.connect(voter2).vote(pollName, 1)).to.be.revertedWith("The poll is closed");
  });
 
  it("Only owner can create the poll", async function(){ 
    await expect(voterContract.connect(voter2).createPoll("cities", ["Astana", "Almaty"], [candidate1.address, candidate2.address])).to.be.revertedWith("Only owner");
  });

  it("Owner can withdraw fee after poll is closed", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);
    // vote
    await voterContract.connect(voter1).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter2).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter3).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    // shift time
    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (5 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 
    // close poll
    await expect(await voterContract.connect(voter2).closePoll(pollName))
      .to.changeEtherBalance(voterContract, ethers.utils.parseEther("-0.027"))
      .and
      .to.changeEtherBalance(candidate2, ethers.utils.parseEther("0.027"));  
    
    // claim as owner commission from poll
    await expect(await voterContract.connect(owner).withdrawPollCommission(pollName))
      .to.changeEtherBalance(owner, ethers.utils.parseEther("0.003"))
      .and
      .to.emit(voterContract, "OwnerWithdrawCommissionEvent").withArgs(pollName, ethers.utils.parseEther("0.003"));
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

  it("Should return pollWinner", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);
    // vote
    await voterContract.connect(voter1).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter2).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter3).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    // shift time
    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (10 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 
    // close poll
    await voterContract.connect(voter2).closePoll(pollName);
    // test
    await expect(await voterContract.pollWinner(pollName)).to.be.contains("Almaty");
  });

  it("Should return error when called get pollWinner", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // test poll winner
    await expect(await voterContract.pollWinner(pollName)).to.be.contains("Error the poll is not closed")
  });

  it("Should return poll Candidates", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);

    //todo
    // await expect(voterContract.getPollCandidates(pollName))
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

  it("should be ok trying to close the poll twice", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // add voters
    await voterContract.addVoters([voter1.address, voter2.address, voter3.address]);
    // vote
    await voterContract.connect(voter1).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter2).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") });
    await voterContract.connect(voter3).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") });
    // shift time
    await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (17 * 24 * 60 * 60 * 1000)])
    await network.provider.send("evm_mine") 
    // close poll
    await voterContract.connect(voter2).closePoll(pollName);
    // test close the poll twice
    await expect(voterContract.connect(voter3).closePoll(pollName)).to.be.revertedWith("Poll is closed");
  });

  it("should return the poll candidates", async function(){
    // creat a poll
    await voterContract.createPoll(pollName, ["Astana", "Almaty"], [candidate1.address, candidate2.address]);
    // get candidates
    const candidates = await voterContract.getPollCandidates(pollName);
    // test
    expect(candidates.map((i)=> i.name).join()).to.be.equal("Astana,Almaty");
  })
});
