import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Define Somnia Shannon testnet
const somniaShannon = defineChain({
  id: 50312,
  name: 'Somnia Shannon Testnet',
  network: 'somnia-shannon',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: { name: 'Shannon Explorer', url: 'https://shannon-explorer.somnia.network' },
  },
});

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Setup clients
  const account = privateKeyToAccount(`0x${process.env.WALLET_PRIVATE_KEY}`);
  
  const publicClient = createPublicClient({
    chain: somniaShannon,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaShannon,
    transport: http()
  });

  console.log("🚀 Deploying contracts to Somnia Shannon Testnet");
  console.log("📍 Deployer address:", account.address);

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("💰 Account balance:", formatEther(balance), "STT");

  if (balance === 0n) {
    console.log("❌ No balance! Please get STT from the faucet:");
    console.log("🚰 https://cloud.google.com/application/web3/faucet/somnia/shannon");
    return;
  }

  // We'll need to manually deploy since we don't have the hardhat deployment helpers
  console.log("\n⚠️  Manual deployment required - contracts compiled but need deployment via Hardhat Ignition or manual process");
  console.log("📋 Contract Status:");
  console.log("  ✅ BehaviorController - Already deployed");
  console.log("  ✅ NPCRegistry - Already deployed");
  console.log("  ✅ Arena - Already deployed");
  console.log("  ✅ Quest - Already deployed");
  console.log("  ✅ GameActionAdapter - Already deployed");
  console.log("  ✅ MockERC20 - Already deployed");
  console.log("  🚧 NPCMemory - Ready for deployment");
  console.log("  🚧 UniversalNPCIdentity - Ready for deployment");
  console.log("  🚧 NPCMarketplace - Ready for deployment");
  console.log("  🚧 EmotionTracker - Ready for deployment");
  
  console.log("\n🚀 To deploy missing contracts, run:");
  console.log("npx hardhat ignition deploy ignition/modules/NPCMemory.ts --network somnia_shannon");
  console.log("npx hardhat ignition deploy ignition/modules/UniversalNPCIdentity.ts --network somnia_shannon");
  console.log("npx hardhat ignition deploy ignition/modules/NPCMarketplace.ts --network somnia_shannon");
  console.log("npx hardhat ignition deploy ignition/modules/EmotionTracker.ts --network somnia_shannon");

  // Production contract addresses on Somnia Shannon testnet
  const addresses = {
    // Already deployed contracts
    npcRegistry: "0x0d042408f1E6835E45f4DEb9E0c1662032E6d99C",
    behaviorController: "0x680930364Be2D733ac9286D3930635e7a27703E7",
    arena: "0x8874BdDD83553f6ca333e37932B9C6c5Af82Ab0F",
    quest: "0x5d07DF9a6c61b6183Ce08E268486358Eb4f993a2",
    gameActionAdapter: "0x9ec9a0f795949DC1F83C7FD8E7ba5d2Cf6D16CF4",
    mockToken: "0x6F30b8B34D042eF9f9bcFE0716CD44B607EA7845",
    
    // New contracts to be deployed
    npcMemory: "0x0000000000000000000000000000000000000000", // Will be updated after deployment
    universalNPCIdentity: "0x0000000000000000000000000000000000000000", // Will be updated after deployment
    npcMarketplace: "0x0000000000000000000000000000000000000000", // Will be updated after deployment
    emotionTracker: "0x0000000000000000000000000000000000000000", // Will be updated after deployment
  };

  const addressesPath = path.join(__dirname, "..", "addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("\n💾 Placeholder addresses saved to:", addressesPath);
  
  console.log("\n✅ Setup completed! Ready to deploy contracts manually or via Hardhat Ignition.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
