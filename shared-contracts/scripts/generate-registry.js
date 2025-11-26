const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

async function main() {
  console.log("🔧 Generating comprehensive contract registry and ABI exports...");
  
  // Get all contract artifacts
  const contracts = {
    // Core contracts
    PFORKToken: await ethers.getContractFactory("PFORKToken"),
    PitchforksCore: await ethers.getContractFactory("PitchforksCore"),
    PitchforksGovernance: await ethers.getContractFactory("PitchforksGovernance"),
    PitchforksTreasury: await ethers.getContractFactory("PitchforksTreasury"),
    
    // Adapter contracts
    ProtocolAdapter: await ethers.getContractFactory("ProtocolAdapter"),
    DexAdapter: await ethers.getContractFactory("DexAdapter"),
    FerryAdapter: await ethers.getContractFactory("FerryAdapter"),
  };
  
  // Extract ABIs and bytecode
  const contractData = {};
  
  for (const [name, contractFactory] of Object.entries(contracts)) {
    const artifact = await hre.artifacts.readArtifact(name);
    contractData[name] = {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
      contractName: name,
      sourceName: artifact.sourceName,
      compilerVersion: artifact.compilerVersion,
    };
  }
  
  // Generate MCP API endpoint mapping
  const apiEndpoints = generateAPIEndpoints(contractData);
  
  // Create comprehensive registry
  const registry = {
    metadata: {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      network: "neo-x",
      chainId: 47763,
      description: "Pitchforks Ecosystem Smart Contract Registry for MCP Integration"
    },
    contracts: contractData,
    apiEndpoints: apiEndpoints,
    projectMapping: {
      PROTOCOL: {
        id: 0,
        name: "Protocol",
        contracts: ["PitchforksGovernance", "PitchforksTreasury", "ProtocolAdapter"],
        features: ["governance", "funding", "voting", "treasury"]
      },
      DEX: {
        id: 1,
        name: "DEX",
        contracts: ["PitchforksGovernance", "PitchforksTreasury", "DexAdapter"],
        features: ["trading", "liquidity", "swaps", "anti-mev"]
      },
      FERRY: {
        id: 2,
        name: "Ferry",
        contracts: ["PitchforksGovernance", "PitchforksTreasury", "FerryAdapter"],
        features: ["bridge", "cross-chain", "nft-minting", "relayer"]
      },
      ANALYST: {
        id: 3,
        name: "Analyst",
        contracts: ["PitchforksGovernance", "PitchforksTreasury"],
        features: ["analytics", "data-aggregation", "reporting"]
      },
      APP: {
        id: 4,
        name: "App",
        contracts: ["PitchforksGovernance", "PitchforksTreasury"],
        features: ["social", "messaging", "content"]
      }
    },
    eventIndexes: generateEventIndexes(contractData),
    functionMappings: generateFunctionMappings(contractData)
  };
  
  // Write registry files
  const outputDir = "./mcp-integration";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Main registry
  fs.writeFileSync(
    path.join(outputDir, "contract-registry.json"),
    JSON.stringify(registry, null, 2)
  );
  
  // Individual ABI files for easy import
  const abiDir = path.join(outputDir, "abis");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir);
  }
  
  for (const [name, data] of Object.entries(contractData)) {
    fs.writeFileSync(
      path.join(abiDir, `${name}.json`),
      JSON.stringify(data.abi, null, 2)
    );
  }
  
  // Generate TypeScript types
  const typesFile = generateTypeScriptTypes(registry);
  fs.writeFileSync(
    path.join(outputDir, "contracts.d.ts"),
    typesFile
  );
  
  // Generate MCP server configuration
  const mcpConfig = generateMCPConfig(registry);
  fs.writeFileSync(
    path.join(outputDir, "mcp-config.json"),
    JSON.stringify(mcpConfig, null, 2)
  );
  
  console.log("✅ Contract registry and ABI exports generated successfully!");
  console.log("📁 Output directory:", outputDir);
  console.log("📋 Generated files:");
  console.log("  - contract-registry.json (main registry)");
  console.log("  - abis/ (individual contract ABIs)");
  console.log("  - contracts.d.ts (TypeScript types)");
  console.log("  - mcp-config.json (MCP server config)");
}

