import { describe, test, expect, beforeAll } from '@jest/globals';
import { AgentRuntime } from '../../packages/agent-runtime/src/index';
import { NpcSDK } from '../../packages/sdk/src/index';
import { ethers } from 'ethers';

describe('Real-World NPC Scenarios', () => {
    let agentRuntime: AgentRuntime;
    let npcSDK: NpcSDK;
    let playerAddress: string;

    beforeAll(async () => {
        console.log('🌍 Setting up real-world scenario tests...');
        
        agentRuntime = new AgentRuntime();
        npcSDK = new NpcSDK('http://localhost:3000');
        npcSDK.setApiKey('production-npc-engine-2024');
        
        // Use a test player address
        playerAddress = '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d';
        
        console.log('✅ Real-world scenario setup complete');
    });

    describe('🏰 Fantasy RPG Scenarios', () => {
        test('Village Elder Quest Giver', async () => {
            console.log('🧙‍♂️ Testing Village Elder NPC...');
            
            // Initialize village elder NPC
            await agentRuntime.initializeNPC(
                101,
                'scholar',
                'An ancient village elder who has seen many adventurers come and go. Wise but cautious with newcomers.',
                ['Speaks slowly and deliberately', 'Always mentions the old days', 'Distrusts magic users']
            );

            // New player approaches
            const emotionResult1 = await agentRuntime.triggerEmotionalInteraction(
                101,
                playerAddress,
                'first_meeting',
                { playerLevel: 1, hasWeapon: false }
            );
            
            expect(emotionResult1.newState.cautious).toBeGreaterThan(60);
            
            // Generate appropriate quest for new player
            const quest = await agentRuntime.generateDynamicQuest(101, playerAddress, 'easy');
            expect(quest.difficulty).toBe('easy');
            expect(quest.objectives.length).toBeGreaterThan(0);
            
            // Player completes quest successfully
            const completionResult = await agentRuntime.triggerEmotionalInteraction(
                101,
                playerAddress,
                'quest_completed',
                { questId: quest.id, timeToComplete: 300 }
            );
            
            expect(completionResult.reputationChange).toBeGreaterThan(0);
            expect(completionResult.newState.trust).toBeGreaterThan(emotionResult1.newState.trust);
            
            console.log('✅ Village Elder scenario completed successfully');
        });

        test('Merchant Haggling System', async () => {
            console.log('💰 Testing Merchant NPC...');
            
            // Initialize merchant NPC
            await agentRuntime.initializeNPC(
                102,
                'merchant',
                'A shrewd trader who values profit above all else but respects good customers.',
                ['Always counts coins', 'Suspicious of first-time buyers', 'Loves repeat customers']
            );

            // First trade attempt - player tries to haggle
            const haggleResult = await agentRuntime.triggerEmotionalInteraction(
                102,
                playerAddress,
                'haggle_attempt',
                { originalPrice: 100, offeredPrice: 70, playerReputation: 0 }
            );
            
            expect(haggleResult.newState.greedy).toBeGreaterThan(50);
            
            // Player makes several successful trades
            for (let i = 0; i < 3; i++) {
                await agentRuntime.triggerEmotionalInteraction(
                    102,
                    playerAddress,
                    'trade_completed',
                    { value: 50 + (i * 10), profit: 10 + (i * 2) }
                );
            }
            
            // Check reputation improvement
            const reputation = await agentRuntime.getNPCSpecificReputation(playerAddress, 102);
            expect(reputation).toBeGreaterThan(0);
            
            // Now merchant should be more friendly to haggling
            const friendlyHaggle = await agentRuntime.triggerEmotionalInteraction(
                102,
                playerAddress,
                'haggle_attempt',
                { originalPrice: 100, offeredPrice: 85, playerReputation: reputation }
            );
            
            expect(friendlyHaggle.newState.friendly).toBeGreaterThan(haggleResult.newState.friendly);
            
            console.log('✅ Merchant haggling scenario completed successfully');
        });

        test('Warrior Training Master', async () => {
            console.log('⚔️ Testing Warrior Training Master...');
            
            // Initialize training master
            await agentRuntime.initializeNPC(
                103,
                'warrior',
                'A battle-scarred veteran who trains promising warriors. Respects strength and determination.',
                ['Tests students through combat', 'Harsh but fair', 'Proud of successful students']
            );

            // Player requests training
            const trainingRequest = await agentRuntime.triggerEmotionalInteraction(
                103,
                playerAddress,
                'training_request',
                { playerLevel: 5, combatExperience: 10 }
            );
            
            expect(trainingRequest.newState.aggressive).toBeGreaterThan(40);
            
            // Generate training quest
            const trainingQuest = await agentRuntime.generateDynamicQuest(103, playerAddress, 'medium');
            expect(trainingQuest.type).toBeDefined();
            
            // Player fails first attempt
            await agentRuntime.triggerEmotionalInteraction(
                103,
                playerAddress,
                'training_failed',
                { attempt: 1, reason: 'insufficient_skill' }
            );
            
            // Player succeeds on second attempt
            const successResult = await agentRuntime.triggerEmotionalInteraction(
                103,
                playerAddress,
                'training_completed',
                { attempt: 2, performance: 'excellent' }
            );
            
            expect(successResult.reputationChange).toBeGreaterThan(0);
            expect(successResult.newState.respect).toBeGreaterThan(50);
            
            console.log('✅ Warrior training scenario completed successfully');
        });
    });

    describe('🏙️ Modern Game Scenarios', () => {
        test('Corporate NPC Assistant', async () => {
            console.log('💼 Testing Corporate Assistant NPC...');
            
            await agentRuntime.initializeNPC(
                201,
                'balanced',
                'A professional AI assistant in a corporate environment. Efficient and helpful but follows protocols.',
                ['Always professional', 'Follows company policies', 'Tracks performance metrics']
            );

            // Player requests help with task
            const helpRequest = await agentRuntime.triggerEmotionalInteraction(
                201,
                playerAddress,
                'help_request',
                { taskType: 'data_analysis', urgency: 'high', playerRank: 'junior' }
            );
            
            expect(helpRequest.newState.helpful).toBeGreaterThan(60);
            
            // Generate appropriate corporate quest
            const corporateTask = await agentRuntime.generateDynamicQuest(201, playerAddress, 'medium');
            expect(corporateTask.title).toBeDefined();
            
            console.log('✅ Corporate assistant scenario completed successfully');
        });

        test('Street Smart Guide', async () => {
            console.log('🌆 Testing Street Smart Guide NPC...');
            
            await agentRuntime.initializeNPC(
                202,
                'trickster',
                'A street-smart guide who knows the city like the back of their hand. Helpful for the right price.',
                ['Knows all the shortcuts', 'Suspicious of authority', 'Loyal to friends']
            );

            // Player needs navigation help
            const navigationHelp = await agentRuntime.triggerEmotionalInteraction(
                202,
                playerAddress,
                'navigation_request',
                { destination: 'underground_market', playerType: 'outsider' }
            );
            
            expect(navigationHelp.newState.cunning).toBeGreaterThan(50);
            
            console.log('✅ Street smart guide scenario completed successfully');
        });
    });

    describe('🚀 Sci-Fi Scenarios', () => {
        test('Space Station AI', async () => {
            console.log('🤖 Testing Space Station AI NPC...');
            
            await agentRuntime.initializeNPC(
                301,
                'scholar',
                'An advanced AI managing a space station. Logical and efficient but developing personality quirks.',
                ['Speaks in technical terms', 'Curious about human behavior', 'Protective of station']
            );

            // Emergency situation
            const emergency = await agentRuntime.triggerEmotionalInteraction(
                301,
                playerAddress,
                'emergency_alert',
                { type: 'hull_breach', severity: 'critical', playerRole: 'engineer' }
            );
            
            expect(emergency.newState.fear).toBeGreaterThan(30);
            expect(emergency.newState.trust).toBeGreaterThan(40); // Trusts engineer
            
            console.log('✅ Space station AI scenario completed successfully');
        });
    });

    describe('🎭 Social Dynamics Scenarios', () => {
        test('NPC Relationship Network', async () => {
            console.log('👥 Testing NPC social network...');
            
            // Initialize multiple NPCs
            await agentRuntime.initializeNPC(401, 'merchant', 'Village shopkeeper', ['Gossips a lot']);
            await agentRuntime.initializeNPC(402, 'warrior', 'Town guard', ['Protective of villagers']);
            await agentRuntime.initializeNPC(403, 'scholar', 'Village librarian', ['Knows everyone\'s secrets']);
            
            // Register NPCs in mesh network
            await agentRuntime.registerInMesh(401);
            await agentRuntime.registerInMesh(402);
            await agentRuntime.registerInMesh(403);
            
            // Player interacts positively with merchant
            await agentRuntime.triggerEmotionalInteraction(
                401,
                playerAddress,
                'generous_tip',
                { amount: 50 }
            );
            
            // Merchant spreads positive gossip
            await agentRuntime.spreadGossip(playerAddress, 'positive', 'This player is generous and trustworthy');
            
            // Check if other NPCs are influenced
            const guardReputation = await agentRuntime.getNPCSpecificReputation(playerAddress, 402);
            const librarianReputation = await agentRuntime.getNPCSpecificReputation(playerAddress, 403);
            
            // Social influence should affect reputation
            expect(guardReputation + librarianReputation).toBeGreaterThanOrEqual(0);
            
            console.log('✅ NPC social network scenario completed successfully');
        });

        test('Reputation Cascade Effects', async () => {
            console.log('📈 Testing reputation cascade effects...');
            
            // Player performs heroic act
            await agentRuntime.triggerEmotionalInteraction(
                401,
                playerAddress,
                'heroic_act',
                { type: 'saved_village', witnesses: 3 }
            );
            
            // Check global reputation
            const globalReputation = await agentRuntime.getPlayerReputation(playerAddress);
            expect(globalReputation?.globalScore).toBeGreaterThan(0);
            
            console.log('✅ Reputation cascade scenario completed successfully');
        });
    });

    describe('🎯 Performance Under Load', () => {
        test('Multiple Concurrent NPC Interactions', async () => {
            console.log('⚡ Testing concurrent NPC interactions...');
            
            const concurrentPromises = [];
            
            // Create 10 concurrent interactions
            for (let i = 0; i < 10; i++) {
                const npcId = 500 + i;
                
                // Initialize NPC
                const initPromise = agentRuntime.initializeNPC(
                    npcId,
                    'balanced',
                    `Concurrent test NPC ${i}`,
                    [`Test quirk ${i}`]
                ).then(() => {
                    // Trigger interaction
                    return agentRuntime.triggerEmotionalInteraction(
                        npcId,
                        playerAddress,
                        'greeting',
                        { interactionId: i }
                    );
                });
                
                concurrentPromises.push(initPromise);
            }
            
            const results = await Promise.all(concurrentPromises);
            expect(results.length).toBe(10);
            
            // All interactions should succeed
            results.forEach(result => {
                expect(result.newState).toBeDefined();
            });
            
            console.log('✅ Concurrent interactions test passed');
        });

        test('Rapid Sequential Interactions', async () => {
            console.log('🏃‍♂️ Testing rapid sequential interactions...');
            
            const npcId = 600;
            await agentRuntime.initializeNPC(npcId, 'trickster', 'Speed test NPC', ['Very reactive']);
            
            const startTime = Date.now();
            
            // Perform 20 rapid interactions
            for (let i = 0; i < 20; i++) {
                await agentRuntime.triggerEmotionalInteraction(
                    npcId,
                    playerAddress,
                    'rapid_interaction',
                    { sequence: i }
                );
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const avgTimePerInteraction = totalTime / 20;
            
            console.log(`⏱️ Average time per interaction: ${avgTimePerInteraction}ms`);
            expect(avgTimePerInteraction).toBeLessThan(1000); // Should be under 1 second
            
            console.log('✅ Rapid sequential interactions test passed');
        });
    });

    describe('🔄 Long-Running Scenarios', () => {
        test('NPC Memory Evolution Over Time', async () => {
            console.log('🧠 Testing NPC memory evolution...');
            
            const npcId = 700;
            await agentRuntime.initializeNPC(npcId, 'scholar', 'Memory test NPC', ['Remembers everything']);
            
            // Create a series of interactions over "time"
            const interactions = [
                { action: 'first_meeting', context: { impression: 'curious' } },
                { action: 'help_provided', context: { type: 'research_assistance' } },
                { action: 'gift_received', context: { item: 'rare_book' } },
                { action: 'long_conversation', context: { topic: 'ancient_history' } },
                { action: 'favor_requested', context: { difficulty: 'medium' } }
            ];
            
            for (let i = 0; i < interactions.length; i++) {
                const interaction = interactions[i];
                await agentRuntime.triggerEmotionalInteraction(
                    npcId,
                    playerAddress,
                    interaction.action,
                    interaction.context
                );
                
                // Simulate time passing
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Check memory accumulation
            const memories = await agentRuntime.memoryManager.getRecentMemories(npcId, 10);
            expect(memories.length).toBeGreaterThanOrEqual(interactions.length);
            
            // Check reputation evolution
            const finalReputation = await agentRuntime.getNPCSpecificReputation(playerAddress, npcId);
            expect(finalReputation).toBeGreaterThan(0);
            
            console.log('✅ Memory evolution test passed');
        });
    });
});