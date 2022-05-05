//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";

contract Voting {
    enum State{
        
        // the poll is closed but there is no winner
        CLOSED_NO_WINNER,
        
        // the poll is closed and there is a winner
        CLOSED_HAS_WINNER,
        
        // the poll has been created, but no one has voted
        OPENED,
        
        // someone has voted on poll
        VOTING
    }
    
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
        uint fee;
        uint winnerIndex;
        State state;
    }
    
    // poll has been created event
    event PollCreatedEvent(string name);
    // poll has been closed
    event PollClosedEvent(string name, State state);
    // voter has been added
    event AddingVotersEvent(address voterAddress);
    // someone has voted to poll with candidate index
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
    function createPoll(string memory pollName, string[] memory candidates, address payable[] calldata wlts) public onlyAdmin {
        console.log("creating poll:", pollName);

        polls[pollName].name = pollName;
        polls[pollName].state = State.OPENED;
        polls[pollName].end = block.timestamp + offsetInDays;

        for(uint i = 0; i < candidates.length; i++){
            polls[pollName].candidates.push(Candidate(candidates[i], 0, wlts[i]));
        }

        pollNames.push(pollName);
        emit PollCreatedEvent(pollName);
    }

     // close poll
    function closePoll(string memory pollName) external returns (State state) { 
        console.log("Closing poll:", pollName);

        require(polls[pollName].end < block.timestamp, 'Can be closed only after poll end date');
        
        // update closed
        polls[pollName].closed = true;
        
        if(polls[pollName].state == State.OPENED){
            polls[pollName].state = State.CLOSED_NO_WINNER;

        } else if(polls[pollName].state == State.VOTING){
            uint maxVotes = polls[pollName].candidates[0].votes;
            uint index = 0;

            for(uint i = 1; i < polls[pollName].candidates.length; i++){
                if(polls[pollName].candidates[i].votes > maxVotes){
                    index = i;
                    maxVotes = polls[pollName].candidates[i].votes;
                }
            }

            polls[pollName].winnerIndex = index;
            polls[pollName].state = State.CLOSED_HAS_WINNER;
        }

        emit PollClosedEvent(pollName, polls[pollName].state);
        
        return polls[pollName].state;
    }

    // add voter
    function addVoter(address payable voter) external onlyAdmin(){
        voters[voter] = true;
        emit AddingVotersEvent(voter);
    }

    // add collection of voters
    function addVoters(address[] calldata _voters) external onlyAdmin() {
        for(uint i = 0; i < _voters.length; i++) {
            voters[_voters[i]] = true;
             emit AddingVotersEvent(_voters[i]);
        }
    }

    // 
    function sentWinnerCommission(string memory pollName) external payable onlyAdmin(){
        require(polls[pollName].closed == true, "The poll is not closed");
        require(polls[pollName].state == State.CLOSED_HAS_WINNER, "There is no winner in the poll");
        
        Candidate memory winnerCandidate = polls[pollName].candidates[polls[pollName].winnerIndex];
        winnerCandidate.wallet.transfer(msg.value);
    }

    // vote for poll using candidate index
    function vote(string memory pollName, uint candidateIndex) public payable {
        console.log('Voting sender:', msg.sender, ' balance:',  msg.sender.balance);

        require(polls[pollName].closed == false, 'The poll is closed');
        require(polls[pollName].end > block.timestamp, "can only vote until poll end date");
        require(voters[msg.sender] == true, "only voters can vote");
        require(votes[msg.sender][pollName] == false, "voter can only vote once for a poll");
        require(msg.sender.balance >= fee, "Not enough funds to vote");
         
        console.log("sending, balance : ", msg.sender.balance);

        // polls[pollName].wallet.transfer(fee);
        admin.transfer(fee);

        polls[pollName].fee += fee; 
        // save flag that voter has voted for poll
        votes[msg.sender][pollName] = true; 
        // increment votes for candidate
        polls[pollName].candidates[candidateIndex].votes++;
        // update state that someone has voted
        polls[pollName].state = State.VOTING;

        emit VoteEvent(pollName, candidateIndex);
    }

    // [VIEW]
    function getWinnerCommission(string memory pollName) external view onlyAdmin() returns (uint amount) {
        require(polls[pollName].closed == true, "The poll is not closed");
        require(polls[pollName].state == State.CLOSED_HAS_WINNER, "There is no winner in the poll");

        uint fee10 = (10 * polls[pollName].fee) / 100;
        return  polls[pollName].fee - fee10;
    }

    // [VIEW]
    function pollWinner(string memory pollName) external view returns(string memory candidateName, uint candidateVotes){ 
        if(polls[pollName].state == State.CLOSED_HAS_WINNER){
            Candidate memory winnerCandidate = polls[pollName].candidates[polls[pollName].winnerIndex]; 
            return (winnerCandidate.name, winnerCandidate.votes);
        }
        return ("error", 0);
    }

    // [VIEW] get poll names
    function getPolls() view external onlyAdmin() returns(string[] memory) {
        return pollNames;
    }

    // [VIEW] 
    function getPollCandidates(string memory pollName) view external returns(Candidate[] memory){
        return polls[pollName].candidates;
    }
     
    // [MODIFIER]
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
         // Do not forget the "_;"! It will
        // be replaced by the actual function
        // body when the modifier is used.
        _;
    }
}