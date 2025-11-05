import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Extend Jest timeout for E2E tests
jest.setTimeout(60000);

// Global test setup
beforeAll(async () => {
  console.log('🔧 Setting up E2E test environment...');
  
  // Verify required environment variables
  const requiredEnvVars = [
    'SOMNIA_TESTNET_RPC_URL',
    'WALLET_PRIVATE_KEY',
    'GEMINI_API_KEY',
    'GEMINI_MODEL'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  console.log('✅ Environment variables validated');
  console.log(`🔗 RPC URL: ${process.env.SOMNIA_TESTNET_RPC_URL}`);
  console.log(`🤖 Gemini Model: ${process.env.GEMINI_MODEL}`);
  console.log(`🔑 Wallet: ${process.env.WALLET_PRIVATE_KEY?.slice(0, 6)}...`);
});

afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  // Add any cleanup logic here
});