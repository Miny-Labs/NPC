"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmotionEngine = void 0;
const ethers_1 = require("ethers");
/**
 * Advanced emotion and mood simulation engine for NPCs
 * Handles emotional state transitions, player reputation tracking, and mood-based decision making
 */
class EmotionEngine {
    constructor() {
        this.emotionalStates = new Map();
        this.playerReputations = new Map();
        this.moodHistory = [];
        this.emotionTriggers = [];
        this.emotionTrackerContract = null;
        // Base emotional states for different archetypes
        this.archetypeBaseStates = {
            warrior: {
                happiness: 60, anger: 70, fear: 20, trust: 50,
                excitement: 80, sadness: 30, disgust: 40, surprise: 40
            },
            merchant: {
                happiness: 70, anger: 30, fear: 40, trust: 60,
                excitement: 60, sadness: 20, disgust: 30, surprise: 50
            },
            scholar: {
                happiness: 50, anger: 20, fear: 30, trust: 70,
                excitement: 40, sadness: 40, disgust: 20, surprise: 80
            },
            trickster: {
                happiness: 80, anger: 50, fear: 60, trust: 30,
                excitement: 90, sadness: 20, disgust: 70, surprise: 70
            },
            guardian: {
                happiness: 40, anger: 40, fear: 20, trust: 80,
                excitement: 30, sadness: 50, disgust: 30, surprise: 30
            },
            balanced: {
                happiness: 50, anger: 50, fear: 50, trust: 50,
                excitement: 50, sadness: 50, disgust: 50, surprise: 50
            }
        };
        this.provider = new ethers_1.ethers.JsonRpcProvider(process.env.SOMNIA_TESTNET_RPC_URL);
        this.signer = new ethers_1.ethers.Wallet(process.env.WALLET_PRIVATE_KEY || '', this.provider);
        this.initializeEmotionTriggers();
        this.initializeContract();
    }
    /**
     * Initialize common emotion triggers
     */
    initializeEmotionTriggers() {
        this.emotionTriggers = [
            // Positive interactions
            {
                event: 'player_helped',
                conditions: { action: 'help', success: true },
                emotionDeltas: { happiness: 15, trust: 10, sadness: -5 },
                reputationImpact: 25,
                description: 'Player helped the NPC successfully'
            },
            {
                event: 'gift_received',
                conditions: { action: 'give_item', value: { $gt: 0 } },
                emotionDeltas: { happiness: 20, trust: 15, excitement: 10 },
                reputationImpact: 30,
                description: 'Player gave a gift to the NPC'
            },
            {
                event: 'quest_completed',
                conditions: { action: 'complete_quest', success: true },
                emotionDeltas: { happiness: 25, trust: 20, excitement: 15 },
                reputationImpact: 50,
                description: 'Player completed a quest for the NPC'
            },
            // Negative interactions
            {
                event: 'player_attacked',
                conditions: { action: 'attack', target: 'npc' },
                emotionDeltas: { anger: 30, fear: 20, trust: -25, happiness: -15 },
                reputationImpact: -75,
                description: 'Player attacked the NPC'
            },
            {
                event: 'promise_broken',
                conditions: { action: 'break_promise' },
                emotionDeltas: { anger: 20, sadness: 15, trust: -30, disgust: 10 },
                reputationImpact: -50,
                description: 'Player broke a promise to the NPC'
            },
            {
                event: 'theft_detected',
                conditions: { action: 'steal', success: true },
                emotionDeltas: { anger: 25, disgust: 20, trust: -35, fear: 10 },
                reputationImpact: -60,
                description: 'Player stole from the NPC'
            },
            // Neutral/contextual interactions
            {
                event: 'repeated_interaction',
                conditions: { interaction_count: { $gt: 10 } },
                emotionDeltas: { trust: 5, happiness: 3 },
                reputationImpact: 10,
                description: 'Player has interacted many times'
            },
            {
                event: 'long_absence',
                conditions: { days_since_last_interaction: { $gt: 7 } },
                emotionDeltas: { sadness: 10, trust: -5 },
                reputationImpact: -5,
                description: 'Player has been absent for a long time'
            }
        ];
    }
    /**
     * Initialize EmotionTracker contract connection
     */
    async initializeContract() {
        try {
            // Load contract addresses
            const addressesPath = require('path').join(__dirname, '../../contracts/addresses.json');
            if (require('fs').existsSync(addressesPath)) {
                const addresses = JSON.parse(require('fs').readFileSync(addressesPath, 'utf8'));
                if (addresses.emotionTracker && addresses.emotionTracker !== '0x0000000000000000000000000000000000000000') {
                    // Load contract ABI
                    const emotionTrackerABI = [
                        "function recordMoodTransition(string memory npcId, tuple(uint8,uint8,uint8,uint8,uint8,uint8,uint8,uint8) memory newState, string memory trigger, address player, uint8 intensity, string memory context, int16 reputationChange) external returns (uint256)",
                        "function getNPCEmotionalState(string memory npcId) external view returns (tuple(uint8,uint8,uint8,uint8,uint8,uint8,uint8,uint8))",
                        "function getPlayerReputation(address player) external view returns (tuple(int16,uint16,uint8,uint8,uint8,uint8,uint8,uint256))"
                    ];
                    this.emotionTrackerContract = new ethers_1.ethers.Contract(addresses.emotionTracker, emotionTrackerABI, this.signer);
                    console.log('EmotionEngine: Connected to EmotionTracker contract at', addresses.emotionTracker);
                }
                else {
                    console.log('EmotionEngine: EmotionTracker contract not deployed yet, using off-chain storage only');
                }
            }
        }
        catch (error) {
            console.error('EmotionEngine: Failed to initialize contract:', error);
        }
    }
    /**
     * Initialize emotional state for a new NPC
     */
    initializeNPCEmotion(npcId, archetype, personalityTraits) {
        let baseState = this.archetypeBaseStates[archetype] || this.archetypeBaseStates.balanced;
        // Apply personality trait modifiers if provided
        if (personalityTraits) {
            baseState = this.applyPersonalityModifiers(baseState, personalityTraits);
        }
        this.emotionalStates.set(npcId, { ...baseState });
        console.log(`EmotionEngine: Initialized emotional state for NPC ${npcId} (${archetype})`);
        return baseState;
    }
    /**
     * Apply personality traits to modify base emotional state
     */
    applyPersonalityModifiers(baseState, traits) {
        const modified = { ...baseState };
        // Friendly trait affects happiness and trust
        if (traits.friendly) {
            const friendlyFactor = (traits.friendly - 50) / 50; // -1 to 1
            modified.happiness += friendlyFactor * 20;
            modified.trust += friendlyFactor * 15;
        }
        // Aggressive trait affects anger and fear
        if (traits.aggressive) {
            const aggressiveFactor = (traits.aggressive - 50) / 50;
            modified.anger += aggressiveFactor * 25;
            modified.fear -= aggressiveFactor * 10;
        }
        // Cautious trait affects fear and trust
        if (traits.cautious) {
            const cautiousFactor = (traits.cautious - 50) / 50;
            modified.fear += cautiousFactor * 20;
            modified.trust -= cautiousFactor * 10;
        }
        // Cheerful trait affects happiness and sadness
        if (traits.cheerful) {
            const cheerfulFactor = (traits.cheerful - 50) / 50;
            modified.happiness += cheerfulFactor * 25;
            modified.sadness -= cheerfulFactor * 15;
        }
        // Clamp all values to 0-100 range
        Object.keys(modified).forEach(key => {
            modified[key] = Math.max(0, Math.min(100, modified[key]));
        });
        return modified;
    }
    /**
     * Process an interaction and update emotional state
     */
    async processInteraction(npcId, playerAddress, action, context = {}) {
        const currentState = this.emotionalStates.get(npcId);
        if (!currentState) {
            throw new Error(`NPC ${npcId} not found`);
        }
        // Find matching emotion triggers
        const matchingTriggers = this.emotionTriggers.filter(trigger => {
            if (trigger.event !== action)
                return false;
            // Check conditions
            return this.evaluateConditions(trigger.conditions, context);
        });
        if (matchingTriggers.length === 0) {
            console.log(`EmotionEngine: No triggers found for action ${action}`);
            return { newState: currentState, reputationChange: 0 };
        }
        // Apply the strongest matching trigger
        const trigger = matchingTriggers.reduce((strongest, current) => Math.abs(current.reputationImpact) > Math.abs(strongest.reputationImpact) ? current : strongest);
        // Calculate new emotional state
        const newState = this.applyEmotionDeltas(currentState, trigger.emotionDeltas);
        // Update player reputation
        const reputationChange = await this.updatePlayerReputation(playerAddress, npcId, trigger.reputationImpact);
        // Create mood transition record
        const moodTransition = {
            id: `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            npcId,
            fromState: { ...currentState },
            toState: { ...newState },
            trigger: trigger.event,
            playerAddress,
            timestamp: Date.now(),
            intensity: Math.abs(trigger.reputationImpact),
            context: trigger.description
        };
        // Store the transition
        this.moodHistory.push(moodTransition);
        this.emotionalStates.set(npcId, newState);
        // Emit on-chain event for significant mood changes
        if (moodTransition.intensity > 50) {
            await this.emitMoodTransitionEvent(moodTransition);
        }
        console.log(`EmotionEngine: Processed ${action} for NPC ${npcId}, reputation change: ${reputationChange}`);
        return { newState, reputationChange, moodTransition };
    }
    /**
     * Evaluate trigger conditions against context
     */
    evaluateConditions(conditions, context) {
        for (const [key, condition] of Object.entries(conditions)) {
            const contextValue = context[key];
            if (typeof condition === 'object' && condition !== null) {
                // Handle operators like $gt, $lt, etc.
                if (condition.$gt !== undefined && contextValue <= condition.$gt)
                    return false;
                if (condition.$lt !== undefined && contextValue >= condition.$lt)
                    return false;
                if (condition.$eq !== undefined && contextValue !== condition.$eq)
                    return false;
            }
            else {
                // Direct value comparison
                if (contextValue !== condition)
                    return false;
            }
        }
        return true;
    }
    /**
     * Apply emotion deltas to current state
     */
    applyEmotionDeltas(currentState, deltas) {
        const newState = { ...currentState };
        Object.entries(deltas).forEach(([emotion, delta]) => {
            if (delta !== undefined) {
                newState[emotion] = Math.max(0, Math.min(100, newState[emotion] + delta));
            }
        });
        return newState;
    }
    /**
     * Update player reputation
     */
    async updatePlayerReputation(playerAddress, npcId, reputationDelta) {
        let reputation = this.playerReputations.get(playerAddress);
        if (!reputation) {
            reputation = {
                address: playerAddress,
                globalScore: 0,
                npcSpecificScores: new Map(),
                traits: {
                    trustworthiness: 50,
                    aggression: 50,
                    generosity: 50,
                    reliability: 50,
                    respect: 50
                },
                interactions: 0,
                lastUpdated: Date.now()
            };
        }
        // Update global score
        reputation.globalScore = Math.max(-1000, Math.min(1000, reputation.globalScore + reputationDelta));
        // Update NPC-specific score
        const currentNPCScore = reputation.npcSpecificScores.get(npcId) || 0;
        reputation.npcSpecificScores.set(npcId, Math.max(-500, Math.min(500, currentNPCScore + reputationDelta)));
        // Update traits based on interaction type
        this.updateReputationTraits(reputation, reputationDelta);
        reputation.interactions++;
        reputation.lastUpdated = Date.now();
        this.playerReputations.set(playerAddress, reputation);
        return reputationDelta;
    }
    /**
     * Update reputation traits based on interaction
     */
    updateReputationTraits(reputation, reputationDelta) {
        const traitDelta = Math.abs(reputationDelta) / 10; // Scale down the impact
        if (reputationDelta > 0) {
            // Positive interaction
            reputation.traits.trustworthiness = Math.min(100, reputation.traits.trustworthiness + traitDelta);
            reputation.traits.respect = Math.min(100, reputation.traits.respect + traitDelta);
            reputation.traits.reliability = Math.min(100, reputation.traits.reliability + traitDelta / 2);
        }
        else {
            // Negative interaction
            reputation.traits.trustworthiness = Math.max(0, reputation.traits.trustworthiness - traitDelta);
            reputation.traits.aggression = Math.min(100, reputation.traits.aggression + traitDelta);
            reputation.traits.respect = Math.max(0, reputation.traits.respect - traitDelta);
        }
    }
    /**
     * Emit mood transition event on-chain
     */
    async emitMoodTransitionEvent(transition) {
        try {
            if (this.emotionTrackerContract) {
                // Convert emotional state to contract format
                const emotionalStateTuple = [
                    Math.floor(transition.toState.happiness),
                    Math.floor(transition.toState.anger),
                    Math.floor(transition.toState.fear),
                    Math.floor(transition.toState.trust),
                    Math.floor(transition.toState.excitement),
                    Math.floor(transition.toState.sadness),
                    Math.floor(transition.toState.disgust),
                    Math.floor(transition.toState.surprise)
                ];
                const tx = await this.emotionTrackerContract.recordMoodTransition(transition.npcId, emotionalStateTuple, transition.trigger, transition.playerAddress, transition.intensity, transition.context, 0 // reputation change will be calculated separately
                );
                console.log(`EmotionEngine: Recorded mood transition on-chain for NPC ${transition.npcId}`);
                console.log(`  Transaction: ${tx.hash}`);
            }
            else {
                console.log(`EmotionEngine: Emitting mood transition event for NPC ${transition.npcId} (off-chain only)`);
                console.log(`  Trigger: ${transition.trigger}`);
                console.log(`  Intensity: ${transition.intensity}`);
                console.log(`  Player: ${transition.playerAddress}`);
            }
        }
        catch (error) {
            console.error('EmotionEngine: Failed to emit mood transition event:', error);
        }
    }
    /**
     * Get current emotional state for an NPC
     */
    getEmotionalState(npcId) {
        return this.emotionalStates.get(npcId) || null;
    }
    /**
     * Get player reputation
     */
    getPlayerReputation(playerAddress) {
        return this.playerReputations.get(playerAddress) || null;
    }
    /**
     * Get NPC-specific reputation for a player
     */
    getNPCSpecificReputation(playerAddress, npcId) {
        const reputation = this.playerReputations.get(playerAddress);
        return reputation?.npcSpecificScores.get(npcId) || 0;
    }
    /**
     * Get mood history for an NPC
     */
    getMoodHistory(npcId, limit = 50) {
        return this.moodHistory
            .filter(transition => transition.npcId === npcId)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    /**
     * Calculate emotional influence on decision making
     */
    getEmotionalInfluence(npcId) {
        const state = this.emotionalStates.get(npcId);
        if (!state) {
            return { aggressiveness: 50, trustfulness: 50, helpfulness: 50, riskTaking: 50 };
        }
        return {
            aggressiveness: (state.anger + (100 - state.fear)) / 2,
            trustfulness: (state.trust + state.happiness) / 2,
            helpfulness: (state.happiness + (100 - state.sadness)) / 2,
            riskTaking: (state.excitement + (100 - state.fear)) / 2
        };
    }
    /**
     * Simulate natural emotional decay over time
     */
    processEmotionalDecay(npcId, hoursElapsed) {
        const state = this.emotionalStates.get(npcId);
        if (!state) {
            throw new Error(`NPC ${npcId} not found`);
        }
        const decayRate = 0.1 * hoursElapsed; // 10% decay per hour
        const newState = { ...state };
        // Emotions naturally drift toward neutral (50)
        Object.keys(newState).forEach(emotion => {
            const current = newState[emotion];
            const target = 50;
            const decay = (current - target) * decayRate;
            newState[emotion] = Math.max(0, Math.min(100, current - decay));
        });
        this.emotionalStates.set(npcId, newState);
        return newState;
    }
    /**
     * Get emotional state summary as text
     */
    getEmotionalSummary(npcId) {
        const state = this.emotionalStates.get(npcId);
        if (!state)
            return 'Unknown emotional state';
        const dominantEmotions = Object.entries(state)
            .filter(([_, value]) => value > 70)
            .map(([emotion, _]) => emotion)
            .slice(0, 2);
        if (dominantEmotions.length === 0) {
            return 'Emotionally balanced';
        }
        return `Feeling ${dominantEmotions.join(' and ')}`;
    }
}
exports.EmotionEngine = EmotionEngine;
