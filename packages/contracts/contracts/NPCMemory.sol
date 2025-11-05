// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./NPCRegistry.sol";

/**
 * @title NPCMemory
 * @dev Persistent memory storage for NPC agents with personality traits and interaction history
 */
contract NPCMemory is Ownable {
    NPCRegistry public npcRegistry;

    // Personality trait categories
    enum PersonalityTrait { 
        FRIENDLY, GRUMPY, GREEDY, CAUTIOUS, AGGRESSIVE, 
        LOYAL, CUNNING, HONEST, MYSTERIOUS, CHEERFUL 
    }

    // Memory types for different interaction categories
    enum MemoryType { 
        INTERACTION, ACHIEVEMENT, RELATIONSHIP, EVENT, DIALOGUE 
    }

    // Core personality structure
    struct Personality {
        mapping(PersonalityTrait => uint8) traits; // 0-100 scale
        string backstory;
        string[] quirks;
        uint256 lastUpdated;
        bool isInitialized;
    }

    // Memory entry structure
    struct MemoryEntry {
        uint256 id;
        address relatedAddress; // Player or NPC involved
        MemoryType memoryType;
        string content; // JSON or structured data
        uint256 timestamp;
        uint256 emotionalWeight; // 0-100, how significant this memory is
        string[] tags; // Searchable tags
        bool isPositive; // Positive or negative memory
    }

    // Relationship tracking
    struct Relationship {
        address target;
        int256 affinity; // -100 to +100 relationship score
        uint256 interactionCount;
        uint256 lastInteraction;
        string relationshipType; // "friend", "enemy", "neutral", "ally", etc.
    }

    // Storage mappings
    mapping(uint256 => Personality) private _personalities;
    mapping(uint256 => MemoryEntry[]) private _memories;
    mapping(uint256 => mapping(address => Relationship)) private _relationships;
    mapping(uint256 => uint256) private _memoryCounters;

    // Events
    event PersonalityInitialized(uint256 indexed npcId, string backstory);
    event PersonalityUpdated(uint256 indexed npcId, PersonalityTrait trait, uint8 newValue);
    event MemoryAdded(uint256 indexed npcId, uint256 memoryId, MemoryType memoryType);
    event RelationshipUpdated(uint256 indexed npcId, address indexed target, int256 newAffinity);

    constructor(address _npcRegistry, address initialOwner) Ownable(initialOwner) {
        npcRegistry = NPCRegistry(_npcRegistry);
    }

    modifier onlyNPCController(uint256 npcId) {
        NPCRegistry.NPC memory npc = npcRegistry.getNPC(npcId);
        require(msg.sender == npc.controller || msg.sender == owner(), "Not authorized");
        _;
    }

    /**
     * @dev Initialize personality for an NPC
     */
    function initializePersonality(
        uint256 npcId,
        PersonalityTrait[] calldata traits,
        uint8[] calldata values,
        string calldata backstory,
        string[] calldata quirks
    ) external onlyNPCController(npcId) {
        require(traits.length == values.length, "Mismatched arrays");
        require(!_personalities[npcId].isInitialized, "Already initialized");

        Personality storage personality = _personalities[npcId];
        
        for (uint i = 0; i < traits.length; i++) {
            require(values[i] <= 100, "Trait value must be 0-100");
            personality.traits[traits[i]] = values[i];
        }
        
        personality.backstory = backstory;
        personality.quirks = quirks;
        personality.lastUpdated = block.timestamp;
        personality.isInitialized = true;

        emit PersonalityInitialized(npcId, backstory);
    }

    /**
     * @dev Update a specific personality trait
     */
    function updatePersonalityTrait(
        uint256 npcId,
        PersonalityTrait trait,
        uint8 newValue
    ) external onlyNPCController(npcId) {
        require(newValue <= 100, "Trait value must be 0-100");
        require(_personalities[npcId].isInitialized, "Personality not initialized");

        _personalities[npcId].traits[trait] = newValue;
        _personalities[npcId].lastUpdated = block.timestamp;

        emit PersonalityUpdated(npcId, trait, newValue);
    }

    /**
     * @dev Add a memory entry
     */
    function addMemory(
        uint256 npcId,
        address relatedAddress,
        MemoryType memoryType,
        string calldata content,
        uint256 emotionalWeight,
        string[] calldata tags,
        bool isPositive
    ) external onlyNPCController(npcId) {
        require(emotionalWeight <= 100, "Emotional weight must be 0-100");
        require(_personalities[npcId].isInitialized, "Personality not initialized");

        uint256 memoryId = _memoryCounters[npcId]++;
        
        MemoryEntry memory newMemory = MemoryEntry({
            id: memoryId,
            relatedAddress: relatedAddress,
            memoryType: memoryType,
            content: content,
            timestamp: block.timestamp,
            emotionalWeight: emotionalWeight,
            tags: tags,
            isPositive: isPositive
        });

        _memories[npcId].push(newMemory);

        // Update relationship if applicable
        if (relatedAddress != address(0)) {
            _updateRelationship(npcId, relatedAddress, isPositive ? int256(emotionalWeight) : -int256(emotionalWeight));
        }

        emit MemoryAdded(npcId, memoryId, memoryType);
    }

    /**
     * @dev Internal function to update relationships
     */
    function _updateRelationship(uint256 npcId, address target, int256 affinityChange) internal {
        Relationship storage rel = _relationships[npcId][target];
        
        if (rel.target == address(0)) {
            // New relationship
            rel.target = target;
            rel.relationshipType = "neutral";
        }

        rel.affinity += affinityChange;
        
        // Clamp affinity to -100 to +100
        if (rel.affinity > 100) rel.affinity = 100;
        if (rel.affinity < -100) rel.affinity = -100;
        
        rel.interactionCount++;
        rel.lastInteraction = block.timestamp;

        // Update relationship type based on affinity
        if (rel.affinity >= 70) {
            rel.relationshipType = "friend";
        } else if (rel.affinity >= 30) {
            rel.relationshipType = "ally";
        } else if (rel.affinity <= -70) {
            rel.relationshipType = "enemy";
        } else if (rel.affinity <= -30) {
            rel.relationshipType = "rival";
        } else {
            rel.relationshipType = "neutral";
        }

        emit RelationshipUpdated(npcId, target, rel.affinity);
    }

    /**
     * @dev Get personality traits
     */
    function getPersonalityTrait(uint256 npcId, PersonalityTrait trait) external view returns (uint8) {
        return _personalities[npcId].traits[trait];
    }

    /**
     * @dev Get personality info
     */
    function getPersonalityInfo(uint256 npcId) external view returns (
        string memory backstory,
        string[] memory quirks,
        uint256 lastUpdated,
        bool isInitialized
    ) {
        Personality storage personality = _personalities[npcId];
        return (personality.backstory, personality.quirks, personality.lastUpdated, personality.isInitialized);
    }

    /**
     * @dev Get recent memories
     */
    function getRecentMemories(uint256 npcId, uint256 count) external view returns (MemoryEntry[] memory) {
        MemoryEntry[] storage allMemories = _memories[npcId];
        uint256 totalMemories = allMemories.length;
        
        if (totalMemories == 0) {
            return new MemoryEntry[](0);
        }

        uint256 returnCount = count > totalMemories ? totalMemories : count;
        MemoryEntry[] memory recentMemories = new MemoryEntry[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            recentMemories[i] = allMemories[totalMemories - 1 - i];
        }
        
        return recentMemories;
    }

    /**
     * @dev Get relationship info
     */
    function getRelationship(uint256 npcId, address target) external view returns (
        int256 affinity,
        uint256 interactionCount,
        uint256 lastInteraction,
        string memory relationshipType
    ) {
        Relationship storage rel = _relationships[npcId][target];
        return (rel.affinity, rel.interactionCount, rel.lastInteraction, rel.relationshipType);
    }

    /**
     * @dev Get memory count
     */
    function getMemoryCount(uint256 npcId) external view returns (uint256) {
        return _memories[npcId].length;
    }

    /**
     * @dev Search memories by tag
     */
    function searchMemoriesByTag(uint256 npcId, string calldata tag) external view returns (MemoryEntry[] memory) {
        MemoryEntry[] storage allMemories = _memories[npcId];
        
        // First pass: count matches
        uint256 matchCount = 0;
        for (uint256 i = 0; i < allMemories.length; i++) {
            for (uint256 j = 0; j < allMemories[i].tags.length; j++) {
                if (keccak256(bytes(allMemories[i].tags[j])) == keccak256(bytes(tag))) {
                    matchCount++;
                    break;
                }
            }
        }

        // Second pass: collect matches
        MemoryEntry[] memory matches = new MemoryEntry[](matchCount);
        uint256 matchIndex = 0;
        
        for (uint256 i = 0; i < allMemories.length; i++) {
            for (uint256 j = 0; j < allMemories[i].tags.length; j++) {
                if (keccak256(bytes(allMemories[i].tags[j])) == keccak256(bytes(tag))) {
                    matches[matchIndex] = allMemories[i];
                    matchIndex++;
                    break;
                }
            }
        }

        return matches;
    }
}