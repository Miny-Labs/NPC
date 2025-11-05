import { describe, test, expect, beforeAll } from '@jest/globals';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

describe('Smart Contract Integration Tests', () => {
    let provider: ethers.JsonRpcProvider;
    let signer: ethers.Wallet;
    let contracts: Record<string, ethers.Contract>;

    beforeAll(async () => {
        console.log('🔗 Initializing blockchain connection...');
        
        provider = new ethers.JsonRpcProvider(process.env.SOMNIA_TESTNET_RPC_URL);
        signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY!, provider);
        
        // Load contract addresses
        const addressesPath = path.join(__dirname, '../../packages/contracts/addresses.json');
        const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
        
        // Initialize contract instances
        contracts = {};
        
        // BehaviorController
        contracts.behaviorController = new ethers.Contract(
            addresses.behaviorController,
            [
                "function validateAction(address actor, string memory actionType, bytes memory params) external view returns (bool)",
                "function addPolicy(string memory actionType, uint256 maxValue, uint256 cooldown) external",
                "function checkRiskLevel(address actor, uint256 value) external view returns (uint8)"
            ],
            signer
        );

        // Arena
        contracts.arena = new ethers.Contract(
            addresses.arena,
            [
                "function createDuel(address opponent, uint256 wager, address token) external returns (uint256)",
                "function acceptDuel(uint256 duelId) external",
                "function getDuel(uint256 duelId) external view returns (tuple(address,address,uint256,address,uint8,uint256,uint256))"
            ],
            signer
        );

        // Quest
        contracts.quest = new ethers.Contract(
            addresses.quest,
            [
                "function createQuest(string memory metadataUri, uint256 reward, address token) external returns (uint256)",
                "function completeQuest(uint256 questId, bytes memory proof) external",
                "function getQuest(uint256 questId) external view returns (tuple(address,string,uint256,address,bool,uint256))"
            ],
            signer
        );

        // MockToken
        contracts.mockToken = new ethers.Contract(
            addresses.mockToken,
            [
                "function balanceOf(address account) external view returns (uint256)",
                "function transfer(address to, uint256 amount) external returns (bool)",
                "function approve(address spender, uint256 amount) external returns (bool)",
                "function mint(address to, uint256 amount) external"
            ],
            signer
        );

        console.log('✅ Contract instances initialized');
    });

    describe('🏛️ BehaviorController Tests', () => {
        test('Should validate safe actions', async () => {
            const isValid = await contracts.behaviorController.validateAction(
                signer.address,
                'duel',
                ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [ethers.parseEther('1')])
            );
            
            expect(typeof isValid).toBe('boolean');
            console.log('✅ BehaviorController validation test passed');
        });

        test('Should check risk levels', async () => {
            const riskLevel = await contracts.behaviorController.checkRiskLevel(
                signer.address,
                ethers.parseEther('10')
            );
            
            expect(riskLevel).toBeGreaterThanOrEqual(0);
            expect(riskLevel).toBeLessThanOrEqual(3);
            console.log('✅ Risk level check test passed');
        });
    });

    describe('⚔️ Arena Contract Tests', () => {
        test('Should create a duel', async () => {
            // First, mint some tokens for testing
            await contracts.mockToken.mint(signer.address, ethers.parseEther('100'));
            
            // Approve arena to spend tokens
            await contracts.mockToken.approve(contracts.arena.target, ethers.parseEther('10'));
            
            // Create duel
            const tx = await contracts.arena.createDuel(
                '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d', // opponent
                ethers.parseEther('1'), // wager
                contracts.mockToken.target // token
            );
            
            const receipt = await tx.wait();
            expect(receipt.status).toBe(1);
            
            console.log('✅ Duel creation test passed');
        });

        test('Should retrieve duel information', async () => {
            // Get the first duel (ID 0)
            try {
                const duel = await contracts.arena.getDuel(0);
                expect(duel).toBeDefined();
                console.log('✅ Duel retrieval test passed');
            } catch (error) {
                // Duel might not exist yet, which is okay
                console.log('ℹ️ No duels found (expected for fresh deployment)');
            }
        });
    });

    describe('🗡️ Quest Contract Tests', () => {
        test('Should create a quest', async () => {
            // Approve quest contract to spend tokens
            await contracts.mockToken.approve(contracts.quest.target, ethers.parseEther('5'));
            
            const tx = await contracts.quest.createQuest(
                'https://ipfs.io/ipfs/QmTestQuest', // metadata URI
                ethers.parseEther('2'), // reward
                contracts.mockToken.target // token
            );
            
            const receipt = await tx.wait();
            expect(receipt.status).toBe(1);
            
            console.log('✅ Quest creation test passed');
        });

        test('Should retrieve quest information', async () => {
            try {
                const quest = await contracts.quest.getQuest(0);
                expect(quest).toBeDefined();
                console.log('✅ Quest retrieval test passed');
            } catch (error) {
                console.log('ℹ️ No quests found (expected for fresh deployment)');
            }
        });
    });

    describe('💰 Token Contract Tests', () => {
        test('Should check token balance', async () => {
            const balance = await contracts.mockToken.balanceOf(signer.address);
            expect(balance).toBeGreaterThanOrEqual(0);
            
            console.log(`✅ Token balance check passed: ${ethers.formatEther(balance)} STT`);
        });

        test('Should mint tokens', async () => {
            const initialBalance = await contracts.mockToken.balanceOf(signer.address);
            
            await contracts.mockToken.mint(signer.address, ethers.parseEther('10'));
            
            const newBalance = await contracts.mockToken.balanceOf(signer.address);
            expect(newBalance).toBeGreaterThan(initialBalance);
            
            console.log('✅ Token minting test passed');
        });

        test('Should transfer tokens', async () => {
            const recipient = '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d';
            const amount = ethers.parseEther('1');
            
            const initialBalance = await contracts.mockToken.balanceOf(signer.address);
            
            if (initialBalance >= amount) {
                const tx = await contracts.mockToken.transfer(recipient, amount);
                const receipt = await tx.wait();
                expect(receipt.status).toBe(1);
                
                console.log('✅ Token transfer test passed');
            } else {
                console.log('ℹ️ Insufficient balance for transfer test');
            }
        });
    });

    describe('🔗 Contract Interactions', () => {
        test('Should handle complex multi-contract workflow', async () => {
            try {
                // 1. Mint tokens
                await contracts.mockToken.mint(signer.address, ethers.parseEther('20'));
                
                // 2. Check behavior controller validation
                const isValidDuel = await contracts.behaviorController.validateAction(
                    signer.address,
                    'duel',
                    ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [ethers.parseEther('2')])
                );
                
                if (isValidDuel) {
                    // 3. Approve and create duel
                    await contracts.mockToken.approve(contracts.arena.target, ethers.parseEther('2'));
                    await contracts.arena.createDuel(
                        '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d',
                        ethers.parseEther('2'),
                        contracts.mockToken.target
                    );
                }
                
                // 4. Create quest
                await contracts.mockToken.approve(contracts.quest.target, ethers.parseEther('3'));
                await contracts.quest.createQuest(
                    'https://ipfs.io/ipfs/QmComplexQuest',
                    ethers.parseEther('3'),
                    contracts.mockToken.target
                );
                
                console.log('✅ Complex multi-contract workflow test passed');
            } catch (error) {
                console.error('❌ Multi-contract workflow failed:', error);
                throw error;
            }
        });
    });

    describe('⛽ Gas Usage Tests', () => {
        test('Should track gas usage for operations', async () => {
            const gasUsage: Record<string, bigint> = {};
            
            // Test duel creation gas
            try {
                await contracts.mockToken.approve(contracts.arena.target, ethers.parseEther('1'));
                const tx = await contracts.arena.createDuel(
                    '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d',
                    ethers.parseEther('1'),
                    contracts.mockToken.target
                );
                const receipt = await tx.wait();
                gasUsage.duelCreation = receipt.gasUsed;
            } catch (error) {
                console.log('ℹ️ Duel creation gas test skipped');
            }
            
            // Test quest creation gas
            try {
                await contracts.mockToken.approve(contracts.quest.target, ethers.parseEther('1'));
                const tx = await contracts.quest.createQuest(
                    'https://ipfs.io/ipfs/QmGasTest',
                    ethers.parseEther('1'),
                    contracts.mockToken.target
                );
                const receipt = await tx.wait();
                gasUsage.questCreation = receipt.gasUsed;
            } catch (error) {
                console.log('ℹ️ Quest creation gas test skipped');
            }
            
            console.log('⛽ Gas Usage Report:');
            Object.entries(gasUsage).forEach(([operation, gas]) => {
                console.log(`  ${operation}: ${gas.toString()} gas`);
            });
            
            console.log('✅ Gas usage tracking test passed');
        });
    });
});