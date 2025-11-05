#!/bin/bash

# NPC Engine End-to-End Test Runner
# This script runs comprehensive E2E tests with real contracts and services

echo "🧪 NPC Engine End-to-End Test Suite"
echo "===================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

if [ -z "$SOMNIA_TESTNET_RPC_URL" ]; then
    echo "❌ SOMNIA_TESTNET_RPC_URL environment variable not set"
    exit 1
fi

if [ -z "$WALLET_PRIVATE_KEY" ]; then
    echo "❌ WALLET_PRIVATE_KEY environment variable not set"
    exit 1
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY environment variable not set"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing test dependencies..."
npm install --save-dev jest @types/jest ts-jest node-fetch @types/node-fetch
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build all packages
echo "🔨 Building all packages..."
npm run bootstrap
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Start services in background
echo "🚀 Starting services for testing..."

# Start A2A Gateway
cd packages/a2a-gateway
PORT=3000 node dist/index.js &
GATEWAY_PID=$!
echo "✅ A2A Gateway started (PID: $GATEWAY_PID)"

cd ../..

# Wait for services to be ready
echo "⏳ Waiting for services to initialize..."
sleep 10

# Check if gateway is responding
echo "🔍 Checking gateway health..."
curl -f http://localhost:3000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Gateway is healthy"
else
    echo "❌ Gateway health check failed"
    kill $GATEWAY_PID 2>/dev/null
    exit 1
fi

# Run E2E tests
echo "🧪 Running End-to-End Tests..."
echo "=============================="

# Run contract integration tests first
echo "🔗 Running contract integration tests..."
npx jest --config jest.e2e.config.js tests/e2e/contract-integration.test.ts --verbose
CONTRACT_TEST_RESULT=$?

# Run full system tests
echo "🤖 Running full system tests..."
npx jest --config jest.e2e.config.js tests/e2e/full-system-test.ts --verbose
SYSTEM_TEST_RESULT=$?

# Run real-world scenario tests
echo "🌍 Running real-world scenario tests..."
npx jest --config jest.e2e.config.js tests/e2e/real-world-scenarios.test.ts --verbose
SCENARIO_TEST_RESULT=$?

# Generate test report
echo ""
echo "📊 Test Results Summary"
echo "======================"

if [ $CONTRACT_TEST_RESULT -eq 0 ]; then
    echo "✅ Contract Integration Tests: PASSED"
else
    echo "❌ Contract Integration Tests: FAILED"
fi

if [ $SYSTEM_TEST_RESULT -eq 0 ]; then
    echo "✅ Full System Tests: PASSED"
else
    echo "❌ Full System Tests: FAILED"
fi

if [ $SCENARIO_TEST_RESULT -eq 0 ]; then
    echo "✅ Real-World Scenario Tests: PASSED"
else
    echo "❌ Real-World Scenario Tests: FAILED"
fi

# Calculate overall result
TOTAL_FAILURES=$((CONTRACT_TEST_RESULT + SYSTEM_TEST_RESULT + SCENARIO_TEST_RESULT))

echo ""
if [ $TOTAL_FAILURES -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED! NPC Engine is production ready!"
    echo ""
    echo "✅ Contract Integration: Working"
    echo "✅ AI Decision Making: Working"
    echo "✅ Emotional System: Working"
    echo "✅ Memory Management: Working"
    echo "✅ Marketplace: Working"
    echo "✅ Analytics: Working"
    echo "✅ Real-World Scenarios: Working"
    echo ""
    echo "🚀 The NPC Engine is fully validated and ready for production use!"
else
    echo "❌ Some tests failed. Please check the output above for details."
    echo "🔧 Fix the issues and run the tests again."
fi

# Cleanup
echo ""
echo "🧹 Cleaning up test environment..."
kill $GATEWAY_PID 2>/dev/null
echo "✅ Services stopped"

# Exit with appropriate code
exit $TOTAL_FAILURES