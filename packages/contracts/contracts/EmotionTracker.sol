// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title EmotionTracker
 * @dev Tracks NPC emotional states and player reputation on-chain for provenance
 */
contract EmotionTracker is Ownable, ReentrancyGuard {
    
    struct EmotionalState {
        uint8 happiness;
        uint8 anger;
        uint8 fear;
        uint8 trust;
        uint8 excitement;
        uint8 sadness;
        uint8 disgust;
        uint8 surprise;
    }
    
    struct MoodTransition {
        uint256 id;
        string npcId;
        EmotionalState fromState;
        EmotionalState toState;
        string trigger;
        address player;
        uint256 timestamp;
        uint8 intensity;
        string context;
    }
    
    struct PlayerReputation {
        int16 globalScore;      // -1000 to 1000
        uint16 interactions;
        uint8 trustworthiness;  // 0-100
        uint8 aggression;       // 0-100
        uint8 generosity;       // 0-100
        uint8 reliability;      // 0-100
        uint8 respect;          // 0-100
        uint256 lastUpdated;
    }
    
    // Mappings
    mapping(string => EmotionalState) public npcEmotionalStates;
    mapping(address => PlayerReputation) public playerReputations;
    mapping(string => mapping(address => int16)) public npcSpecificReputations; // npcId => player => score
    mapping(uint256 => MoodTransition) public moodTransitions;
    mapping(string => uint256[]) public npcMoodHistory; // npcId => transition IDs
    mapping(address => uint256[]) public playerMoodHistory; // player => transition IDs
    
    uint256 private _transitionIdCounter;
    
    // Events
    event EmotionalStateUpdated(
        string indexed npcId,
        EmotionalState newState,
        address indexed player,
        string trigger
    );
    
    event MoodTransitionRecorded(
        uint256 indexed transitionId,
        string indexed npcId,
        address indexed player,
        string trigger,
        uint8 intensity
    );
    
    event PlayerReputationUpdated(
        address indexed player,
        string indexed npcId,
        int16 globalChange,
        int16 npcSpecificScore
    );
    
    event SignificantMoodChange(
        string indexed npcId,
        address indexed player,
        string trigger,
        uint8 intensity,
        string context
    );
    
    constructor() {}
    
    /**
     * @dev Initialize emotional state for a new NPC
     */
    function initializeNPCEmotion(
        string memory npcId,
        EmotionalState memory initialState
    ) external onlyOwner {
        npcEmotionalStates[npcId] = initialState;
        
        emit EmotionalStateUpdated(npcId, initialState, address(0), "initialization");
    }
    
    /**
     * @dev Record a mood transition and update states
     */
    function recordMoodTransition(
        string memory npcId,
        EmotionalState memory newState,
        string memory trigger,
        address player,
        uint8 intensity,
        string memory context,
        int16 reputationChange
    ) external onlyOwner returns (uint256) {
        EmotionalState memory fromState = npcEmotionalStates[npcId];
        
        _transitionIdCounter++;
        uint256 transitionId = _transitionIdCounter;
        
        // Store the mood transition
        moodTransitions[transitionId] = MoodTransition({
            id: transitionId,
            npcId: npcId,
            fromState: fromState,
            toState: newState,
            trigger: trigger,
            player: player,
            timestamp: block.timestamp,
            intensity: intensity,
            context: context
        });
        
        // Update NPC emotional state
        npcEmotionalStates[npcId] = newState;
        
        // Add to history arrays
        npcMoodHistory[npcId].push(transitionId);
        if (player != address(0)) {
            playerMoodHistory[player].push(transitionId);
        }
        
        // Update player reputation if applicable
        if (player != address(0) && reputationChange != 0) {
            _updatePlayerReputation(player, npcId, reputationChange, intensity);
        }
        
        // Emit events
        emit MoodTransitionRecorded(transitionId, npcId, player, trigger, intensity);
        emit EmotionalStateUpdated(npcId, newState, player, trigger);
        
        // Emit significant mood change event for high-intensity transitions
        if (intensity > 50) {
            emit SignificantMoodChange(npcId, player, trigger, intensity, context);
        }
        
        return transitionId;
    }
    
    /**
     * @dev Update player reputation
     */
    function _updatePlayerReputation(
        address player,
        string memory npcId,
        int16 reputationChange,
        uint8 intensity
    ) internal {
        PlayerReputation storage reputation = playerReputations[player];
        
        // Update global score (clamped to -1000, 1000)
        int16 newGlobalScore = reputation.globalScore + reputationChange;
        if (newGlobalScore > 1000) newGlobalScore = 1000;
        if (newGlobalScore < -1000) newGlobalScore = -1000;
        reputation.globalScore = newGlobalScore;
        
        // Update NPC-specific score (clamped to -500, 500)
        int16 currentNPCScore = npcSpecificReputations[npcId][player];
        int16 newNPCScore = currentNPCScore + reputationChange;
        if (newNPCScore > 500) newNPCScore = 500;
        if (newNPCScore < -500) newNPCScore = -500;
        npcSpecificReputations[npcId][player] = newNPCScore;
        
        // Update traits based on interaction type
        uint8 traitDelta = uint8(intensity / 10); // Scale down the impact
        
        if (reputationChange > 0) {
            // Positive interaction
            reputation.trustworthiness = _clampAdd(reputation.trustworthiness, traitDelta);
            reputation.respect = _clampAdd(reputation.respect, traitDelta);
            reputation.reliability = _clampAdd(reputation.reliability, traitDelta / 2);
        } else {
            // Negative interaction
            reputation.trustworthiness = _clampSub(reputation.trustworthiness, traitDelta);
            reputation.aggression = _clampAdd(reputation.aggression, traitDelta);
            reputation.respect = _clampSub(reputation.respect, traitDelta);
        }
        
        reputation.interactions++;
        reputation.lastUpdated = block.timestamp;
        
        emit PlayerReputationUpdated(player, npcId, reputationChange, newNPCScore);
    }
    
    /**
     * @dev Helper function to add with clamping to 0-100
     */
    function _clampAdd(uint8 current, uint8 delta) internal pure returns (uint8) {
        uint16 result = uint16(current) + uint16(delta);
        return result > 100 ? 100 : uint8(result);
    }
    
    /**
     * @dev Helper function to subtract with clamping to 0-100
     */
    function _clampSub(uint8 current, uint8 delta) internal pure returns (uint8) {
        return current > delta ? current - delta : 0;
    }
    
    /**
     * @dev Get NPC's current emotional state
     */
    function getNPCEmotionalState(string memory npcId) 
        external 
        view 
        returns (EmotionalState memory) 
    {
        return npcEmotionalStates[npcId];
    }
    
    /**
     * @dev Get player's reputation
     */
    function getPlayerReputation(address player) 
        external 
        view 
        returns (PlayerReputation memory) 
    {
        return playerReputations[player];
    }
    
    /**
     * @dev Get NPC-specific reputation for a player
     */
    function getNPCSpecificReputation(string memory npcId, address player) 
        external 
        view 
        returns (int16) 
    {
        return npcSpecificReputations[npcId][player];
    }
    
    /**
     * @dev Get mood transition by ID
     */
    function getMoodTransition(uint256 transitionId) 
        external 
        view 
        returns (MoodTransition memory) 
    {
        return moodTransitions[transitionId];
    }
    
    /**
     * @dev Get NPC's mood history (last N transitions)
     */
    function getNPCMoodHistory(string memory npcId, uint256 limit) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] storage history = npcMoodHistory[npcId];
        uint256 length = history.length;
        
        if (limit == 0 || limit > length) {
            limit = length;
        }
        
        uint256[] memory result = new uint256[](limit);
        for (uint256 i = 0; i < limit; i++) {
            result[i] = history[length - limit + i];
        }
        
        return result;
    }
    
    /**
     * @dev Get player's mood interaction history
     */
    function getPlayerMoodHistory(address player, uint256 limit) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] storage history = playerMoodHistory[player];
        uint256 length = history.length;
        
        if (limit == 0 || limit > length) {
            limit = length;
        }
        
        uint256[] memory result = new uint256[](limit);
        for (uint256 i = 0; i < limit; i++) {
            result[i] = history[length - limit + i];
        }
        
        return result;
    }
    
    /**
     * @dev Get total number of mood transitions
     */
    function getTotalTransitions() external view returns (uint256) {
        return _transitionIdCounter;
    }
    
    /**
     * @dev Calculate emotional influence scores for decision making
     */
    function getEmotionalInfluence(string memory npcId) 
        external 
        view 
        returns (
            uint8 aggressiveness,
            uint8 trustfulness,
            uint8 helpfulness,
            uint8 riskTaking
        ) 
    {
        EmotionalState memory state = npcEmotionalStates[npcId];
        
        aggressiveness = (state.anger + (100 - state.fear)) / 2;
        trustfulness = (state.trust + state.happiness) / 2;
        helpfulness = (state.happiness + (100 - state.sadness)) / 2;
        riskTaking = (state.excitement + (100 - state.fear)) / 2;
    }
    
    /**
     * @dev Get emotional summary as dominant emotions
     */
    function getEmotionalSummary(string memory npcId) 
        external 
        view 
        returns (string memory) 
    {
        EmotionalState memory state = npcEmotionalStates[npcId];
        
        // Find dominant emotions (> 70)
        string memory summary = "";
        uint8 count = 0;
        
        if (state.happiness > 70) {
            summary = _appendEmotion(summary, "happy", count);
            count++;
        }
        if (state.anger > 70) {
            summary = _appendEmotion(summary, "angry", count);
            count++;
        }
        if (state.fear > 70) {
            summary = _appendEmotion(summary, "fearful", count);
            count++;
        }
        if (state.trust > 70) {
            summary = _appendEmotion(summary, "trusting", count);
            count++;
        }
        if (state.excitement > 70) {
            summary = _appendEmotion(summary, "excited", count);
            count++;
        }
        if (state.sadness > 70) {
            summary = _appendEmotion(summary, "sad", count);
            count++;
        }
        
        return count == 0 ? "balanced" : summary;
    }
    
    /**
     * @dev Helper function to append emotions to summary string
     */
    function _appendEmotion(string memory current, string memory emotion, uint8 count) 
        internal 
        pure 
        returns (string memory) 
    {
        if (count == 0) {
            return emotion;
        } else if (count == 1) {
            return string(abi.encodePacked(current, " and ", emotion));
        } else {
            return string(abi.encodePacked(current, ", ", emotion));
        }
    }
}