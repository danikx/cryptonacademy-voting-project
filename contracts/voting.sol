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
        VOTING,

        // candidates has equal votes 
        EQUAL_VOTES
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
        uint winnerIndex;
        State state;
        uint totalFeeAmount;
    }
    
    // poll has been created event
    event PollCreatedEvent(string name);
    // poll has been closed
    event PollClosedEvent(string name, State state);
    // voter has been added
    event AddingVotersEvent(address voterAddress);
    // someone has voted to poll with candidate index
    event VoteEvent(string pollName, uint candidateIndex);
    //
    event Received(address sender, uint amount);
    //
    event OwnerWithdrawCommissionEvent(string pollName, uint commission);

    // owner address
    address owner;
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
    // array of poll names
    string[] pollNames;
    
    constructor(){
        owner = msg.sender;
    }
    
    // Create Poll
    // Can be called by owner of smart contract
    // Emits event PollCreatedEvent
    function createPoll(string memory pollName, string[] memory candidates, address payable[] calldata wlts) public onlyOwner {
        polls[pollName].name = pollName;
        polls[pollName].state = State.OPENED;
        polls[pollName].end = block.timestamp + offsetInDays;

        for(uint i = 0; i < candidates.length; i++){
            polls[pollName].candidates.push(Candidate(candidates[i], 0, wlts[i]));
        }

        pollNames.push(pollName);
        emit PollCreatedEvent(pollName);
    }

     // Close the poll.
     // Can be called by any user.
     // closes the poll with different state
     // State.CLOSED_NO_WINNER - closed with this state when no one voted.
     // State.CLOSED_HAS_WINNER - closes with this state when there is one winner.
     // State.EQUAL_VOTES -  closes with this state when candidates has equal votes.
     // Transfers money to winner (minus fee 10%) if state is CLOSED_HAS_WINNER.
     // Emits event PollClosedEvent if transaction is ok.
    function closePoll(string memory pollName) external payable {
        require(polls[pollName].end < block.timestamp, "Can be closed only after poll end date");
        require(polls[pollName].closed == false, "Poll is closed");
  
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
        
            Candidate memory winnerCandidate = polls[pollName].candidates[polls[pollName].winnerIndex];
            uint priceAmount = polls[pollName].totalFeeAmount - ( (polls[pollName].totalFeeAmount * 10) / 100); 
            winnerCandidate.wallet.transfer(priceAmount);
        }

        emit PollClosedEvent(pollName, polls[pollName].state);
    }

    // add voter
    function addVoter(address payable voter) external onlyOwner {
        voters[voter] = true;
        emit AddingVotersEvent(voter);
    }

    // add collection of voters
    function addVoters(address[] calldata _voters) external onlyOwner {
        for(uint i = 0; i < _voters.length; i++) {
            voters[_voters[i]] = true;
             emit AddingVotersEvent(_voters[i]);
        }
    }
 
    // Vote for poll using candidate index
    // Voter should call this method with value (fee) 0.01 ethers.
    // Emits event VoteEvent.
    function vote(string memory pollName, uint candidateIndex) public payable {
        require(polls[pollName].closed == false, 'The poll is closed');
        require(polls[pollName].end >= block.timestamp, "can only vote until poll end date");
        require(voters[msg.sender] == true, "only voters can vote");
        require(votes[msg.sender][pollName] == false, "voter can only vote once for a poll");
        require(msg.value >= fee, "Not enough funds to vote");
  
        // save flag that voter has voted for poll
        votes[msg.sender][pollName] = true; 
        
        // increment votes for candidate
        polls[pollName].candidates[candidateIndex].votes++;
        
        // update state that someone has voted
        polls[pollName].state = State.VOTING;

        // update total fee amount
        polls[pollName].totalFeeAmount += msg.value;
 
        // transfer fee to smart contract
        payable(address(this)).transfer(msg.value);
        
        emit VoteEvent(pollName, candidateIndex);
    }
 
    // Claim poll commission.
    // Can be called only by smart contract owner.
    // Emits event 'OwnerWithdrawCommissionEvent' with pollName and commission.
    function withdrawPollCommission(string memory pollName) public payable onlyOwner {
        require(polls[pollName].closed == true, "The poll is not closed yet");
        require(polls[pollName].totalFeeAmount > 0, "The poll balance is zero");
   
        uint commission = address(this).balance;
        payable(msg.sender).transfer(commission);
        emit OwnerWithdrawCommissionEvent(pollName, commission);
    }

    // returns smart contract balance.
    function getBalance() public view returns(uint balance) {
        return address(this).balance;
    }

    // [VIEW]
    function pollWinner(string memory pollName) external view returns(string memory candidateName, uint candidateVotes){ 
        if(polls[pollName].state == State.CLOSED_HAS_WINNER){
            Candidate memory winnerCandidate = polls[pollName].candidates[polls[pollName].winnerIndex]; 
            return (winnerCandidate.name, winnerCandidate.votes);
        }
        return ("Error the poll is not closed", 0);
    }

    // [VIEW] get poll names
    function getPolls() view external onlyOwner() returns(string[] memory) {
        return pollNames;
    }

    // [VIEW] 
    function getPollCandidates(string memory pollName) view external returns(Candidate[] memory){
        return polls[pollName].candidates;
    }
     
    // [MODIFIER]
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
         // Do not forget the "_;"! It will
        // be replaced by the actual function
        // body when the modifier is used.
        _;
    }

    receive() external payable {
        //todo console is breaks money transfering 
        //console.log("received tokens", msg.value);
        emit Received(msg.sender, msg.value);
    }
}