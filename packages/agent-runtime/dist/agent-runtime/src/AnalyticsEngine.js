"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEngine = void 0;
/**
 * Advanced analytics and fairness monitoring system
 * Tracks game sessions, detects exploits, and monitors fairness metrics
 */
class AnalyticsEngine {
    constructor() {
        this.sessions = new Map();
        this.actions = [];
        this.dialogueBranches = [];
        this.exploits = [];
        this.fairnessMetrics = [];
        // Exploit detection patterns
        this.exploitPatterns = [
            {
                name: 'rapid_fire_actions',
                description: 'Player performing actions too quickly',
                check: (actions) => {
                    const recentActions = actions.filter(a => Date.now() - a.timestamp < 10000); // Last 10 seconds
                    return recentActions.length > 20; // More than 20 actions in 10 seconds
                },
                severity: 'medium'
            },
            {
                name: 'identical_parameters',
                description: 'Repeated identical actions suggesting automation',
                check: (actions) => {
                    const recent = actions.slice(-10);
                    if (recent.length < 5)
                        return false;
                    const paramStrings = recent.map(a => JSON.stringify(a.parameters));
                    const unique = new Set(paramStrings);
                    return unique.size === 1; // All parameters identical
                },
                severity: 'high'
            },
            {
                name: 'impossible_timing',
                description: 'Actions completed faster than humanly possible',
                check: (actions) => {
                    const recent = actions.slice(-2);
                    if (recent.length < 2)
                        return false;
                    const timeDiff = recent[1].timestamp - recent[0].timestamp;
                    return timeDiff < 100; // Less than 100ms between complex actions
                },
                severity: 'high'
            },
            {
                name: 'unusual_success_rate',
                description: 'Suspiciously high success rate',
                check: (actions) => {
                    if (actions.length < 20)
                        return false;
                    const successRate = actions.filter(a => a.success).length / actions.length;
                    return successRate > 0.95; // More than 95% success rate
                },
                severity: 'medium'
            }
        ];
        // Start periodic analytics processing
        this.startPeriodicProcessing();
    }
    /**
     * Start a new game session
     */
    startSession(playerAddress, npcId, metadata = {}) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session = {
            id: sessionId,
            playerAddress,
            npcId,
            startTime: Date.now(),
            actions: [],
            outcome: 'ongoing',
            metadata
        };
        this.sessions.set(sessionId, session);
        console.log(`AnalyticsEngine: Started session ${sessionId} for player ${playerAddress} with NPC ${npcId}`);
        return sessionId;
    }
    /**
     * End a game session
     */
    endSession(sessionId, outcome) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.warn(`AnalyticsEngine: Session ${sessionId} not found`);
            return;
        }
        session.endTime = Date.now();
        session.duration = session.endTime - session.startTime;
        session.outcome = outcome;
        console.log(`AnalyticsEngine: Ended session ${sessionId} with outcome ${outcome} (duration: ${session.duration}ms)`);
    }
    /**
     * Record a game action
     */
    recordAction(sessionId, playerAddress, npcId, actionType, parameters, result, success, executionTime, gasUsed, transactionHash) {
        const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const action = {
            id: actionId,
            sessionId,
            playerAddress,
            npcId,
            actionType,
            timestamp: Date.now(),
            parameters,
            result,
            success,
            executionTime,
            gasUsed,
            transactionHash
        };
        this.actions.push(action);
        // Add to session
        const session = this.sessions.get(sessionId);
        if (session) {
            session.actions.push(action);
        }
        // Check for exploits
        this.checkForExploits(playerAddress, action);
        console.log(`AnalyticsEngine: Recorded action ${actionType} for player ${playerAddress}`);
    }
    /**
     * Record dialogue branch selection
     */
    recordDialogueBranch(sessionId, npcId, playerAddress, branchPath, choices, selectedChoice, emotionalContext = {}) {
        const branch = {
            id: `dialogue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            npcId,
            playerAddress,
            branchPath,
            choices,
            selectedChoice,
            timestamp: Date.now(),
            sessionId,
            emotionalContext
        };
        this.dialogueBranches.push(branch);
        console.log(`AnalyticsEngine: Recorded dialogue branch selection: ${selectedChoice}`);
    }
    /**
     * Check for exploits and suspicious patterns
     */
    checkForExploits(playerAddress, action) {
        const playerActions = this.actions.filter(a => a.playerAddress === playerAddress);
        for (const pattern of this.exploitPatterns) {
            if (pattern.check(playerActions)) {
                const exploit = {
                    id: `exploit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'suspicious_pattern',
                    severity: pattern.severity,
                    playerAddress,
                    npcId: action.npcId,
                    description: pattern.description,
                    evidence: {
                        pattern: pattern.name,
                        recentActions: playerActions.slice(-10),
                        triggerAction: action
                    },
                    timestamp: Date.now(),
                    status: 'detected'
                };
                this.exploits.push(exploit);
                console.warn(`AnalyticsEngine: Exploit detected - ${pattern.name} for player ${playerAddress}`);
                // In production, this would trigger alerts or automatic responses
                this.handleExploitDetection(exploit);
            }
        }
    }
    /**
     * Handle exploit detection
     */
    handleExploitDetection(exploit) {
        // Log the exploit
        console.warn(`EXPLOIT DETECTED: ${exploit.type} - ${exploit.description}`);
        console.warn(`Player: ${exploit.playerAddress}, Severity: ${exploit.severity}`);
        // In production, this would:
        // 1. Alert moderators
        // 2. Potentially rate-limit the player
        // 3. Flag for manual review
        // 4. Store in permanent audit log
        if (exploit.severity === 'critical' || exploit.severity === 'high') {
            console.warn(`HIGH SEVERITY EXPLOIT - Immediate action may be required`);
        }
    }
    /**
     * Calculate fairness metrics
     */
    calculateFairnessMetrics() {
        const metrics = [];
        const now = Date.now();
        // Win rate distribution fairness
        const playerWinRates = this.calculatePlayerWinRates();
        const winRateVariance = this.calculateVariance(Array.from(playerWinRates.values()));
        metrics.push({
            metric: 'win_rate_variance',
            value: winRateVariance,
            threshold: 0.1, // 10% variance threshold
            status: winRateVariance > 0.1 ? 'warning' : 'healthy',
            description: 'Variance in player win rates - high variance may indicate unfairness',
            timestamp: now
        });
        // Average session duration
        const completedSessions = Array.from(this.sessions.values()).filter(s => s.duration);
        const avgDuration = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length;
        metrics.push({
            metric: 'average_session_duration',
            value: avgDuration,
            threshold: 300000, // 5 minutes minimum
            status: avgDuration < 300000 ? 'warning' : 'healthy',
            description: 'Average session duration - too short may indicate poor engagement',
            timestamp: now
        });
        // Action success rate
        const totalActions = this.actions.length;
        const successfulActions = this.actions.filter(a => a.success).length;
        const successRate = totalActions > 0 ? successfulActions / totalActions : 0;
        metrics.push({
            metric: 'overall_success_rate',
            value: successRate,
            threshold: 0.3, // 30% minimum success rate
            status: successRate < 0.3 ? 'critical' : successRate < 0.5 ? 'warning' : 'healthy',
            description: 'Overall action success rate - too low may indicate difficulty issues',
            timestamp: now
        });
        // Exploit detection rate
        const recentExploits = this.exploits.filter(e => now - e.timestamp < 86400000); // Last 24 hours
        const exploitRate = recentExploits.length / Math.max(1, totalActions);
        metrics.push({
            metric: 'exploit_detection_rate',
            value: exploitRate,
            threshold: 0.01, // 1% threshold
            status: exploitRate > 0.01 ? 'warning' : 'healthy',
            description: 'Rate of exploit detection - high rate may indicate security issues',
            timestamp: now
        });
        this.fairnessMetrics = metrics;
        return metrics;
    }
    /**
     * Calculate player win rates
     */
    calculatePlayerWinRates() {
        const playerStats = new Map();
        for (const action of this.actions) {
            if (action.actionType === 'duel' || action.actionType === 'quest') {
                const stats = playerStats.get(action.playerAddress) || { wins: 0, total: 0 };
                stats.total++;
                if (action.success) {
                    stats.wins++;
                }
                playerStats.set(action.playerAddress, stats);
            }
        }
        const winRates = new Map();
        for (const [player, stats] of playerStats) {
            winRates.set(player, stats.total > 0 ? stats.wins / stats.total : 0);
        }
        return winRates;
    }
    /**
     * Calculate variance of an array of numbers
     */
    calculateVariance(values) {
        if (values.length === 0)
            return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    }
    /**
     * Detect emergent behaviors
     */
    detectEmergentBehaviors() {
        const behaviors = [];
        // Analyze dialogue patterns
        const dialoguePatterns = new Map();
        for (const branch of this.dialogueBranches) {
            const pattern = branch.branchPath.join(' -> ');
            dialoguePatterns.set(pattern, (dialoguePatterns.get(pattern) || 0) + 1);
        }
        // Find popular dialogue paths
        for (const [pattern, count] of dialoguePatterns) {
            if (count > 10) { // Threshold for "emergent"
                behaviors.push({
                    pattern: `dialogue_path_${pattern}`,
                    frequency: count,
                    description: `Popular dialogue path: ${pattern}`
                });
            }
        }
        // Analyze action sequences
        const actionSequences = new Map();
        for (const session of this.sessions.values()) {
            if (session.actions.length >= 3) {
                const sequence = session.actions.slice(0, 3).map(a => a.actionType).join(' -> ');
                actionSequences.set(sequence, (actionSequences.get(sequence) || 0) + 1);
            }
        }
        // Find popular action sequences
        for (const [sequence, count] of actionSequences) {
            if (count > 5) {
                behaviors.push({
                    pattern: `action_sequence_${sequence}`,
                    frequency: count,
                    description: `Common action sequence: ${sequence}`
                });
            }
        }
        return behaviors;
    }
    /**
     * Generate comprehensive analytics report
     */
    generateReport(timeRange) {
        const start = timeRange?.start || (Date.now() - 86400000); // Default: last 24 hours
        const end = timeRange?.end || Date.now();
        // Filter data by time range
        const filteredSessions = Array.from(this.sessions.values())
            .filter(s => s.startTime >= start && s.startTime <= end);
        const filteredActions = this.actions
            .filter(a => a.timestamp >= start && a.timestamp <= end);
        // Calculate metrics
        const totalSessions = filteredSessions.length;
        const totalActions = filteredActions.length;
        const completedSessions = filteredSessions.filter(s => s.duration);
        const averageSessionDuration = completedSessions.length > 0 ?
            completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length : 0;
        const successfulActions = filteredActions.filter(a => a.success).length;
        const successRate = totalActions > 0 ? successfulActions / totalActions : 0;
        // Most used quests
        const questCounts = new Map();
        filteredActions.filter(a => a.actionType === 'quest').forEach(a => {
            const questId = a.parameters.questId || 'unknown';
            questCounts.set(questId, (questCounts.get(questId) || 0) + 1);
        });
        const mostUsedQuests = Array.from(questCounts.entries())
            .map(([questId, count]) => ({ questId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        // Most common dialogue branches
        const branchCounts = new Map();
        this.dialogueBranches
            .filter(b => b.timestamp >= start && b.timestamp <= end)
            .forEach(b => {
            const branch = b.branchPath.join(' -> ');
            branchCounts.set(branch, (branchCounts.get(branch) || 0) + 1);
        });
        const mostCommonDialogueBranches = Array.from(branchCounts.entries())
            .map(([branch, count]) => ({ branch, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        // NPC performance
        const npcStats = new Map();
        filteredActions.forEach(a => {
            const stats = npcStats.get(a.npcId) || { interactions: 0, successes: 0, sessions: new Set() };
            stats.interactions++;
            if (a.success)
                stats.successes++;
            stats.sessions.add(a.sessionId);
            npcStats.set(a.npcId, stats);
        });
        const npcPerformance = Array.from(npcStats.entries()).map(([npcId, stats]) => ({
            npcId,
            interactions: stats.interactions,
            successRate: stats.interactions > 0 ? stats.successes / stats.interactions : 0,
            playerSatisfaction: stats.sessions.size / Math.max(1, stats.interactions) // Unique sessions per interaction
        }));
        return {
            timeRange: { start, end },
            totalSessions,
            totalActions,
            averageSessionDuration,
            successRate,
            mostUsedQuests,
            mostCommonDialogueBranches,
            exploitsDetected: this.exploits.filter(e => e.timestamp >= start && e.timestamp <= end),
            fairnessMetrics: this.calculateFairnessMetrics(),
            emergentBehaviors: this.detectEmergentBehaviors(),
            playerRetention: {
                daily: 0.85, // Mock data - would calculate from real user data
                weekly: 0.65,
                monthly: 0.45
            },
            npcPerformance
        };
    }
    /**
     * Get exploit detection summary
     */
    getExploitSummary() {
        const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
        this.exploits.forEach(e => {
            bySeverity[e.severity]++;
        });
        const recent = this.exploits
            .filter(e => Date.now() - e.timestamp < 86400000) // Last 24 hours
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
        return {
            total: this.exploits.length,
            bySeverity,
            recent
        };
    }
    /**
     * Start periodic processing
     */
    startPeriodicProcessing() {
        // Calculate fairness metrics every 5 minutes
        setInterval(() => {
            this.calculateFairnessMetrics();
        }, 5 * 60 * 1000);
        // Clean up old data every hour
        setInterval(() => {
            this.cleanupOldData();
        }, 60 * 60 * 1000);
    }
    /**
     * Clean up old data to prevent memory leaks
     */
    cleanupOldData() {
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
        // Remove old actions
        this.actions = this.actions.filter(a => a.timestamp > cutoff);
        // Remove old dialogue branches
        this.dialogueBranches = this.dialogueBranches.filter(b => b.timestamp > cutoff);
        // Remove old sessions
        for (const [sessionId, session] of this.sessions) {
            if (session.startTime < cutoff) {
                this.sessions.delete(sessionId);
            }
        }
        console.log('AnalyticsEngine: Cleaned up old data');
    }
}
exports.AnalyticsEngine = AnalyticsEngine;
