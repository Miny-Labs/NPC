// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title UniversalNPCIdentity
 * @dev Soulbound NFT for cross-game NPC identity with portable stats and reputation
 */
contract UniversalNPCIdentity is ERC721, ERC721URIStorage, Ownable {
    using Strings for uint256;

    struct NPCProfile {
        string name;
        string archetype; // warrior, merchant, scholar, etc.
        uint256 level;
        uint256 experience;
        uint256 reputation;
        mapping(string => uint256) stats; // strength, intelligence, charisma, etc.
        mapping(string => bool) achievements;
        string[] gameHistory; // List of games this NPC has participated in
        uint256 createdAt;
        uint256 lastActive;
        bool isSoulbound;
    }

    struct GameIntegration {
        string gameName;
        address gameContract;
        bool isActive;
        uint256 registeredAt;
        mapping(string => bytes) gameSpecificData;
    }

    mapping(uint256 => NPCProfile) private _npcProfiles;
    mapping(string => GameIntegration) private _gameIntegrations;
    mapping(uint256 => mapping(string => uint256)) private _gameStats; // tokenId => game => stat
    
    uint256 private _nextTokenId = 1;
    string private _baseTokenURI;

    // Events
    event NPCCreated(uint256 indexed tokenId, string name, string archetype);
    event NPCLevelUp(uint256 indexed tokenId, uint256 newLevel);
    event GameIntegrated(string gameName, address gameContract);
    event NPCMigrated(uint256 indexed tokenId, string fromGame, string toGame);
    event AchievementUnlocked(uint256 indexed tokenId, string achievement);
    event StatsUpdated(uint256 indexed tokenId, string statName, uint256 newValue);

    constructor(address initialOwner) ERC721("Universal NPC Identity", "UNPC") Ownable(initialOwner) {
        _baseTokenURI = "https://api.npc-engine.com/metadata/";
    }

    /**
     * @dev Create a new universal NPC identity
     */
    function createNPCIdentity(
        address to,
        string memory name,
        string memory archetype,
        string[] memory initialStats,
        uint256[] memory statValues
    ) external returns (uint256) {
        require(initialStats.length == statValues.length, "Stats arrays length mismatch");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        NPCProfile storage profile = _npcProfiles[tokenId];
        profile.name = name;
        profile.archetype = archetype;
        profile.level = 1;
        profile.experience = 0;
        profile.reputation = 50; // Start with neutral reputation
        profile.createdAt = block.timestamp;
        profile.lastActive = block.timestamp;
        profile.isSoulbound = true;

        // Set initial stats
        for (uint i = 0; i < initialStats.length; i++) {
            profile.stats[initialStats[i]] = statValues[i];
        }

        // Set metadata URI
        _setTokenURI(tokenId, string(abi.encodePacked(_baseTokenURI, tokenId.toString())));

        emit NPCCreated(tokenId, name, archetype);
        return tokenId;
    }

    /**
     * @dev Add experience and potentially level up
     */
    function addExperience(uint256 tokenId, uint256 exp) external {
        require(_exists(tokenId), "NPC does not exist");
        require(_isApprovedOrOwner(msg.sender, tokenId) || _gameIntegrations[getGameName(msg.sender)].isActive, "Not authorized");

        NPCProfile storage profile = _npcProfiles[tokenId];
        profile.experience += exp;
        profile.lastActive = block.timestamp;

        // Check for level up (simple formula: level = sqrt(experience / 100))
        uint256 newLevel = _calculateLevel(profile.experience);
        if (newLevel > profile.level) {
            profile.level = newLevel;
            emit NPCLevelUp(tokenId, newLevel);
        }
    }

    /**
     * @dev Update NPC stats
     */
    function updateStats(
        uint256 tokenId,
        string[] memory statNames,
        uint256[] memory statValues
    ) external {
        require(_exists(tokenId), "NPC does not exist");
        require(_isApprovedOrOwner(msg.sender, tokenId) || _gameIntegrations[getGameName(msg.sender)].isActive, "Not authorized");
        require(statNames.length == statValues.length, "Arrays length mismatch");

        NPCProfile storage profile = _npcProfiles[tokenId];
        
        for (uint i = 0; i < statNames.length; i++) {
            profile.stats[statNames[i]] = statValues[i];
            emit StatsUpdated(tokenId, statNames[i], statValues[i]);
        }
        
        profile.lastActive = block.timestamp;
    }

    /**
     * @dev Unlock achievement
     */
    function unlockAchievement(uint256 tokenId, string memory achievement) external {
        require(_exists(tokenId), "NPC does not exist");
        require(_gameIntegrations[getGameName(msg.sender)].isActive, "Game not integrated");

        NPCProfile storage profile = _npcProfiles[tokenId];
        if (!profile.achievements[achievement]) {
            profile.achievements[achievement] = true;
            profile.lastActive = block.timestamp;
            
            // Award experience for achievements
            profile.experience += 50;
            
            emit AchievementUnlocked(tokenId, achievement);
        }
    }

    /**
     * @dev Register a game for cross-game integration
     */
    function registerGame(
        string memory gameName,
        address gameContract
    ) external onlyOwner {
        GameIntegration storage integration = _gameIntegrations[gameName];
        integration.gameName = gameName;
        integration.gameContract = gameContract;
        integration.isActive = true;
        integration.registeredAt = block.timestamp;

        emit GameIntegrated(gameName, gameContract);
    }

    /**
     * @dev Migrate NPC to a new game
     */
    function migrateToGame(uint256 tokenId, string memory targetGame) external {
        require(_exists(tokenId), "NPC does not exist");
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        require(_gameIntegrations[targetGame].isActive, "Target game not integrated");

        NPCProfile storage profile = _npcProfiles[tokenId];
        
        // Add to game history if not already present
        bool alreadyPlayed = false;
        for (uint i = 0; i < profile.gameHistory.length; i++) {
            if (keccak256(bytes(profile.gameHistory[i])) == keccak256(bytes(targetGame))) {
                alreadyPlayed = true;
                break;
            }
        }
        
        if (!alreadyPlayed) {
            profile.gameHistory.push(targetGame);
        }
        
        profile.lastActive = block.timestamp;
        
        emit NPCMigrated(tokenId, "previous", targetGame);
    }

    /**
     * @dev Get NPC profile data
     */
    function getNPCProfile(uint256 tokenId) external view returns (
        string memory name,
        string memory archetype,
        uint256 level,
        uint256 experience,
        uint256 reputation,
        string[] memory gameHistory,
        uint256 createdAt,
        uint256 lastActive
    ) {
        require(_exists(tokenId), "NPC does not exist");
        
        NPCProfile storage profile = _npcProfiles[tokenId];
        return (
            profile.name,
            profile.archetype,
            profile.level,
            profile.experience,
            profile.reputation,
            profile.gameHistory,
            profile.createdAt,
            profile.lastActive
        );
    }

    /**
     * @dev Get NPC stat
     */
    function getNPCStat(uint256 tokenId, string memory statName) external view returns (uint256) {
        require(_exists(tokenId), "NPC does not exist");
        return _npcProfiles[tokenId].stats[statName];
    }

    /**
     * @dev Check if NPC has achievement
     */
    function hasAchievement(uint256 tokenId, string memory achievement) external view returns (bool) {
        require(_exists(tokenId), "NPC does not exist");
        return _npcProfiles[tokenId].achievements[achievement];
    }

    /**
     * @dev Get game integration info
     */
    function getGameIntegration(string memory gameName) external view returns (
        address gameContract,
        bool isActive,
        uint256 registeredAt
    ) {
        GameIntegration storage integration = _gameIntegrations[gameName];
        return (integration.gameContract, integration.isActive, integration.registeredAt);
    }

    /**
     * @dev Calculate level from experience
     */
    function _calculateLevel(uint256 experience) internal pure returns (uint256) {
        if (experience < 100) return 1;
        
        // Simple square root approximation for level calculation
        uint256 level = 1;
        uint256 threshold = 100;
        
        while (experience >= threshold && level < 100) {
            level++;
            threshold = level * level * 100; // Quadratic scaling
        }
        
        return level;
    }

    /**
     * @dev Get game name from contract address (simplified)
     */
    function getGameName(address gameContract) internal view returns (string memory) {
        // In a real implementation, this would have a proper mapping
        // For now, return a default
        return "default_game";
    }

    /**
     * @dev Override transfer functions to make soulbound
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Allow minting (from == address(0)) but prevent transfers if soulbound
        if (from != address(0) && _npcProfiles[tokenId].isSoulbound) {
            revert("Soulbound: Transfer not allowed");
        }
    }

    /**
     * @dev Set base URI for metadata
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Override required functions
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
}