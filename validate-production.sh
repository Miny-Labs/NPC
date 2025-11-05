#!/bin/bash

# NPC Engine Production Validation Script
# Validates that the system is production-ready with real data and contracts

echo "🔍 NPC Engine Production Validation"
echo "==================================="

# Set environment variables
export SOMNIA_TESTNET_RPC_URL="https://dream-rpc.somnia.network"
export WALLET_PRIVATE_KEY="067a3c5ec060146dfe587ff74725aa501afb7c754078552e206c93e264339a9c"
export GEMINI_API_KEY="AIzaSyDYoROv091a-6l0p_tRITcstdVTiVysgvg"
export GEMINI_MODEL="gemini-flash-latest"

echo "✅ Environment variables configured"
echo "🔗 RPC URL: $SOMNIA_TESTNET_RPC_URL"
echo "🤖 Gemini Model: $GEMINI_MODEL"
echo "🔑 Wallet: ${WALLET_PRIVATE_KEY:0:6}..."

# Validate blockchain connection
echo ""
echo "🔗 Validating blockchain connection..."
curl -s -X POST $SOMNIA_TESTNET_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -q "result"

if [ $? -eq 0 ]; then
    echo "✅ Blockchain connection successful"
else
    echo "❌ Blockchain connection failed"
    exit 1
fi

# Validate Gemini API
echo ""
echo "🤖 Validating Gemini API connection..."
# Note: We'll validate this during the actual tests since it requires the full runtime

# Deploy and test the system
echo ""
echo "🚀 Deploying production system..."
./deploy-production.sh

if [ $? -ne 0 ]; then
    echo "❌ Production deployment failed"
    exit 1
fi

# Wait for services to stabilize
echo ""
echo "⏳ Waiting for services to stabilize..."
sleep 15

# Run comprehensive validation tests
echo ""
echo "🧪 Running production validation tests..."
./run-e2e-tests.sh

VALIDATION_RESULT=$?

echo ""
echo "📊 Production Validation Results"
echo "==============================="

if [ $VALIDATION_RESULT -eq 0 ]; then
    echo "🎉 PRODUCTION VALIDATION SUCCESSFUL!"
    echo ""
    echo "✅ All systems operational"
    echo "✅ Real blockchain integration working"
    echo "✅ AI decision making functional"
    echo "✅ No mock data detected"
    echo "✅ End-to-end workflows validated"
    echo ""
    echo "🚀 The NPC Engine is PRODUCTION READY!"
    echo ""
    echo "🌐 Access Points:"
    echo "  📋 Agent Card: http://localhost:3000/agent-card"
    echo "  📚 API Docs: http://localhost:3000/docs"
    echo "  💚 Health Check: http://localhost:3000/health"
    echo "  📊 Analytics: http://localhost:3000/analytics/report"
    echo "  🎨 NPC Builder: http://localhost:5173"
    echo ""
    echo "🧪 Test Commands:"
    echo "  npc-cli info"
    echo "  npc-cli marketplace list"
    echo "  npc-cli playtest list"
    echo "  npc-cli task open duel --params '{\"opponent\":\"0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d\",\"wager\":\"1000000000000000000\"}'"
    
else
    echo "❌ PRODUCTION VALIDATION FAILED"
    echo ""
    echo "🔧 Issues detected during validation"
    echo "📋 Please check the test output above for details"
    echo "🛠️ Fix the issues and run validation again"
fi

exit $VALIDATION_RESULT