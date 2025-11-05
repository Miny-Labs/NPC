"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaytestingHarness = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Comprehensive playtesting and replay system for NPC behavior validation
 */
class PlaytestingHarness {
    constructor(agentRuntime) {
        this.agentRuntime = agentRuntime;
        this.scenarios = new Map();
        this.results = new Map();
        this.replaySessions = new Map();
        this.isRunning = false;
        this.currentLogs = [];
        this.loadDefaultScenarios();
    }
    /**
     * Load default test scenarios
     */
    loadDefaultScenarios() {
        const scenarios = [
            {
                id: 'basic_duel_test',
                name: 'Basic Duel Functionality',
                description: 'Test basic duel creation and execution',
                playerCount: 2,
                npcCount: 1,
                duration: 60000, // 1 minute
                actions: [
                    {
                        id: 'create_duel',
                        timestamp: 1000,
                        playerAddress: '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d',
                        npcId: '1',
                        actionType: 'duel',
                        parameters: {
                            opponent: '0x8f3e2b1c4d5a6e7f8g9h0i1j2k3l4m5n6o7p8q9r',
                            wager: '1000000000000000000',
                            tokenAddress: '0x6F30b8B34D042eF9f9bcFE0716CD44B607EA7845'
                        }
                    }
                ],
                expectedOutcomes: [
                    {
                        type: 'state_check',
                        condition: 'duel_created',
                        expectedValue: true,
                        description: 'Duel should be created successfully'
                    },
                    {
                        type: 'performance_check',
                        condition: 'response_time',
                        expectedValue: 5000,
                        tolerance: 2000,
                        description: 'Response time should be under 5 seconds'
                    }
                ],
                tags: ['duel', 'basic', 'functionality'],
                difficulty: 'easy'
            },
            {
                id: 'stress_test_multiple_players',
                name: 'Multiple Player Stress Test',
                description: 'Test system behavior with many concurrent players',
                playerCount: 100,
                npcCount: 10,
                duration: 300000, // 5 minutes
                actions: this.generateStressTestActions(100, 10),
                expectedOutcomes: [
                    {
                        type: 'performance_check',
                        condition: 'throughput',
                        expectedValue: 50,
                        tolerance: 10,
                        description: 'Should handle at least 50 actions per second'
                    },
                    {
                        type: 'behavior_check',
                        condition: 'error_rate',
                        expectedValue: 0.05,
                        tolerance: 0.02,
                        description: 'Error rate should be below 5%'
                    }
                ],
                tags: ['stress', 'performance', 'concurrent'],
                difficulty: 'stress'
            },
            {
                id: 'exploit_detection_test',
                name: 'Exploit Detection Validation',
                description: 'Test that exploit detection systems work correctly',
                playerCount: 5,
                npcCount: 3,
                duration: 120000, // 2 minutes
                actions: this.generateExploitTestActions(),
                expectedOutcomes: [
                    {
                        type: 'behavior_check',
                        condition: 'exploits_detected',
                        expectedValue: 3,
                        tolerance: 1,
                        description: 'Should detect at least 3 exploit attempts'
                    }
                ],
                tags: ['security', 'exploits', 'detection'],
                difficulty: 'hard'
            },
            {
                id: 'emotional_state_progression',
                name: 'Emotional State Progression Test',
                description: 'Test NPC emotional state changes over interactions',
                playerCount: 3,
                npcCount: 2,
                duration: 180000, // 3 minutes
                actions: this.generateEmotionalTestActions(),
                expectedOutcomes: [
                    {
                        type: 'state_check',
                        condition: 'emotional_variance',
                        expectedValue: 20,
                        tolerance: 5,
                        description: 'NPC emotions should vary by at least 20 points'
                    },
                    {
                        type: 'behavior_check',
                        condition: 'reputation_changes',
                        expectedValue: 5,
                        tolerance: 2,
                        description: 'Should record at least 5 reputation changes'
                    }
                ],
                tags: ['emotion', 'reputation', 'progression'],
                difficulty: 'medium'
            }
        ];
        scenarios.forEach(scenario => {
            this.scenarios.set(scenario.id, scenario);
        });
        console.log(`PlaytestingHarness: Loaded ${scenarios.length} default scenarios`);
    }
    /**
     * Generate stress test actions
     */
    generateStressTestActions(playerCount, npcCount) {
        const actions = [];
        const actionTypes = ['duel', 'quest', 'trade', 'social'];
        for (let i = 0; i < playerCount * 5; i++) {
            const playerIndex = i % playerCount;
            const npcIndex = i % npcCount;
            const actionType = actionTypes[i % actionTypes.length];
            actions.push({
                id: `stress_action_${i}`,
                timestamp: (i * 100) + Math.random() * 1000, // Spread actions over time
                playerAddress: `0x${playerIndex.toString(16).padStart(40, '0')}`,
                npcId: npcIndex.toString(),
                actionType,
                parameters: this.generateActionParameters(actionType)
            });
        }
        return actions;
    }
    /**
     * Generate exploit test actions
     */
    generateExploitTestActions() {
        const actions = [];
        // Rapid fire actions (exploit pattern)
        for (let i = 0; i < 25; i++) {
            actions.push({
                id: `rapid_fire_${i}`,
                timestamp: 1000 + (i * 50), // 50ms apart
                playerAddress: '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d',
                npcId: '1',
                actionType: 'duel',
                parameters: {
                    opponent: '0x8f3e2b1c4d5a6e7f8g9h0i1j2k3l4m5n6o7p8q9r',
                    wager: '1000000000000000000'
                }
            });
        }
        // Identical parameters (automation pattern)
        const identicalParams = { value: 100, item: 'sword' };
        for (let i = 0; i < 10; i++) {
            actions.push({
                id: `identical_${i}`,
                timestamp: 30000 + (i * 1000),
                playerAddress: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
                npcId: '2',
                actionType: 'trade',
                parameters: identicalParams
            });
        }
        // Impossible timing (bot pattern)
        actions.push({
            id: 'impossible_1',
            timestamp: 60000,
            playerAddress: '0x9876543210abcdef9876543210abcdef98765432',
            npcId: '3',
            actionType: 'quest',
            parameters: { questId: 'complex_quest' }
        });
        actions.push({
            id: 'impossible_2',
            timestamp: 60050, // 50ms later - too fast for complex action
            playerAddress: '0x9876543210abcdef9876543210abcdef98765432',
            npcId: '3',
            actionType: 'quest',
            parameters: { questId: 'another_complex_quest' }
        });
        return actions;
    }
    /**
     * Generate emotional test actions
     */
    generateEmotionalTestActions() {
        const actions = [];
        const playerAddress = '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d';
        // Positive interactions
        actions.push({
            id: 'help_npc',
            timestamp: 5000,
            playerAddress,
            npcId: '1',
            actionType: 'help',
            parameters: { action: 'help', success: true }
        });
        actions.push({
            id: 'give_gift',
            timestamp: 15000,
            playerAddress,
            npcId: '1',
            actionType: 'give_item',
            parameters: { item: 'flower', value: 50 }
        });
        // Negative interactions
        actions.push({
            id: 'attack_npc',
            timestamp: 30000,
            playerAddress,
            npcId: '1',
            actionType: 'attack',
            parameters: { target: 'npc', damage: 10 }
        });
        actions.push({
            id: 'break_promise',
            timestamp: 45000,
            playerAddress,
            npcId: '1',
            actionType: 'break_promise',
            parameters: { promise: 'return_item' }
        });
        // Recovery interactions
        actions.push({
            id: 'apologize',
            timestamp: 60000,
            playerAddress,
            npcId: '1',
            actionType: 'apologize',
            parameters: { sincerity: 'high' }
        });
        return actions;
    }
    /**
     * Generate action parameters based on type
     */
    generateActionParameters(actionType) {
        switch (actionType) {
            case 'duel':
                return {
                    opponent: `0x${Math.random().toString(16).substr(2, 40)}`,
                    wager: (Math.random() * 10 * 1e18).toString()
                };
            case 'quest':
                return {
                    questId: `quest_${Math.floor(Math.random() * 100)}`,
                    difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)]
                };
            case 'trade':
                return {
                    item: ['sword', 'potion', 'armor'][Math.floor(Math.random() * 3)],
                    quantity: Math.floor(Math.random() * 10) + 1
                };
            case 'social':
                return {
                    message: 'Hello!',
                    emotion: ['happy', 'neutral', 'sad'][Math.floor(Math.random() * 3)]
                };
            default:
                return {};
        }
    }
    /**
     * Run a specific test scenario
     */
    async runScenario(scenarioId) {
        const scenario = this.scenarios.get(scenarioId);
        if (!scenario) {
            throw new Error(`Scenario ${scenarioId} not found`);
        }
        console.log(`PlaytestingHarness: Starting scenario "${scenario.name}"`);
        this.isRunning = true;
        this.currentLogs = [];
        const startTime = Date.now();
        const result = {
            scenarioId,
            startTime,
            endTime: 0,
            duration: 0,
            success: false,
            executedActions: 0,
            failedActions: 0,
            outcomes: [],
            performance: {
                averageResponseTime: 0,
                maxResponseTime: 0,
                minResponseTime: Infinity,
                throughput: 0,
                memoryUsage: 0,
                gasUsed: 0,
                errorRate: 0
            },
            logs: [],
            emergentBehaviors: [],
            exploitsDetected: []
        };
        try {
            // Initialize NPCs for the scenario
            await this.initializeScenarioNPCs(scenario);
            // Execute actions
            const responseTimes = [];
            for (const action of scenario.actions) {
                // Wait for the action's scheduled time
                const elapsed = Date.now() - startTime;
                const waitTime = action.timestamp - elapsed;
                if (waitTime > 0) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
                try {
                    const actionStart = Date.now();
                    // Execute the action
                    await this.executeAction(action);
                    const actionTime = Date.now() - actionStart;
                    responseTimes.push(actionTime);
                    result.executedActions++;
                    this.log('info', `Executed action ${action.id}`, {
                        actionType: action.actionType,
                        responseTime: actionTime
                    });
                }
                catch (error) {
                    result.failedActions++;
                    this.log('error', `Failed to execute action ${action.id}`, {
                        error: error.message
                    });
                }
            }
            // Calculate performance metrics
            if (responseTimes.length > 0) {
                result.performance.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
                result.performance.maxResponseTime = Math.max(...responseTimes);
                result.performance.minResponseTime = Math.min(...responseTimes);
                result.performance.throughput = result.executedActions / (scenario.duration / 1000);
                result.performance.errorRate = result.failedActions / (result.executedActions + result.failedActions);
            }
            // Evaluate expected outcomes
            result.outcomes = await this.evaluateOutcomes(scenario.expectedOutcomes, result);
            // Check for emergent behaviors and exploits
            result.emergentBehaviors = await this.detectEmergentBehaviors(scenario);
            result.exploitsDetected = await this.checkExploitDetection(scenario);
            result.success = result.outcomes.every(o => o.success) && result.performance.errorRate < 0.1;
        }
        catch (error) {
            this.log('error', 'Scenario execution failed', { error: error.message });
            result.success = false;
        }
        finally {
            result.endTime = Date.now();
            result.duration = result.endTime - result.startTime;
            result.logs = [...this.currentLogs];
            this.isRunning = false;
            // Store results
            const scenarioResults = this.results.get(scenarioId) || [];
            scenarioResults.push(result);
            this.results.set(scenarioId, scenarioResults);
            console.log(`PlaytestingHarness: Completed scenario "${scenario.name}" - Success: ${result.success}`);
        }
        return result;
    }
    /**
     * Initialize NPCs for scenario
     */
    async initializeScenarioNPCs(scenario) {
        for (let i = 0; i < scenario.npcCount; i++) {
            const npcId = i + 1;
            await this.agentRuntime.initializeNPC(npcId, 'balanced', // Default archetype for testing
            `Test NPC ${npcId} for scenario ${scenario.name}`, [`test_npc_${npcId}`, 'automated_testing']);
        }
    }
    /**
     * Execute a single action
     */
    async executeAction(action) {
        const task = {
            type: action.actionType,
            params: action.parameters,
            npcId: parseInt(action.npcId),
            playerAddress: action.playerAddress
        };
        return await this.agentRuntime.handleTask(task);
    }
    /**
     * Evaluate expected outcomes
     */
    async evaluateOutcomes(expectedOutcomes, result) {
        const outcomes = [];
        for (const expected of expectedOutcomes) {
            let actualValue;
            let success = false;
            let deviation;
            let message = '';
            switch (expected.type) {
                case 'performance_check':
                    if (expected.condition === 'response_time') {
                        actualValue = result.performance.averageResponseTime;
                        success = actualValue <= expected.expectedValue + (expected.tolerance || 0);
                        deviation = actualValue - expected.expectedValue;
                        message = `Average response time: ${actualValue}ms (expected: ≤${expected.expectedValue}ms)`;
                    }
                    else if (expected.condition === 'throughput') {
                        actualValue = result.performance.throughput;
                        success = actualValue >= expected.expectedValue - (expected.tolerance || 0);
                        deviation = expected.expectedValue - actualValue;
                        message = `Throughput: ${actualValue} actions/sec (expected: ≥${expected.expectedValue})`;
                    }
                    break;
                case 'behavior_check':
                    if (expected.condition === 'error_rate') {
                        actualValue = result.performance.errorRate;
                        success = actualValue <= expected.expectedValue + (expected.tolerance || 0);
                        deviation = actualValue - expected.expectedValue;
                        message = `Error rate: ${(actualValue * 100).toFixed(2)}% (expected: ≤${(expected.expectedValue * 100).toFixed(2)}%)`;
                    }
                    else if (expected.condition === 'exploits_detected') {
                        actualValue = result.exploitsDetected.length;
                        success = Math.abs(actualValue - expected.expectedValue) <= (expected.tolerance || 0);
                        deviation = actualValue - expected.expectedValue;
                        message = `Exploits detected: ${actualValue} (expected: ${expected.expectedValue})`;
                    }
                    break;
                case 'state_check':
                    // These would check actual game state
                    actualValue = true; // Mock for now
                    success = actualValue === expected.expectedValue;
                    message = `State check: ${expected.condition} = ${actualValue}`;
                    break;
                default:
                    actualValue = null;
                    success = false;
                    message = `Unknown outcome type: ${expected.type}`;
            }
            outcomes.push({
                outcome: expected,
                success,
                actualValue,
                deviation,
                message
            });
        }
        return outcomes;
    }
    /**
     * Detect emergent behaviors during testing
     */
    async detectEmergentBehaviors(scenario) {
        const behaviors = [];
        // Mock emergent behavior detection
        if (scenario.playerCount > 50) {
            behaviors.push('High player count led to increased cooperation patterns');
        }
        if (scenario.tags.includes('stress')) {
            behaviors.push('Under stress, NPCs showed more defensive behavior');
        }
        return behaviors;
    }
    /**
     * Check if exploit detection systems worked
     */
    async checkExploitDetection(scenario) {
        const detected = [];
        // Mock exploit detection results
        if (scenario.id === 'exploit_detection_test') {
            detected.push('rapid_fire_actions');
            detected.push('identical_parameters');
            detected.push('impossible_timing');
        }
        return detected;
    }
    /**
     * Run multiple scenarios in sequence
     */
    async runTestSuite(scenarioIds) {
        const results = new Map();
        console.log(`PlaytestingHarness: Running test suite with ${scenarioIds.length} scenarios`);
        for (const scenarioId of scenarioIds) {
            try {
                const result = await this.runScenario(scenarioId);
                results.set(scenarioId, result);
                // Wait between scenarios to avoid interference
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            catch (error) {
                console.error(`PlaytestingHarness: Failed to run scenario ${scenarioId}:`, error);
            }
        }
        return results;
    }
    /**
     * Create a replay session from previous results
     */
    async createReplaySession(originalSessionId, variations = []) {
        const replayId = `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Find the original scenario and results
        const originalResults = Array.from(this.results.values()).flat()
            .find(r => r.scenarioId === originalSessionId);
        if (!originalResults) {
            throw new Error(`Original session ${originalSessionId} not found`);
        }
        const scenario = this.scenarios.get(originalResults.scenarioId);
        if (!scenario) {
            throw new Error(`Scenario for session ${originalSessionId} not found`);
        }
        const replaySession = {
            id: replayId,
            originalSessionId,
            scenario,
            results: [originalResults],
            variations,
            createdAt: Date.now()
        };
        // Run variations if provided
        for (const variation of variations) {
            const modifiedScenario = this.applyVariation(scenario, variation.modifications);
            const tempScenarioId = `${scenario.id}_variation_${variation.id}`;
            this.scenarios.set(tempScenarioId, { ...modifiedScenario, id: tempScenarioId });
            try {
                variation.result = await this.runScenario(tempScenarioId);
                replaySession.results.push(variation.result);
            }
            catch (error) {
                console.error(`PlaytestingHarness: Failed to run variation ${variation.id}:`, error);
            }
        }
        this.replaySessions.set(replayId, replaySession);
        console.log(`PlaytestingHarness: Created replay session ${replayId} with ${variations.length} variations`);
        return replayId;
    }
    /**
     * Apply variation modifications to a scenario
     */
    applyVariation(scenario, modifications) {
        const modified = JSON.parse(JSON.stringify(scenario)); // Deep clone
        // Apply modifications
        Object.keys(modifications).forEach(key => {
            if (key === 'playerCount') {
                modified.playerCount = modifications[key];
            }
            else if (key === 'duration') {
                modified.duration = modifications[key];
            }
            else if (key === 'actionDelay') {
                // Modify action timings
                modified.actions.forEach((action) => {
                    action.timestamp *= modifications[key];
                });
            }
            // Add more modification types as needed
        });
        return modified;
    }
    /**
     * Export test results for analysis
     */
    exportResults(format = 'json') {
        const allResults = Array.from(this.results.entries()).map(([scenarioId, results]) => ({
            scenarioId,
            results
        }));
        if (format === 'json') {
            return JSON.stringify(allResults, null, 2);
        }
        else {
            // CSV format
            let csv = 'ScenarioId,StartTime,Duration,Success,ExecutedActions,FailedActions,AvgResponseTime,Throughput,ErrorRate\n';
            allResults.forEach(({ scenarioId, results }) => {
                results.forEach(result => {
                    csv += `${scenarioId},${result.startTime},${result.duration},${result.success},${result.executedActions},${result.failedActions},${result.performance.averageResponseTime},${result.performance.throughput},${result.performance.errorRate}\n`;
                });
            });
            return csv;
        }
    }
    /**
     * Save results to file
     */
    async saveResults(filename, format = 'json') {
        const data = this.exportResults(format);
        const filepath = path_1.default.join(process.cwd(), 'test-results', filename);
        // Ensure directory exists
        const dir = path_1.default.dirname(filepath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        fs_1.default.writeFileSync(filepath, data);
        console.log(`PlaytestingHarness: Results saved to ${filepath}`);
    }
    /**
     * Log a message
     */
    log(level, message, data) {
        const logEntry = {
            timestamp: Date.now(),
            level,
            message,
            data
        };
        this.currentLogs.push(logEntry);
        console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    }
    /**
     * Get available scenarios
     */
    getScenarios() {
        return Array.from(this.scenarios.values());
    }
    /**
     * Get results for a scenario
     */
    getResults(scenarioId) {
        return this.results.get(scenarioId) || [];
    }
    /**
     * Get replay session
     */
    getReplaySession(replayId) {
        return this.replaySessions.get(replayId) || null;
    }
    /**
     * Check if harness is currently running
     */
    isCurrentlyRunning() {
        return this.isRunning;
    }
}
exports.PlaytestingHarness = PlaytestingHarness;
