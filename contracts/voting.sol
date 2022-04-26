//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";

contract Voting {
    
    // candidate
    struct Candidate {
        string name;
        uint votes;
        address payable wallet;
    }

    struct Poll {
        string name; 
        Candidate[] candidates;
        uint end;
        bool closed;
        address payable wallet2;
        uint fee;
    }
    
    // 
    event PollCreatedEvent(string name);
    event PollClosedEvent(string name);
    event AddingVotersEvent(address voterAddress);
    event VoteEvent(string pollName, uint candidateIndex);

    // admin address
    address payable public admin;
    // address payable platform;
    // map of polls [poll name -> poll struct]
    mapping(string => Poll) polls;
    // voters [voter address -> sign the voter voted]
    mapping(address => bool) public voters;
    // voter has link which poll it voted
    mapping(address => mapping(string => bool)) votes;
    // 3 days
    uint offsetInDays = 3 days;
    // commission fee
    uint256 fee = 0.01 ether; // fee

    string[] pollNames;
    
    constructor(){
        admin = payable(msg.sender);
        console.log('admin address:', admin, 'owner balance:', admin.balance); 
    }
    
    // create Poll
    function createPoll(string memory name, address payable pollWallet, string[] memory candidates, address payable[] calldata wlts) public onlyAdmin {
        console.log("name", name, "balance", pollWallet.balance);

        polls[name].name = name;
        // polls[name].wallet = pollWallet;
        polls[name].end = block.timestamp + offsetInDays;

        for(uint i = 0; i < candidates.length; i++){
            polls[name].candidates.push(Candidate(candidates[i], 0, wlts[i]));
        }

        pollNames.push(name);
        emit PollCreatedEvent(name);
    }

     // close poll
    function closePoll(string memory pollName) external { 
        console.log("Closing poll:", polls[pollName].end,  'vs ', block.timestamp);
        require(polls[pollName].end < block.timestamp, 'can be closed after poll end date');

        console.log("Closing poll:", pollName);
        polls[pollName].closed = true; 
        emit PollClosedEvent(pollName);
    }

    // add voter
    function addVoter(address payable voter) external onlyAdmin(){
        voters[voter] = true;
    }

    // add collection of voters
    function addVoters(address[] calldata _voters) external onlyAdmin() {
        for(uint i = 0; i < _voters.length; i++) {
            voters[_voters[i]] = true;
             emit AddingVotersEvent(_voters[i]);
        }
    }

    function pollWinner(string memory pollName) external view returns(string memory candidateName, uint candidateVotes) {
        //require(polls[pollName].end < block.timestamp, 'can be closed after poll end date');
        require(polls[pollName].closed == true, "Poll is not closed");

        Candidate memory winnerCandidate = polls[pollName].candidates[0];

        // find winer 
        for(uint i = 1; i < polls[pollName].candidates.length; i++){
            if(polls[pollName].candidates[i].votes > winnerCandidate.votes){
                winnerCandidate = polls[pollName].candidates[i];
            }
        }

        return (winnerCandidate.name, winnerCandidate.votes);
    }

    function sentWinnerCommission(string memory pollName) external payable onlyAdmin(){
        require(polls[pollName].closed == true, "Poll is not closed");
        
        Candidate memory winnerCandidate = polls[pollName].candidates[0];

        // find winer 
        for(uint i = 1; i < polls[pollName].candidates.length; i++){
            if(polls[pollName].candidates[i].votes > winnerCandidate.votes){
                winnerCandidate = polls[pollName].candidates[i];
            }
        }

        winnerCandidate.wallet.transfer(msg.value);
    }

    function getWinnerCommission(string memory pollName) external view onlyAdmin() returns (uint amount) {
        Candidate memory winnerCandidate = polls[pollName].candidates[0];

        // find winer 
        for(uint i = 1; i < polls[pollName].candidates.length; i++){
            if(polls[pollName].candidates[i].votes > winnerCandidate.votes){
                winnerCandidate = polls[pollName].candidates[i];
            }
        }

        //todo what if there is no one voted? 
        

        uint fee10 = (10 * polls[pollName].fee) / 100;
        return  polls[pollName].fee - fee10;
    }
 
    // how to send money
    //
    // // (bool success, ) = polls[pollName].wallet.call{value: fee}("");
    // require(success, "Failed to send Ether");
    //
    //
    //


    // vote
    function vote(string memory pollName, uint candidateIndex) public payable {
        console.log('Voting', msg.sender);

        require(voters[msg.sender] == true, "only voters can vote");
        require(votes[msg.sender][pollName] == false, "voter can only vote once for a poll");
        require(polls[pollName].closed == false, 'poll is closed');
        require(polls[pollName].end > block.timestamp, 'can only vote until poll end date');
        // Check whether the voter has the necessary funds to pay the fee
        require(msg.sender.balance >= fee, 'Not enough funds to vote');
         
        // polls[pollName].wallet.transfer(fee);
        admin.transfer(fee);

        polls[pollName].fee += fee;

        console.log("poll balance fee", polls[pollName].fee);

        // save flag that voter has voted for poll
        votes[msg.sender][pollName] = true;

        // increment votes for candidate
        polls[pollName].candidates[candidateIndex].votes++;

        emit VoteEvent(pollName, candidateIndex);
    }
  
    // view functions
    
     // get poll names
    function getPolls() view external onlyAdmin() returns(string[] memory) {
        return pollNames;
    }
     
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
         // Do not forget the "_;"! It will
        // be replaced by the actual function
        // body when the modifier is used.
        _;
    }
}
