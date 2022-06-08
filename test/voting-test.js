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

  beforeEach(async function(){
    [owner, candidate1, candidate2, voter1, voter2, voter3] = await ethers.getSigners();

    const voting = await ethers.getContractFactory("Voting", owner);
    voterContract = await voting.deploy();
    // voterContract = new GasTracker(await voting.deploy(), { logAfterTx: true, });
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


  // console.log("last balance", await owner.getBalance());
    // console.log("last balance contract", await voterContract.getBalance());
    
    // const ownerBalanceAfter = await owner.getBalance();

    // console.log("owner balance before", ownerBalanceBefor.toString());
    // console.log("owner balance after ", ownerBalanceAfter.toString());

    // const balance = await candidate2.getBalance();
    // console.log(balance.toString());
   
  // it("Trying to get winner commision when the poll is not closed", async function(){
  //   await voter.createPoll("cities", ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]);
  //   await expect(voter.getWinnerCommission("cities")).to.be.revertedWith("The poll is not closed")
  // });

  // it("Trying to get winner commission when the poll has not winnner", async function(){  
  //   await voter.createPoll("cities", ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]);
  //   await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (15 * 24 * 60 * 60 * 1000)])
  //   await network.provider.send("evm_mine") 
  //   await voter.closePoll("cities");
  //   await expect(voter.getWinnerCommission("cities")).to.be.revertedWith("There is no winner in the poll");
  //   await expect(voter.sentWinnerCommission("cities")).to.be.revertedWith("There is no winner in the poll"); 
  // });

  // it("checking while voting", async function(){  
  //   // const randomWallet = await ethers.Wallet.createRandom();
  //   // const voter5 = await randomWallet.connect(await ethers.getDefaultProvider());
  //   // console.log('random wallet', await voter5.getBalance());       
  //   const voting = await ethers.getContractFactory("Voting");
  //   const voter = await voting.deploy();
    
  //   voter.addVoters([voter1.address, voter2.address]);

  //   await voter.createPoll("cities", ["Astana", "Almaty"], [candWallet1.address, candWallet2.address]);

  //   voter.connect(voter1).vote(pollName, 0, { value: ethers.utils.parseEther("0.01") });

  //   // only registered voters can vote.
  //   await expect(voter.connect(voter4).vote(pollName, 1)).to.be.revertedWith("only voters can vote");

  //   // can vote only once
  //   await expect(voter.connect(voter1).vote(pollName, 0)).to.be.revertedWith("voter can only vote once for a poll");

  //   await network.provider.send("evm_setNextBlockTimestamp", [Date.now() + (25 * 24 * 60 * 60 * 1000)])
  //   await network.provider.send("evm_mine") 

  //   // can only vote until poll end date
  //   await expect(voter.connect(voter2).vote(pollName, 1, { value: ethers.utils.parseEther("0.01") })).to.be.revertedWith("can only vote until poll end date");
    
  //   await voter.closePoll("cities");
  // });

  
});
