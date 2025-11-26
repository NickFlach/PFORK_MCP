const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Pitchforks Ecosystem Shared Contracts to NEO X...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

  // ============ Deploy PFORK Token (if needed) ============
  console.log("\n🪙 Deploying PFORK Token...");
  const PFORKToken = await ethers.getContractFactory("PFORKToken");
  const pforkToken = await PFORKToken.deploy();
  await pforkToken.deployed();
  console.log("✅ PFORK Token deployed to:", pforkToken.address);

  // ============ Deploy Governance Contract ============
  console.log("\n🏛️ Deploying Pitchforks Governance...");
  const PitchforksGovernance = await ethers.getContractFactory("PitchforksGovernance");
  const governance = await PitchforksGovernance.deploy(
    pforkToken.address,
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
    pforkToken.address
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
  
  // Mint initial PFORK tokens for ecosystem
  const initialSupply = ethers.utils.parseEther("100000000"); // 100M tokens
  await pforkToken.mint(deployer.address, initialSupply);
  console.log("✅ Minted 100M PFORK tokens to deployer");

  // Transfer some PFORK to Treasury for initial funding
  const treasuryFunding = ethers.utils.parseEther("10000000"); // 10M tokens
  await pforkToken.transfer(treasury.address, treasuryFunding);
  console.log("✅ Transferred 10M PFORK tokens to Treasury");

  // ============ Deploy Project-Specific Adapters ============
  console.log("\n🔌 Deploying Project Adapters...");
  
  // Protocol Adapter (funding contract will be set later)
  const ProtocolAdapter = await ethers.getContractFactory("ProtocolAdapter");
  const protocolAdapter = await ProtocolAdapter.deploy(
    governance.address,
    treasury.address,
    ethers.constants.AddressZero, // No funding contract yet
    pforkToken.address
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
    pforkToken.address
  );
  await dexAdapter.deployed();
  console.log("✅ DEX Adapter deployed to:", dexAdapter.address);

  // Ferry Adapter (using existing deployed contracts)
  const FerryAdapter = await ethers.getContractFactory("FerryAdapter");
  const ferryAdapter = await FerryAdapter.deploy(
    governance.address,
    treasury.address,
    "0x81aC8AEDdaC85aA14011ab88944aA147472aC525", // Existing Ferry contract on Neo X
    "0x536d98Ad83F7d0230B9384e606208802ECD728FE"  // Existing PFORK token on Neo X
  );
  await ferryAdapter.deployed();
  console.log("✅ Ferry Adapter deployed to:", ferryAdapter.address);

  // ============ Initial Budget Allocations ============
  console.log("\n💰 Allocating initial budgets...");
  
  // Allocate PFORK tokens to each project
  const protocolBudget = ethers.utils.parseEther("1000000"); // 1M PFORK
  const dexBudget = ethers.utils.parseEther("2000000"); // 2M PFORK
  const ferryBudget = ethers.utils.parseEther("500000"); // 0.5M PFORK

  await treasury.allocateBudget(
    0, // Project.PROTOCOL
    pforkToken.address,
    protocolBudget,
    ethers.utils.parseEther("10000"), // 10K PFORK per withdrawal
    ethers.utils.parseEther("50000")  // 50K PFORK daily limit
  );
  console.log("✅ Allocated 1M PFORK to Protocol");

  await treasury.allocateBudget(
    1, // Project.DEX
    pforkToken.address,
    dexBudget,
    ethers.utils.parseEther("20000"), // 20K PFORK per withdrawal
    ethers.utils.parseEther("100000") // 100K PFORK daily limit
  );
  console.log("✅ Allocated 2M PFORK to DEX");

  await treasury.allocateBudget(
    2, // Project.FERRY
    pforkToken.address,
    ferryBudget,
    ethers.utils.parseEther("5000"), // 5K PFORK per withdrawal
    ethers.utils.parseEther("25000") // 25K PFORK daily limit
  );
  console.log("✅ Allocated 0.5M PFORK to Ferry");

  // ============ Save Deployment Info ============
  const deploymentInfo = {
    network: "neo-x",
    chainId: 47763,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      PFORKToken: pforkToken.address,
      Governance: governance.address,
      Treasury: treasury.address,
      ProtocolAdapter: protocolAdapter.address,
      DexAdapter: dexAdapter.address,
      FerryAdapter: ferryAdapter.address
    },
    initialAllocations: {
      protocol: ethers.utils.formatEther(protocolBudget),
      dex: ethers.utils.formatEther(dexBudget),
      ferry: ethers.utils.formatEther(ferryBudget)
    }
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
