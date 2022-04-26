//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";

// доп view функции для вывода информации о голосовании и участниках

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
        address payable wallet;
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
        console.log('admin address:', admin,'owner balance:', admin.balance); 
    }
    
    // create Poll
    function createPoll(string memory name, address payable pollWallet, string[] memory candidates, address payable[] calldata wlts) public onlyAdmin {
        console.log("name", name, "balance", pollWallet.balance);

        polls[name].name = name;
        polls[name].wallet = pollWallet;
        polls[name].end = block.timestamp + offsetInDays;

        for(uint i = 0; i < candidates.length; i++){
            polls[name].candidates.push(Candidate(candidates[i], 0, wlts[i]));
        }

        pollNames.push(name);
        emit PollCreatedEvent(name);
    }

     // close poll
    function closePoll(string memory pollName) external payable onlyAdmin() {
        console.log();
        console.log("closing poll");

        polls[pollName].closed = true;
 
        Candidate memory winnerCandidate = polls[pollName].candidates[0];

        // find winer 
        for(uint i = 1; i < polls[pollName].candidates.length; i++){
            if(polls[pollName].candidates[i].votes > winnerCandidate.votes){
                winnerCandidate = polls[pollName].candidates[i];
            }
        }

        //todo what if there is no one voted?

        string memory winner = winnerCandidate.name;
        console.log('winner', winner);
        
        console.log('poll ', pollName, 'balance is', polls[pollName].wallet.balance);

        // send money to winner minus 10%
        uint fee10 = (10 * polls[pollName].wallet.balance) / 100;
        console.log('fee10', fee10);
        
        uint amount = polls[pollName].wallet.balance - fee10;
        console.log('amount', amount, 'msgSender', msg.sender);
        
        console.log('transfer from', msg.sender, 'to', winnerCandidate.wallet);
        // 
        winnerCandidate.wallet.transfer(amount); 
        // console.log('send ', winnerCandidate.name, ' amount ', balance);

        // send 10% to platform
        // admin.transfer(fee10); 

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

    // get poll names
    function getPolls() view external onlyAdmin() returns(string[] memory) {
        return pollNames;
    }
  
    // vote
    function vote(string memory pollName, uint candidateIndex) public payable{
        console.log('\nvoting', msg.sender);

        require(voters[msg.sender] == true, "only voters can vote");
        require(votes[msg.sender][pollName] == false, "voter can only vote once for a poll");
        require(polls[pollName].end > block.timestamp, 'can only vote until poll end date');
        require(polls[pollName].closed == false, 'poll is closed');
        // Check whether the voter has the necessary funds to pay the fee
        require(msg.sender.balance >= fee, 'Not enough funds to vote');
        // transfer commission to platform
        // require(polls[pollName].wallet.send(fee), 'Could not pay fee');

        console.log('msg sender value', msg.value );
        console.log('msg sender balance', msg.sender.balance, 'fee', fee);
        console.log('transfer from', msg.sender, ' to', polls[pollName].wallet);

        // polls[pollName].wallet.transfer(fee);
        admin.transfer(fee);

        // (bool success, ) = polls[pollName].wallet.call{value: fee}("");
        // require(success, "Failed to send Ether");

        // save flag that voter has voted for poll
        votes[msg.sender][pollName] = true;

        // increment votes for candidate
        polls[pollName].candidates[candidateIndex].votes++;

        emit VoteEvent(pollName, candidateIndex);
    }
  
    // ввывода коммиссии
    function getCommission() public view onlyAdmin() returns(uint) {
        return admin.balance;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
         // Do not forget the "_;"! It will
        // be replaced by the actual function
        // body when the modifier is used.
        _;
    }
}
