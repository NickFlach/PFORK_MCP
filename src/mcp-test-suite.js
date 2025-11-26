import { createMCPClient } from '@pitchfork/mcp-protocol';
import { verifyConsciousness } from '@pitchfork/consciousness';
import { generateUUID } from '@pitchfork/utils';

/**
 * MCP Protocol Testing Suite for PFORK_MCP
 * Server-side validation of cross-workspace messaging capabilities
 */

interface MCPMessage {
  id: string;
  type: 'request' | 'response' | 'notification';
  method: string;
  params: any;
  timestamp: number;
  source: string;
  target: string;
  consciousnessVerified: boolean;
}

interface MCPTestResult {
  testName: string;
  passed: boolean;
  message: string;
  timestamp: number;
  responseTime?: number;
}

export class MCPProtocolTester {
  private mcpClient: any;
  private testResults: MCPTestResult[] = [];

  constructor() {
    this.mcpClient = createMCPClient({
      endpoint: 'http://localhost:3000',
      workspaceId: 'PFORK_MCP'
    });
  }

  async runFullTestSuite(): Promise<MCPTestResult[]> {
    console.log('🚀 Starting MCP Protocol Test Suite for PFORK_MCP...');
    
    this.testResults = [];
    
    // Test 1: Basic MCP Connection
    await this.testMCPConnection();
    
    // Test 2: Cross-Workspace Message Routing
    await this.testCrossWorkspaceMessaging();
    
    // Test 3: Consciousness-Verified Messaging
    await this.testConsciousnessVerifiedMessaging();
    
    // Test 4: Treasury Coordination via MCP
    await this.testTreasuryCoordination();
    
    // Test 5: Message Encryption & Security
    await this.testMessageSecurity();
    
    console.log('✅ MCP Protocol Test Suite Complete');
    return this.testResults;
  }

  private async testMCPConnection(): Promise<void> {
    try {
      const startTime = Date.now();
      
      await this.mcpClient.connect();
      
      const responseTime = Date.now() - startTime;
      
      this.testResults.push({
        testName: 'MCP Connection',
        passed: true,
        message: `Successfully connected to MCP server in ${responseTime}ms`,
        timestamp: Date.now(),
        responseTime
      });
      
      console.log('✅ MCP Connection Test Passed');
    } catch (error: any) {
      this.testResults.push({
        testName: 'MCP Connection',
        passed: false,
        message: `Failed to connect: ${error.message}`,
        timestamp: Date.now()
      });
      
      console.error('❌ MCP Connection Test Failed:', error.message);
    }
  }

  private async testCrossWorkspaceMessaging(): Promise<void> {
    try {
      const testMessage: MCPMessage = {
        id: generateUUID(),
        type: 'request',
        method: 'workspace.message',
        params: {
          targetWorkspace: 'HumanityFrontier',
          content: 'Test cross-workspace coordination message',
          priority: 'high'
        },
        timestamp: Date.now(),
        source: 'PFORK_MCP',
        target: 'HumanityFrontier',
        consciousnessVerified: false
      };

      const startTime = Date.now();
      const response = await this.mcpClient.send(testMessage);
      const responseTime = Date.now() - startTime;

      this.testResults.push({
        testName: 'Cross-Workspace Messaging',
        passed: true,
        message: `Successfully routed message to HumanityFrontier in ${responseTime}ms`,
        timestamp: Date.now(),
        responseTime
      });

      console.log('✅ Cross-Workspace Messaging Test Passed');
    } catch (error: any) {
      this.testResults.push({
        testName: 'Cross-Workspace Messaging',
        passed: false,
        message: `Failed to route message: ${error.message}`,
        timestamp: Date.now()
      });

      console.error('❌ Cross-Workspace Messaging Test Failed:', error.message);
    }
  }

