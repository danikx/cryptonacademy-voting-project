//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

// ввывода коммиссии
// доп view функции для вывода информации о голосовании и участниках

contract Voting{
    
    // candidate
    struct Candidate {
        uint id;
        string name;
        uint votes;
        address payable wallet;
    }

    struct Poll {
        uint id;
        string name;

        Candidate[] candidates;
        mapping(uint => Candidate) cands;

        uint end;
        bool closed;
        address payable wallet;
    }

    // admin address
    address public admin;

    // map of polls
    mapping(uint => Poll) polls;

    // voters
    mapping(address => bool) public voters;
    // next id 
    uint nextPollId;
    // voter has link which poll it voted
    mapping(address => mapping(uint => bool)) votes;
    // 3 days
    uint offsetInDays = 3 * 24 * 60 * 60;
    uint amount = 10000000000000000 wei; // 0.01 eth
    uint amount2 = 10000000 gwei; // 0.01 eth
    
    constructor(){
        admin = msg.sender;
    }
    
    // create vote
    function createPoll(string memory name, string[] memory candidates, address payable[] calldata wlts) public onlyAdmin {
        polls[nextPollId].id = nextPollId;
        polls[nextPollId].name = name;
        polls[nextPollId].end = block.timestamp + offsetInDays;

        for(uint i = 0; i < candidates.length; i++){
            polls[nextPollId].candidates.push(Candidate(i, candidates[i], 0, wlts[i]));
        }

        nextPollId++;
    }
    
    // add voter
    function addVoter(address payable voter) external onlyAdmin(){
        voters[voter] = true;
    }

    // add collection of voters
    function addVoters(address[] calldata _voters) external onlyAdmin() {
        for(uint i = 0; i < _voters.length; i++) {
            voters[_voters[i]] = true;
            // addVoter(_voters[i]);
        }
    }

    // участия в голосованииs
    function vote(uint pollId, uint choiceId) external {
        
        require(voters[msg.sender] == true, "only voters can vote");
        require(votes[msg.sender][pollId] == false, "voter can only vote once for a poll");
        require(polls[pollId].end > block.timestamp, 'can only vote until poll end date');
        require(polls[pollId].closed == false, 'poll is closed');
        // 0.01 ETH
        require(msg.sender.balance >= 100, 'to vote need 0.01 ETH');
        // require(msg.sender.send());
        //
        votes[msg.sender][pollId] = true;

        // msg.sender.balance.send(100);
        polls[pollId].wallet.transfer(100);
        
        polls[pollId].candidates[choiceId].votes++;

    }

    function closePoll(uint pollId) external onlyAdmin() {
        polls[pollId].closed = true;
    }


    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }
}
