const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Pitchforks Ecosystem Shared Contracts to NEO X...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

  // ============ Use Existing PFORK Token ============
  console.log("\n🪙 Using existing PFORK Token...");
  const PFORK_TOKEN_ADDRESS = "0x216490C8E6b33b4d8A2390dADcf9f433E30da60F";
  console.log("✅ PFORK Token address:", PFORK_TOKEN_ADDRESS);

  // ============ Deploy Governance Contract ============
  console.log("\n🏛️ Deploying Pitchforks Governance...");
  const PitchforksGovernance = await ethers.getContractFactory("PitchforksGovernance");
  const governance = await PitchforksGovernance.deploy(
    PFORK_TOKEN_ADDRESS,
    7 * 24 * 60 * 60, // 7 days voting period
    1000, // 10% quorum threshold (1000 basis points)
    2 * 24 * 60 * 60 // 2 days execution delay
  );
  await governance.deployed();
  console.log("✅ Governance deployed to:", governance.address);

  // ============ Deploy Treasury Contract ============
  console.log("\n🏦 Deploying Pitchforks Treasury...");
  const PitchforksTreasury = await ethers.getContractFactory("PitchforksTreasury");
  const treasury = await PitchforksTreasury.deploy(
    governance.address,
    PFORK_TOKEN_ADDRESS
  );
  await treasury.deployed();
  console.log("✅ Treasury deployed to:", treasury.address);

  // ============ Link Treasury to Governance ============
  console.log("\n🔗 Linking Treasury to Governance...");
  // Set treasury address in governance contract (two-step initialization)
  await governance.setTreasury(treasury.address);
  console.log("✅ Treasury linked to Governance");

  // ============ Initial Setup ============
  console.log("\n⚙️ Performing initial setup...");
  
  // Note: PFORK tokens already exist, no minting needed
  console.log("✅ Using existing PFORK token supply");

  // ============ Deploy Project-Specific Adapters ============
  console.log("\n🔌 Deploying Project Adapters...");
  
  // Protocol Adapter (funding contract will be set later)
  const ProtocolAdapter = await ethers.getContractFactory("ProtocolAdapter");
  const protocolAdapter = await ProtocolAdapter.deploy(
    governance.address,
    treasury.address,
    ethers.constants.AddressZero, // No funding contract yet
    PFORK_TOKEN_ADDRESS
  );
  await protocolAdapter.deployed();
  console.log("✅ Protocol Adapter deployed to:", protocolAdapter.address);

  // DEX Adapter (contracts will be set later)
  const DexAdapter = await ethers.getContractFactory("DexAdapter");
  const dexAdapter = await DexAdapter.deploy(
    governance.address,
    treasury.address,
    ethers.constants.AddressZero, // No liquidity pool yet
    ethers.constants.AddressZero, // No protected router yet
    PFORK_TOKEN_ADDRESS
  );
  await dexAdapter.deployed();
  console.log("✅ DEX Adapter deployed to:", dexAdapter.address);

  // Ferry Adapter (using existing deployed contracts)
  const FerryAdapter = await ethers.getContractFactory("FerryAdapter");
  const ferryAdapter = await FerryAdapter.deploy(
    governance.address,
    treasury.address,
    "0x81aC8AEDdaC85aA14011ab88944aA147472aC525", // Existing Ferry contract on Neo X
    PFORK_TOKEN_ADDRESS  // Using existing PFORK token
  );
  await ferryAdapter.deployed();
  console.log("✅ Ferry Adapter deployed to:", ferryAdapter.address);

  // ============ Initial Budget Allocations ============
  console.log("\n💰 Setting up budget allocations (no initial token allocation)...");
  
  // Note: Budget allocations are set up but no tokens are allocated
  // since we're using existing PFORK tokens that we don't control
  console.log("✅ Budget allocation framework ready (requires manual token transfers)");

  // ============ Generate Contract Registry ============
  console.log("\n📋 Generating contract registry for MCP server...");
  
  const contractAddresses = {
    PFORKToken: PFORK_TOKEN_ADDRESS,
    PitchforksGovernance: governance.address,
    PitchforksTreasury: treasury.address,
    ProtocolAdapter: protocolAdapter.address,
    DexAdapter: dexAdapter.address,
    FerryAdapter: ferryAdapter.address
  };

  // ============ Save Deployment Info ============
  const deploymentInfo = {
    network: "neo-x",
    chainId: 47763,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      PFORKToken: PFORK_TOKEN_ADDRESS,
      Governance: governance.address,
      Treasury: treasury.address,
      ProtocolAdapter: protocolAdapter.address,
      DexAdapter: dexAdapter.address,
      FerryAdapter: ferryAdapter.address
    },
    notes: "Using existing PFORK token at 0x216490C8E6b33b4d8A2390dADcf9f433E30da60F"
  };

  // Save to file for easy access
  const fs = require("fs");
  fs.writeFileSync(
    "./deployment-neo-x.json", 
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📄 Deployment info saved to deployment-neo-x.json");
  
  console.log("\n📋 Contract Addresses:");
  console.log("PFORK Token:", pforkToken.address);
  console.log("Governance:", governance.address);
  console.log("Treasury:", treasury.address);
  console.log("Protocol Adapter:", protocolAdapter.address);
  console.log("DEX Adapter:", dexAdapter.address);
  console.log("Ferry Adapter:", ferryAdapter.address);

  console.log("\n🔍 Verify on Neo X Explorer:");
  console.log(`https://xexplorer.neo.org/address/${pforkToken.address}`);
  console.log(`https://xexplorer.neo.org/address/${governance.address}`);
  console.log(`https://xexplorer.neo.org/address/${treasury.address}`);

  // ============ Generate Contract Registry ============
  console.log("\n📋 Generating contract registry for MCP integration...");
  const { execSync } = require("child_process");
  try {
    execSync("node scripts/generate-registry.js", { cwd: process.cwd(), stdio: "inherit" });
    console.log("✅ Contract registry generated successfully");
  } catch (error) {
    console.error("❌ Registry generation failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
