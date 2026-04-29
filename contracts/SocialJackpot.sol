// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SocialJackpot {
    using SafeERC20 for IERC20;

    uint256 public constant PLATFORM_FEE_BPS = 200;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    enum RoomState { Open, Voting, Closed }

    struct Participant {
        address addr;
        string pitch;
        uint256 votesReceived;
        bool hasVoted;
        bool exists;
    }

    struct RoomInfo {
        uint256 id;
        address creator;
        IERC20 token;
        uint256 entryFee;
        uint256 maxParticipants;
        uint256 numWinners;
        RoomState state;
        uint256 totalVotesCast;
    }

    uint256 public nextRoomId;
    address public immutable feeRecipient;

    mapping(uint256 => RoomInfo) public rooms;
    mapping(uint256 => address[]) public roomParticipants;
    // roomId => participantAddress => Participant
    mapping(uint256 => mapping(address => Participant)) public participants;

    event RoomCreated(uint256 indexed roomId, address indexed creator, address token, uint256 entryFee, uint256 maxParticipants, uint256 numWinners);
    event UserEntered(uint256 indexed roomId, address indexed user, string pitch);
    event VotingStarted(uint256 indexed roomId);
    event Voted(uint256 indexed roomId, address indexed voter, address indexed candidate);
    event RoomResolved(uint256 indexed roomId, address[] winners, uint256 payoutPerWinner);
    event PlatformFeePaid(uint256 indexed roomId, address indexed recipient, uint256 amount);

    error InvalidRoomParams();
    error InvalidFeeRecipient();
    error InvalidState();
    error AlreadyEntered();
    error RoomFull();
    error NotAParticipant();
    error AlreadyVoted();
    error CannotVoteForSelf();
    error InvalidCandidate();
    error TransferFailed();

    constructor(address _feeRecipient) {
        if (_feeRecipient == address(0)) revert InvalidFeeRecipient();
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Create a new Jackpot Room.
     */
    function createRoom(
        address _token,
        uint256 _entryFee,
        uint256 _maxParticipants,
        uint256 _numWinners
    ) external returns (uint256) {
        if (_token == address(0)) revert InvalidRoomParams();
        if (_entryFee == 0) revert InvalidRoomParams();
        if (_maxParticipants < 2 || _numWinners == 0 || _numWinners >= _maxParticipants) revert InvalidRoomParams();

        uint256 roomId = nextRoomId++;

        rooms[roomId] = RoomInfo({
            id: roomId,
            creator: msg.sender,
            token: IERC20(_token),
            entryFee: _entryFee,
            maxParticipants: _maxParticipants,
            numWinners: _numWinners,
            state: RoomState.Open,
            totalVotesCast: 0
        });

        emit RoomCreated(roomId, msg.sender, _token, _entryFee, _maxParticipants, _numWinners);
        return roomId;
    }

    /**
     * @dev Enter an open room by paying the entry fee and submitting a pitch.
     */
    function enterRoom(uint256 roomId, string calldata pitch) external {
        RoomInfo storage room = rooms[roomId];
        if (room.state != RoomState.Open) revert InvalidState();
        if (participants[roomId][msg.sender].exists) revert AlreadyEntered();

        room.token.safeTransferFrom(msg.sender, address(this), room.entryFee);

        participants[roomId][msg.sender] = Participant({
            addr: msg.sender,
            pitch: pitch,
            votesReceived: 0,
            hasVoted: false,
            exists: true
        });

        roomParticipants[roomId].push(msg.sender);

        emit UserEntered(roomId, msg.sender, pitch);

        // Auto-transition to Voting if full
        if (roomParticipants[roomId].length == room.maxParticipants) {
            room.state = RoomState.Voting;
            emit VotingStarted(roomId);
        }
    }

    /**
     * @dev Vote for a candidate during the Voting phase.
     */
    function vote(uint256 roomId, address candidate) external {
        RoomInfo storage room = rooms[roomId];
        if (room.state != RoomState.Voting) revert InvalidState();
        
        Participant storage voter = participants[roomId][msg.sender];
        if (!voter.exists) revert NotAParticipant();
        if (voter.hasVoted) revert AlreadyVoted();
        if (candidate == msg.sender) revert CannotVoteForSelf();

        Participant storage target = participants[roomId][candidate];
        if (!target.exists) revert InvalidCandidate();

        voter.hasVoted = true;
        target.votesReceived += 1;
        room.totalVotesCast += 1;

        emit Voted(roomId, msg.sender, candidate);

        // Auto-resolve if everyone has voted
        if (room.totalVotesCast == room.maxParticipants) {
            _resolveRoom(roomId);
        }
    }

    /**
     * @dev Internal logic to calculate winners and distribute the pot.
     * Tied candidates for the lowest winning spot are grouped together, 
     * which may expand the total number of winners splitting the pot.
     */
    function _resolveRoom(uint256 roomId) internal {
        RoomInfo storage room = rooms[roomId];
        room.state = RoomState.Closed;

        address[] memory sorted = _sortedParticipantsByVotes(roomId);
        uint256 actualWinnerCount = _countWinners(roomId, sorted, room.numWinners);

        address[] memory finalWinners = new address[](actualWinnerCount);
        uint256 pot = room.entryFee * room.maxParticipants;
        uint256 platformFee = (pot * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 prizePot = pot - platformFee;
        uint256 payoutPerWinner = prizePot / actualWinnerCount;
        uint256 dust = prizePot - (payoutPerWinner * actualWinnerCount);

        _payPlatformFee(roomId, room.token, platformFee);
        _payWinners(room.token, sorted, finalWinners, payoutPerWinner, dust);

        emit RoomResolved(roomId, finalWinners, payoutPerWinner);
    }

    function _sortedParticipantsByVotes(uint256 roomId) internal view returns (address[] memory) {
        address[] memory pList = roomParticipants[roomId];
        uint256 n = pList.length;

        // In-memory array to sort participants by votes
        address[] memory sorted = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            sorted[i] = pList[i];
        }

        // Bubble sort (safe for small maxParticipants like 10-50)
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (participants[roomId][sorted[j]].votesReceived < participants[roomId][sorted[j + 1]].votesReceived) {
                    address temp = sorted[j];
                    sorted[j] = sorted[j + 1];
                    sorted[j + 1] = temp;
                }
            }
        }

        return sorted;
    }

    function _countWinners(
        uint256 roomId,
        address[] memory sorted,
        uint256 numWinners
    ) internal view returns (uint256) {
        uint256 n = sorted.length;
        // Determine the vote threshold for the lowest winning spot
        uint256 thresholdVotes = participants[roomId][sorted[numWinners - 1]].votesReceived;

        // Find all participants who meet or exceed the threshold
        uint256 actualWinnerCount = 0;
        for (uint256 i = 0; i < n; i++) {
            if (participants[roomId][sorted[i]].votesReceived >= thresholdVotes && participants[roomId][sorted[i]].votesReceived > 0) {
                actualWinnerCount++;
            }
        }

        // If no one got any votes (edge case), just return everyone's money (everyone is a "winner" of their own entry fee)
        if (actualWinnerCount == 0) {
            actualWinnerCount = n;
        }

        return actualWinnerCount;
    }

    function _payPlatformFee(uint256 roomId, IERC20 token, uint256 platformFee) internal {
        if (platformFee > 0) {
            token.safeTransfer(feeRecipient, platformFee);
            emit PlatformFeePaid(roomId, feeRecipient, platformFee);
        }
    }

    function _payWinners(
        IERC20 token,
        address[] memory sorted,
        address[] memory finalWinners,
        uint256 payoutPerWinner,
        uint256 dust
    ) internal {
        for (uint256 i = 0; i < finalWinners.length; i++) {
            finalWinners[i] = sorted[i];
            // Give dust to the first winner (highest votes)
            uint256 payout = (i == 0) ? payoutPerWinner + dust : payoutPerWinner;
            token.safeTransfer(finalWinners[i], payout);
        }
    }

    /**
     * @dev View function to get a participant's info.
     */
    function getParticipantInfo(uint256 roomId, address user) external view returns (string memory pitch, uint256 votesReceived, bool hasVoted) {
        Participant memory p = participants[roomId][user];
        return (p.pitch, p.votesReceived, p.hasVoted);
    }
}