function generateAPIEndpoints(contractData) {
  const endpoints = {
    // Protocol endpoints
    protocol: {
      "get-whitepaper": {
        method: "GET",
        path: "/api/whitepaper",
        contract: "ProtocolAdapter",
        function: "getWhitepaper",
        description: "Retrieve the current whitepaper content"
      },
      "get-governance-proposals": {
        method: "GET",
        path: "/api/governance/proposals",
        contract: "PitchforksGovernance",
        function: "getAllProposals",
        description: "List all active governance proposals"
      },
      "get-proposal-details": {
        method: "GET",
        path: "/api/governance/proposals/{id}",
        contract: "PitchforksGovernance",
        function: "getProposal",
        description: "Get details of a specific proposal"
      },
      "submit-proposal": {
        method: "POST",
        path: "/api/governance/proposals",
        contract: "PitchforksGovernance",
        function: "createProposal",
        description: "Create a new governance proposal"
      },
      "vote-on-proposal": {
        method: "POST",
        path: "/api/governance/proposals/{id}/vote",
        contract: "PitchforksGovernance",
        function: "vote",
        description: "Cast a vote on a proposal"
      },
      "get-protocol-stats": {
        method: "GET",
        path: "/api/stats",
        contract: "ProtocolAdapter",
        function: "getProtocolStats",
        description: "Get overall protocol statistics"
      },
      "get-token-info": {
        method: "GET",
        path: "/api/token",
        contract: "PFORKToken",
        function: "getTokenInfo",
        description: "Get PFORK token information"
      }
    },
    
    // DEX endpoints
    dex: {
      "get-token-pairs": {
        method: "GET",
        path: "/api/pairs",
        contract: "DexAdapter",
        function: "getSupportedTokens",
        description: "List all available trading pairs"
      },
      "get-token-price": {
        method: "GET",
        path: "/api/price/{token}",
        contract: "DexAdapter",
        function: "getTokenPrice",
        description: "Get current price for a token"
      },
      "get-liquidity-pools": {
        method: "GET",
        path: "/api/pools",
        contract: "DexAdapter",
        function: "getPoolInfo",
        description: "List liquidity pools and TVL"
      },
      "get-swap-quote": {
        method: "POST",
        path: "/api/swap/quote",
        contract: "DexAdapter",
        function: "getSwapQuote",
        description: "Get a quote for a token swap"
      },
      "execute-swap": {
        method: "POST",
        path: "/api/swap/execute",
        contract: "DexAdapter",
        function: "swapWithGovernance",
        description: "Execute a token swap"
      },
      "add-liquidity": {
        method: "POST",
        path: "/api/pools/add",
        contract: "DexAdapter",
        function: "addLiquidityWithGovernance",
        description: "Add liquidity to a pool"
      },
      "get-dex-stats": {
        method: "GET",
        path: "/api/stats",
        contract: "DexAdapter",
        function: "getDexStats",
        description: "Get overall DEX statistics"
      }
    },
    
    // Ferry endpoints
    ferry: {
      "get-bridge-status": {
        method: "GET",
        path: "/api/bridge/status",
        contract: "FerryAdapter",
        function: "getBridgeStats",
        description: "Check if bridge is operational"
      },
      "get-supported-tokens": {
        method: "GET",
        path: "/api/bridge/tokens",
        contract: "FerryAdapter",
        function: "getSupportedTokens",
        description: "List tokens that can be bridged"
      },
      "get-bridge-quote": {
        method: "POST",
        path: "/api/bridge/quote",
        contract: "FerryAdapter",
        function: "getBridgeQuote",
        description: "Get quote for bridging tokens"
      },
      "initiate-bridge": {
        method: "POST",
        path: "/api/bridge/initiate",
        contract: "FerryAdapter",
        function: "bridgeOutWithGovernance",
        description: "Start a bridge transaction"
      },
      "get-bridge-history": {
        method: "GET",
        path: "/api/bridge/history/{address}",
        contract: "FerryAdapter",
        function: "getBridgeHistory",
        description: "Get user's bridge history"
      }
    },
    
    // Treasury endpoints
    treasury: {
      "get-treasury-balance": {
        method: "GET",
        path: "/api/treasury/balance",
        contract: "PitchforksTreasury",
        function: "getTreasuryBalance",
        description: "Get total treasury balance"
      },
      "get-budget-allocations": {
        method: "GET",
        path: "/api/treasury/allocations",
        contract: "PitchforksTreasury",
        function: "getAllBudgetDetails",
        description: "Get all project budget allocations"
      },
      "withdraw-funds": {
        method: "POST",
        path: "/api/treasury/withdraw",
        contract: "PitchforksTreasury",
        function: "withdrawFunds",
        description: "Withdraw funds from project budget"
      }
    }
  };
  
  return endpoints;
}

