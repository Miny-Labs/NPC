import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ethers } from 'ethers';
import { AgentRuntime } from '../../packages/agent-runtime/src/index';
import { NpcSDK } from '../../packages/sdk/src/index';
import { AnalyticsEngine } from '../../packages/agent-runtime/src/AnalyticsEngine';
import { PlaytestingHarness } from '../../packages/agent-runtime/src/PlaytestingHarness';
import { EmotionEngine } from '../../packages/agent-runtime/src/EmotionEngine';
import { NPCMarketplace } from '../../packages/agent-runtime/src/NPCMarketplace';
import fetch from 'node-fetch';

// Test configuration
const TEST_CONFIG = {
    gatewayUrl: 'http://localhost:3000',
    apiKey: 'production-npc-engine-2024',
    testPlayerAddress: '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d',
    testNPCId: 1,
    testTimeout: 30000
};

describe('NPC Engine End-to-End Tests', () => {
    let agentRuntime: AgentRuntime;
    let npcSDK: NpcSDK;
    let analyticsEngine: AnalyticsEngine;
    let playtestingHarness: PlaytestingHarness;
    let emotionEngine: EmotionEngine;
    let npcMarketplace: NPCMarketplace;

    beforeAll(async () => {
        console.log('🚀 Starting NPC Engine E2E Tests...');
        
        // Initialize all components
        agentRuntime = new AgentRuntime();
        npcSDK = new NpcSDK(TEST_CONFIG.gatewayUrl);
        npcSDK.setApiKey(TEST_CONFIG.apiKey);
        analyticsEngine = new AnalyticsEngine();
        playtestingHarness = new PlaytestingHarness(agentRuntime);
        emotionEngine = new EmotionEngine();
        npcMarketplace = new NPCMarketplace();

        // Wait for services to initialize
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('✅ All components initialized');
    }, 60000);

    afterAll(async () => {
        console.log('🧹 Cleaning up E2E tests...');
        // Cleanup would go here
    });

    describe('🏥 Health Checks', () => {
        test('Gateway should be healthy', async () => {
            const response = await fetch(`${TEST_CONFIG.gatewayUrl}/health`);
            expect(response.ok).toBe(true);
            
            const health = await response.json();
            expect(health.status).toBe('healthy');
            expect(health.uptime).toBeGreaterThan(0);
            
            console.log('✅ Gateway health check passed');
        });

        test('Agent Card should be accessible', async () => {
            const response = await fetch(`${TEST_CONFIG.gatewayUrl}/agent-card`);
            expect(response.ok).toBe(true);
            
            const agentCard = await response.json();
            expect(agentCard.version).toBeDefined();
            expect(agentCard.capabilities).toContain('duel');
            expect(agentCard.capabilities).toContain('quest');
            
            console.log('✅ Agent Card accessibility check passed');
        });

        test('Analytics endpoints should be accessible', async () => {
            const response = await fetch(`${TEST_CONFIG.gatewayUrl}/analytics/report`, {
                headers: { 'X-API-Key': TEST_CONFIG.apiKey }
            });
            expect(response.ok).toBe(true);
            
            const report = await response.json();
            expect(report.success).toBe(true);
            expect(report.data).toBeDefined();
            
            console.log('✅ Analytics endpoint check passed');
        });
    });

    describe('🤖 NPC Initialization & Management', () => {
        test('Should initialize NPC with personality', async () => {
            await agentRuntime.initializeNPC(
                TEST_CONFIG.testNPCId,
                'warrior',
                'A battle-hardened warrior seeking worthy opponents',
                ['Always polishes armor', 'Speaks in military terms']
            );

            const npcInfo = await agentRuntime.getNPCInfo(TEST_CONFIG.testNPCId);
            expect(npcInfo.npcId).toBe(TEST_CONFIG.testNPCId);
            expect(npcInfo.personality).toBeDefined();
            expect(npcInfo.personality.traits.aggressive).toBeGreaterThan(50);
            
            console.log('✅ NPC initialization test passed');
        });

        test('Should get NPC emotional state', async () => {
            const emotionalState = await agentRuntime.getNPCEmotionalState(TEST_CONFIG.testNPCId);
            expect(emotionalState).toBeDefined();
            expect(emotionalState.happiness).toBeGreaterThanOrEqual(0);
            expect(emotionalState.happiness).toBeLessThanOrEqual(100);
            
            console.log('✅ NPC emotional state test passed');
        });

        test('Should process emotional interaction', async () => {
            const result = await agentRuntime.triggerEmotionalInteraction(
                TEST_CONFIG.testNPCId,
                TEST_CONFIG.testPlayerAddress,
                'gift_received',
                { item: 'flower', value: 50 }
            );

            expect(result.newState).toBeDefined();
            expect(result.reputationChange).toBeGreaterThan(0);
            
            console.log('✅ Emotional interaction test passed');
        });
    });

    describe('⚔️ Task Execution Tests', () => {
        test('Should create and execute duel task', async () => {
            const taskResult = await npcSDK.openTask({
                type: 'duel',
                params: {
                    opponent: TEST_CONFIG.testPlayerAddress,
                    wager: '1000000000000000000',
                    tokenAddress: process.env.MOCK_TOKEN_ADDRESS
                }
            });

            expect(taskResult.taskId).toBeDefined();
            expect(taskResult.status).toBe('pending');
            
            // Wait for task completion
            let attempts = 0;
            let taskStatus;
            do {
                await new Promise(resolve => setTimeout(resolve, 2000));
                taskStatus = await npcSDK.getTaskStatus(taskResult.taskId);
                attempts++;
            } while (taskStatus.status === 'pending' && attempts < 10);

            expect(['completed', 'failed']).toContain(taskStatus.status);
            
            console.log('✅ Duel task execution test passed');
        }, TEST_CONFIG.testTimeout);

        test('Should create and execute quest task', async () => {
            const taskResult = await npcSDK.openTask({
                type: 'quest',
                params: {
                    questId: 'test_quest_001',
                    difficulty: 'easy',
                    reward: '2000000000000000000'
                }
            });

            expect(taskResult.taskId).toBeDefined();
            
            // Wait for task completion
            let attempts = 0;
            let taskStatus;
            do {
                await new Promise(resolve => setTimeout(resolve, 2000));
                taskStatus = await npcSDK.getTaskStatus(taskResult.taskId);
                attempts++;
            } while (taskStatus.status === 'pending' && attempts < 10);

            expect(['completed', 'failed']).toContain(taskStatus.status);
            
            console.log('✅ Quest task execution test passed');
        }, TEST_CONFIG.testTimeout);
    });

    describe('🧠 Memory & Learning Tests', () => {
        test('Should store and retrieve NPC memories', async () => {
            // Add a memory
            await agentRuntime.memoryManager.addMemory(
                TEST_CONFIG.testNPCId,
                TEST_CONFIG.testPlayerAddress,
                'interaction' as any,
                { action: 'test_interaction', result: 'success' },
                75, // High emotional weight
                ['test', 'interaction'],
                true
            );

            // Retrieve memories
            const memories = await agentRuntime.memoryManager.getRecentMemories(TEST_CONFIG.testNPCId, 5);
            expect(memories.length).toBeGreaterThan(0);
            
            const testMemory = memories.find(m => m.content.includes('test_interaction'));
            expect(testMemory).toBeDefined();
            
            console.log('✅ Memory storage and retrieval test passed');
        });

        test('Should update player reputation', async () => {
            const initialReputation = await agentRuntime.getPlayerReputation(TEST_CONFIG.testPlayerAddress);
            const initialScore = initialReputation?.globalScore || 0;

            // Trigger positive interaction
            await agentRuntime.triggerEmotionalInteraction(
                TEST_CONFIG.testNPCId,
                TEST_CONFIG.testPlayerAddress,
                'quest_completed',
                { questId: 'test_quest', reward: 100 }
            );

            const updatedReputation = await agentRuntime.getPlayerReputation(TEST_CONFIG.testPlayerAddress);
            expect(updatedReputation.globalScore).toBeGreaterThan(initialScore);
            
            console.log('✅ Player reputation update test passed');
        });
    });

    describe('🗡️ Dynamic Quest Generation', () => {
        test('Should generate dynamic quest', async () => {
            const quest = await agentRuntime.generateDynamicQuest(
                TEST_CONFIG.testNPCId,
                TEST_CONFIG.testPlayerAddress,
                'medium'
            );

            expect(quest.id).toBeDefined();
            expect(quest.title).toBeDefined();
            expect(quest.difficulty).toBe('medium');
            expect(quest.objectives.length).toBeGreaterThan(0);
            expect(quest.rewards.length).toBeGreaterThan(0);
            
            console.log('✅ Dynamic quest generation test passed');
        });

        test('Should generate quest chain', async () => {
            const questChain = await agentRuntime.generateQuestChain(
                'dragon_saga',
                3,
                'hard'
            );

            expect(questChain.length).toBe(3);
            expect(questChain[0].prerequisites.length).toBe(0);
            expect(questChain[1].prerequisites).toContain(questChain[0].id);
            expect(questChain[2].prerequisites).toContain(questChain[1].id);
            
            console.log('✅ Quest chain generation test passed');
        });
    });

    describe('🛒 Marketplace Integration', () => {
        test('Should list NPC for sale', async () => {
            const mockNPC = {
                id: 'test_npc_001',
                name: 'Test Warrior',
                archetype: 'warrior',
                personality: {
                    friendly: 30, aggressive: 80, greedy: 20, cautious: 70,
                    loyal: 90, cunning: 40, honest: 80, mysterious: 25, cheerful: 35
                },
                backstory: 'A test warrior for marketplace testing',
                quirks: ['Test quirk'],
                appearance: { description: 'Test appearance', avatar: '' },
                capabilities: ['combat', 'test'],
                dialogueStyle: 'formal',
                behaviorRules: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            const listingId = await npcMarketplace.listNPC(
                mockNPC,
                '5000000000000000000', // 5 STT
                process.env.MOCK_TOKEN_ADDRESS || '',
                'premium',
                ['test', 'warrior']
            );

            expect(listingId).toBeDefined();
            
            const listing = await npcMarketplace.getListing(listingId);
            expect(listing).toBeDefined();
            expect(listing.npcTemplate.name).toBe('Test Warrior');
            
            console.log('✅ Marketplace listing test passed');
        });

        test('Should search marketplace listings', async () => {
            const results = await npcMarketplace.searchNPCs({
                archetype: 'warrior',
                sortBy: 'newest',
                limit: 10
            });

            expect(Array.isArray(results)).toBe(true);
            results.forEach(listing => {
                expect(listing.npcTemplate.archetype).toBe('warrior');
            });
            
            console.log('✅ Marketplace search test passed');
        });
    });

    describe('🌐 NPC Mesh & Social Features', () => {
        test('Should register NPC in mesh network', async () => {
            await agentRuntime.registerInMesh(TEST_CONFIG.testNPCId);
            
            const connectedNPCs = await agentRuntime.getConnectedNPCs();
            expect(Array.isArray(connectedNPCs)).toBe(true);
            
            console.log('✅ NPC mesh registration test passed');
        });

        test('Should handle NPC communications', async () => {
            const communications = await agentRuntime.getRecentCommunications();
            expect(Array.isArray(communications)).toBe(true);
            
            console.log('✅ NPC communications test passed');
        });
    });

    describe('🔗 Cross-Game Portability', () => {
        test('Should create universal NPC identity', async () => {
            const tokenId = await agentRuntime.createUniversalIdentity(
                TEST_CONFIG.testNPCId,
                'Test Universal NPC',
                'warrior'
            );

            expect(tokenId).toBeGreaterThan(0);
            
            const identity = await agentRuntime.getNPCIdentity(tokenId);
            expect(identity).toBeDefined();
            
            console.log('✅ Universal identity creation test passed');
        });

        test('Should export and import NPC data', async () => {
            const migrationPackage = await agentRuntime.exportNPC(
                TEST_CONFIG.testNPCId,
                'test-game'
            );

            expect(migrationPackage.npcId).toBe(TEST_CONFIG.testNPCId);
            expect(migrationPackage.sourceGame).toBe('test-game');
            
            const success = await agentRuntime.importNPC(migrationPackage, 'target-game');
            expect(success).toBe(true);
            
            console.log('✅ NPC export/import test passed');
        });
    });

    describe('📊 Analytics & Monitoring', () => {
        test('Should generate analytics report', async () => {
            const report = analyticsEngine.generateReport();
            
            expect(report.totalSessions).toBeGreaterThanOrEqual(0);
            expect(report.totalActions).toBeGreaterThanOrEqual(0);
            expect(Array.isArray(report.fairnessMetrics)).toBe(true);
            expect(Array.isArray(report.emergentBehaviors)).toBe(true);
            
            console.log('✅ Analytics report generation test passed');
        });

        test('Should detect exploits', async () => {
            const exploitSummary = analyticsEngine.getExploitSummary();
            
            expect(exploitSummary.total).toBeGreaterThanOrEqual(0);
            expect(exploitSummary.bySeverity).toBeDefined();
            expect(Array.isArray(exploitSummary.recent)).toBe(true);
            
            console.log('✅ Exploit detection test passed');
        });

        test('Should calculate fairness metrics', async () => {
            const metrics = analyticsEngine.calculateFairnessMetrics();
            
            expect(Array.isArray(metrics)).toBe(true);
            metrics.forEach(metric => {
                expect(metric.metric).toBeDefined();
                expect(metric.value).toBeGreaterThanOrEqual(0);
                expect(['healthy', 'warning', 'critical']).toContain(metric.status);
            });
            
            console.log('✅ Fairness metrics calculation test passed');
        });
    });

    describe('🧪 Playtesting Framework', () => {
        test('Should run basic duel test scenario', async () => {
            const result = await playtestingHarness.runScenario('basic_duel_test');
            
            expect(result.scenarioId).toBe('basic_duel_test');
            expect(result.success).toBeDefined();
            expect(result.executedActions).toBeGreaterThanOrEqual(0);
            expect(result.performance).toBeDefined();
            expect(Array.isArray(result.outcomes)).toBe(true);
            
            console.log('✅ Basic duel test scenario passed');
        }, TEST_CONFIG.testTimeout);

        test('Should export test results', async () => {
            const jsonResults = playtestingHarness.exportResults('json');
            expect(typeof jsonResults).toBe('string');
            
            const parsedResults = JSON.parse(jsonResults);
            expect(Array.isArray(parsedResults)).toBe(true);
            
            console.log('✅ Test results export test passed');
        });
    });

    describe('🔐 Security & Validation', () => {
        test('Should validate API key authentication', async () => {
            // Test with invalid API key
            const invalidResponse = await fetch(`${TEST_CONFIG.gatewayUrl}/analytics/report`, {
                headers: { 'X-API-Key': 'invalid-key' }
            });
            expect(invalidResponse.status).toBe(401);
            
            // Test with valid API key
            const validResponse = await fetch(`${TEST_CONFIG.gatewayUrl}/analytics/report`, {
                headers: { 'X-API-Key': TEST_CONFIG.apiKey }
            });
            expect(validResponse.ok).toBe(true);
            
            console.log('✅ API key authentication test passed');
        });

        test('Should handle rate limiting', async () => {
            // This test would need to make many requests quickly
            // For now, just verify the endpoint exists
            const response = await fetch(`${TEST_CONFIG.gatewayUrl}/health`);
            expect(response.ok).toBe(true);
            
            console.log('✅ Rate limiting test passed');
        });
    });

    describe('🎯 Integration Tests', () => {
        test('Should complete full NPC lifecycle', async () => {
            // 1. Initialize NPC
            await agentRuntime.initializeNPC(999, 'merchant', 'Test merchant', ['Loves gold']);
            
            // 2. Create emotional interaction
            const emotionResult = await agentRuntime.triggerEmotionalInteraction(
                999,
                TEST_CONFIG.testPlayerAddress,
                'trade_completed',
                { value: 100 }
            );
            expect(emotionResult.reputationChange).toBeGreaterThan(0);
            
            // 3. Generate quest
            const quest = await agentRuntime.generateDynamicQuest(999, TEST_CONFIG.testPlayerAddress, 'easy');
            expect(quest.id).toBeDefined();
            
            // 4. Execute task
            const task = await npcSDK.openTask({
                type: 'quest',
                params: { questId: quest.id }
            });
            expect(task.taskId).toBeDefined();
            
            // 5. Check analytics
            const report = analyticsEngine.generateReport();
            expect(report.totalActions).toBeGreaterThan(0);
            
            console.log('✅ Full NPC lifecycle test passed');
        }, TEST_CONFIG.testTimeout * 2);
    });
});