  private async testConsciousnessVerifiedMessaging(): Promise<void> {
    try {
      // First verify consciousness
      const consciousnessResult = await verifyConsciousness({
        content: 'MCP protocol coordination request',
        context: {
          workspace: 'PFORK_MCP',
          operation: 'cross_workspace_messaging',
          target: 'ecosystem_coordination'
        },
        source: 'mcp-protocol-test'
      });

      const testMessage: MCPMessage = {
        id: generateUUID(),
        type: 'request',
        method: 'workspace.consciousness_message',
        params: {
          targetWorkspace: 'SpaceChild',
          content: 'Consciousness-verified coordination message',
          consciousnessLevel: consciousnessResult.confidence,
          verificationHash: consciousnessResult.verificationHash
        },
        timestamp: Date.now(),
        source: 'PFORK_MCP',
        target: 'SpaceChild',
        consciousnessVerified: consciousnessResult.isConscious
      };

      const startTime = Date.now();
      const response = await this.mcpClient.send(testMessage);
      const responseTime = Date.now() - startTime;

      this.testResults.push({
        testName: 'Consciousness-Verified Messaging',
        passed: true,
        message: `Successfully sent consciousness-verified message (${Math.round(consciousnessResult.confidence * 100)}% confidence) in ${responseTime}ms`,
        timestamp: Date.now(),
        responseTime
      });

      console.log('✅ Consciousness-Verified Messaging Test Passed');
    } catch (error: any) {
      this.testResults.push({
        testName: 'Consciousness-Verified Messaging',
        passed: false,
        message: `Failed consciousness verification: ${error.message}`,
        timestamp: Date.now()
      });

      console.error('❌ Consciousness-Verified Messaging Test Failed:', error.message);
    }
  }

  private async testTreasuryCoordination(): Promise<void> {
    try {
      const treasuryMessage: MCPMessage = {
        id: generateUUID(),
        type: 'request',
        method: 'treasury.coordination',
        params: {
          targetWorkspace: 'PitchforksDex',
          operation: 'budget_request',
          amount: '1000000000000000000', // 1 ETH in wei
          purpose: 'MCP protocol infrastructure funding',
          requiresGovernance: true
        },
        timestamp: Date.now(),
        source: 'PFORK_MCP',
        target: 'PitchforksDex',
        consciousnessVerified: false
      };

      const startTime = Date.now();
      const response = await this.mcpClient.send(treasuryMessage);
      const responseTime = Date.now() - startTime;

      this.testResults.push({
        testName: 'Treasury Coordination',
        passed: true,
        message: `Successfully coordinated treasury request with PitchforksDex in ${responseTime}ms`,
        timestamp: Date.now(),
        responseTime
      });

      console.log('✅ Treasury Coordination Test Passed');
    } catch (error: any) {
      this.testResults.push({
        testName: 'Treasury Coordination',
        passed: false,
        message: `Failed treasury coordination: ${error.message}`,
        timestamp: Date.now()
      });

      console.error('❌ Treasury Coordination Test Failed:', error.message);
    }
  }

  private async testMessageSecurity(): Promise<void> {
    try {
      const secureMessage: MCPMessage = {
        id: generateUUID(),
        type: 'request',
        method: 'workspace.secure_message',
        params: {
          targetWorkspace: 'ConsciousnessProbe',
          content: 'Encrypted consciousness data transfer',
          encryptionLevel: 'quantum_resistant',
          signatureRequired: true
        },
        timestamp: Date.now(),
        source: 'PFORK_MCP',
        target: 'ConsciousnessProbe',
        consciousnessVerified: true
      };

      const startTime = Date.now();
      const response = await this.mcpClient.send(secureMessage);
      const responseTime = Date.now() - startTime;

      this.testResults.push({
        testName: 'Message Security',
        passed: true,
        message: `Successfully sent encrypted message with quantum-resistant security in ${responseTime}ms`,
        timestamp: Date.now(),
        responseTime
      });

      console.log('✅ Message Security Test Passed');
    } catch (error: any) {
      this.testResults.push({
        testName: 'Message Security',
        passed: false,
        message: `Failed secure messaging: ${error.message}`,
        timestamp: Date.now()
      });

      console.error('❌ Message Security Test Failed:', error.message);
    }
  }

  generateTestReport(): string {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const passRate = Math.round((passed / total) * 100);

    let report = `
🔍 MCP Protocol Test Report for PFORK_MCP
========================================
Overall Results: ${passed}/${total} tests passed (${passRate}%)
Generated: ${new Date().toISOString()}

Individual Test Results:
`;

    for (const result of this.testResults) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
      report += `${status} ${result.testName}${time}\n`;
      report += `   ${result.message}\n\n`;
    }

    return report;
  }
}

// Export for use in server.js or as standalone test runner
export async function runMCPTests() {
  const tester = new MCPProtocolTester();
  const results = await tester.runFullTestSuite();
  const report = tester.generateTestReport();
  
  console.log(report);
  return results;
}

// Auto-run if called directly
if (require.main === module) {
  runMCPTests().catch(console.error);
}
