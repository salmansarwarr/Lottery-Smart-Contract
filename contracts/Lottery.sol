// Winner to be selected every X minutes
// Chainlink oracle -> Randomness, Automated execution (Chainlink keepers)

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
// AutomationCompatible.sol imports the functions from both ./AutomationBase.sol and
// ./interfaces/AutomationCompatibleInterface.sol
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";


error Lottery__notEnoughEthEntered();
error Lottery__transferFailed();
error Lottery__NotOpen();
error Lottery__UpKeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 lotteryState
);

/**
 * @title A sample Lottery Contract
 * @author Salman Sarwar
 * @notice This contract is for creating an untemperable decentralized smart contract
 * @dev This implements Chainlink VRF v2 and Chainlink keepers
 */
contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface {
    // Types
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    // State Variable
    uint256 private immutable i_entryFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callBackgasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    //Lottery Variables
    address private s_recentWinner;
    LotteryState private s_lotteryState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    // Events
    event LotteryEnter(address indexed player);
    event RequestedLotteryWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    // Functions
    constructor(
        address vrfCoordinatorV2,
        uint entryFee,
        bytes32 keyHash,
        uint64 subscriptionId,
        uint32 callBackgasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entryFee = entryFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_keyHash = keyHash;
        i_subscriptionId = subscriptionId;
        i_callBackgasLimit = callBackgasLimit;
        s_lotteryState = LotteryState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterLottery() public payable {
        if (s_lotteryState != LotteryState.OPEN) {
            revert Lottery__NotOpen();
        }
        if (msg.value < i_entryFee) {
            revert Lottery__notEnoughEthEntered();
        }
        s_players.push(payable(msg.sender));
        emit LotteryEnter(msg.sender);
    }

    /**
     * @dev this is the function that the chainlink keeper nodes call
     * they need the `upkeepNeeded` to return true.
     * The following should be true in order to return true
     * 1. Time interval should have passed
     * 2. Lottery should have atleast one player, and have some ETH.
     * 3. Our subscription is funded with LINK
     * 4. Lottery should be in "open" state
     */
    function checkUpkeep(
        bytes memory /*performdata*/
    )
        public
        override
        returns (bool upKeepNeeded, bytes memory /*performData*/)
    {
        bool isOpen = (LotteryState.OPEN == s_lotteryState);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = (address(this).balance > 0);
        upKeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    function performUpkeep(bytes calldata /*performdata*/) external override {
        (bool upKeepNeeded, ) = checkUpkeep("");
        if (!upKeepNeeded) {
            revert Lottery__UpKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_lotteryState)
            );
        }
        s_lotteryState = LotteryState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callBackgasLimit,
            NUM_WORDS
        );
        emit RequestedLotteryWinner(requestId);
    }

    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_lotteryState = LotteryState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Lottery__transferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    // View / Pure functions
    function getEntryFee() public view returns (uint256) {
        return i_entryFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getLotteryState() public view returns(LotteryState) {
        return s_lotteryState;
    }

    function getNumWords() public pure returns(uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns(uint256) {
        return s_players.length;    
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
