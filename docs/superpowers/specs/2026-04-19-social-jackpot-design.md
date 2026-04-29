# Feature Design: Social Jackpot (Gamified Voting Pools)

## Overview
The "Social Jackpot" feature introduces a gamified, community-driven pool system to the QIE Smart Router ecosystem. Any user can create a "Jackpot Room" specifying an entry fee, a required number of participants, and the number of winners. Participants deposit the entry fee and submit a short text/pitch. Once the room is full, a voting phase begins where participants vote for the best submissions (excluding themselves). The pot is split among the top-voted participants.

## Key Requirements
- **Room Creation:** Any user can create a Jackpot by specifying:
  1. `entryFee`: The amount of tokens (e.g., QUSDC) required to enter.
  2. `maxParticipants`: The total number of people needed to trigger the voting phase (e.g., 10).
  3. `numWinners`: The number of top-voted participants who will split the pot (e.g., 3).
- **Entering the Pool:** Users enter by paying the `entryFee` and submitting a `pitch` (a short string/text explaining why they should win or answering a prompt).
- **Voting Phase:**
  - Automatically begins when `maxParticipants` is reached.
  - Participants get 1 vote each.
  - Participants **cannot** vote for themselves.
- **Winner Resolution & Payout:**
  - After all votes are cast (or a timeout is reached, for simplicity we can require all participants to vote), the contract calculates the top `numWinners`.
  - The total pot (`entryFee * maxParticipants`) is split equally among the winners.
  - **Tie-Breaker:** If there is a tie for the final winning spots (e.g., 4 people tied for the top 3 spots), the pot designated for those spots is shared equally among all tied participants.

## Contract Design (`SocialJackpot.sol`)

### 1. Data Structures
```solidity
enum RoomState { Open, Voting, Closed }

struct Participant {
    address addr;
    string pitch;
    uint256 votesReceived;
    bool hasVoted;
}

struct Room {
    uint256 id;
    address creator;
    IERC20 token;
    uint256 entryFee;
    uint256 maxParticipants;
    uint256 numWinners;
    RoomState state;
    address[] participantAddresses;
    mapping(address => Participant) participants;
    uint256 totalVotesCast;
}
```

### 2. Core Functions
- `createRoom(address token, uint256 entryFee, uint256 maxParticipants, uint256 numWinners)`: Initializes a new Room.
- `enterRoom(uint256 roomId, string calldata pitch)`:
  - Pulls `entryFee` from the caller.
  - Stores their `pitch`.
  - If `participantAddresses.length == maxParticipants`, transitions state to `Voting`.
- `vote(uint256 roomId, address candidate)`:
  - Requires `state == Voting`.
  - Requires caller to be a participant.
  - Requires `!participant.hasVoted`.
  - Requires `candidate != msg.sender`.
  - Increments `candidate.votesReceived`.
  - If `totalVotesCast == maxParticipants`, automatically triggers the payout logic (or allows anyone to call `resolveRoom()`).
- `resolveRoom(uint256 roomId)`:
  - Sorts participants by `votesReceived`.
  - Identifies the top `numWinners`.
  - Handles ties by expanding the winner pool if necessary.
  - Distributes the locked tokens to the winners.
  - Transitions state to `Closed`.

## Integration with Smart Router
Users can use the funds accumulated in their Smart Router's `operatingCapital` or `treasuryShares` to fund their entries into these Jackpots, creating a highly engaging, full-circle DeFi experience on the QIE network.