function generateEventIndexes(contractData) {
  const events = {};
  
  for (const [contractName, data] of Object.entries(contractData)) {
    const contractEvents = data.abi.filter(item => item.type === 'event');
    events[contractName] = contractEvents.map(event => ({
      name: event.name,
      inputs: event.inputs,
      signature: `${event.name}(${event.inputs.map(i => i.type).join(',')})`,
      topic: ethers.utils.id(`${event.name}(${event.inputs.map(i => i.type).join(',')})`)
    }));
  }
  
  return events;
}

function generateFunctionMappings(contractData) {
  const functions = {};
  
  for (const [contractName, data] of Object.entries(contractData)) {
    const contractFunctions = data.abi.filter(item => item.type === 'function');
    functions[contractName] = contractFunctions.map(func => ({
      name: func.name,
      inputs: func.inputs,
      outputs: func.outputs,
      stateMutability: func.stateMutability,
      signature: func.signature
    }));
  }
  
  return functions;
}

function generateTypeScriptTypes(registry) {
  return `
// Generated TypeScript types for Pitchforks Ecosystem contracts
// Generated at: ${new Date().toISOString()}

export interface ContractRegistry {
  metadata: {
    version: string;
    generatedAt: string;
    network: string;
    chainId: number;
    description: string;
  };
  contracts: Record<string, ContractInfo>;
  apiEndpoints: Record<string, APIEndpoint>;
  projectMapping: Record<string, ProjectInfo>;
}

export interface ContractInfo {
  abi: any[];
  bytecode: string;
  deployedBytecode: string;
  contractName: string;
  sourceName: string;
  compilerVersion: string;
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  contract: string;
  function: string;
  description: string;
}

export interface ProjectInfo {
  id: number;
  name: string;
  contracts: string[];
  features: string[];
}

// Project enum
export enum Project {
  PROTOCOL = 0,
  DEX = 1,
  FERRY = 2,
  ANALYST = 3,
  APP = 4
}

// Contract addresses (to be populated after deployment)
export interface ContractAddresses {
  PFORKToken: string;
  PitchforksGovernance: string;
  PitchforksTreasury: string;
  ProtocolAdapter: string;
  DexAdapter: string;
  FerryAdapter: string;
}

// Event signatures for easy filtering
export const EventSignatures = ${JSON.stringify(registry.eventIndexes, null, 2)};

// Function mappings for API routing
export const FunctionMappings = ${JSON.stringify(registry.functionMappings, null, 2)};
`;
}

function generateMCPConfig(registry) {
  return {
    server: {
      name: "pitchforks-ecosystem-mcp",
      version: "1.0.0",
      description: "MCP server for Pitchforks ecosystem integration"
    },
    blockchain: {
      network: "neo-x",
      chainId: 47763,
      rpcUrl: "https://mainnet-2.rpc.banelabs.org",
      explorerUrl: "https://xexplorer.neo.org"
    },
    contracts: {
      // These will be populated after deployment
      addresses: {
        PFORKToken: "DEPLOYED_ADDRESS",
        PitchforksGovernance: "DEPLOYED_ADDRESS",
        PitchforksTreasury: "DEPLOYED_ADDRESS",
        ProtocolAdapter: "DEPLOYED_ADDRESS",
        DexAdapter: "DEPLOYED_ADDRESS",
        FerryAdapter: "DEPLOYED_ADDRESS"
      },
      abis: {
        PFORKToken: "./abis/PFORKToken.json",
        PitchforksGovernance: "./abis/PitchforksGovernance.json",
        PitchforksTreasury: "./abis/PitchforksTreasury.json",
        ProtocolAdapter: "./abis/ProtocolAdapter.json",
        DexAdapter: "./abis/DexAdapter.json",
        FerryAdapter: "./abis/FerryAdapter.json"
      }
    },
    api: registry.apiEndpoints,
    features: {
      eventStreaming: true,
      realTimeUpdates: true,
      caching: true,
      rateLimit: {
        public: 100, // requests per minute
        authenticated: 1000,
        writeOperations: 10
      }
    }
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Registry generation failed:", error);
    process.exit(1);
  });
