import { ethers, FallbackProvider, BrowserProvider, JsonRpcProvider } from 'ethers';
import { Logger } from '../utils/Logger';
import * as contractRegistry from '../contracts/contract-registry.json';

interface ContractConfig {
  address: string;
  abi: any[];
  name: string;
}

interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrls: string[];
  explorerUrl: string;
}

export class ContractRegistry {
  private provider: FallbackProvider;
  private contracts: Map<string, ethers.Contract> = new Map();
  private networkConfig: NetworkConfig;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ContractRegistry');
    
    // Initialize network configuration
    this.networkConfig = {
      name: process.env.NETWORK || 'neo-x',
      chainId: parseInt(process.env.CHAIN_ID || '47763'),
      rpcUrls: process.env.RPC_URLS?.split(',') || [
        'https://mainnet-2.rpc.banelabs.org',
        'https://mainnet-1.rpc.banelabs.org',
        'https://neo-x.rpc.thirdweb.com'
      ],
      explorerUrl: process.env.EXPLORER_URL || 'https://xexplorer.neo.org'
    };
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize provider with fallback configuration
      await this.initializeProvider();
      
      // Initialize all contracts
      await this.initializeContracts();
      
      this.logger.info(`Contract registry initialized for ${this.networkConfig.name}`, {
        chainId: this.networkConfig.chainId,
        contractCount: this.contracts.size,
        providerCount: this.networkConfig.rpcUrls.length
      });
    } catch (error) {
      this.logger.error('Failed to initialize contract registry:', error);
      throw error;
    }
  }

  private async initializeProvider(): Promise<void> {
    // Create multiple providers for redundancy
    const providers: JsonRpcProvider[] = [];
    
    for (const rpcUrl of this.networkConfig.rpcUrls) {
      try {
        const provider = new JsonRpcProvider(rpcUrl, {
          chainId: this.networkConfig.chainId,
          name: this.networkConfig.name
        });
        
        // Test provider connection
        await provider.getNetwork();
        providers.push(provider);
        
        this.logger.info(`Provider connected: ${rpcUrl}`);
      } catch (error) {
        this.logger.warn(`Failed to connect to provider ${rpcUrl}:`, error);
      }
    }

    if (providers.length === 0) {
      throw new Error('No providers available');
    }

    // Create fallback provider with automatic failover
    this.provider = new FallbackProvider(providers.map(p => ({
      provider: p,
      priority: 1,
      stallTimeout: 2000,
      weight: 1
    })));

    // Test fallback provider
    const network = await this.provider.getNetwork();
    this.logger.info(`Fallback provider ready`, {
      chainId: network.chainId.toString(),
      name: network.name
    });
  }

  private async initializeContracts(): Promise<void> {
    const deployedAddresses = this.getDeployedAddresses();
    
    for (const [contractName, contractConfig] of Object.entries(contractRegistry.contracts)) {
      const address = deployedAddresses[contractName];
      
      if (!address) {
        this.logger.warn(`No address found for contract: ${contractName}`);
        continue;
      }

      try {
        const contract = new ethers.Contract(address, contractConfig.abi, this.provider);
        this.contracts.set(contractName, contract);
        
        // Test contract connection
        const code = await this.provider.getCode(address);
        if (code === '0x') {
          this.logger.warn(`Contract not deployed at address: ${address}`);
          this.contracts.delete(contractName);
        } else {
          this.logger.info(`Contract initialized: ${contractName} at ${address}`);
        }
      } catch (error) {
        this.logger.error(`Failed to initialize contract ${contractName}:`, error);
      }
    }
  }

  private getDeployedAddresses(): Record<string, string> {
    // Try to load from environment variables or deployment file
    if (process.env.CONTRACT_ADDRESSES) {
      return JSON.parse(process.env.CONTRACT_ADDRESSES);
    }

    // Fallback to hardcoded addresses for development
    return {
      PFORKToken: process.env.PFORK_TOKEN_ADDRESS || '',
      PitchforksGovernance: process.env.GOVERNANCE_ADDRESS || '',
      PitchforksTreasury: process.env.TREASURY_ADDRESS || '',
      ProtocolAdapter: process.env.PROTOCOL_ADAPTER_ADDRESS || '',
      DexAdapter: process.env.DEX_ADAPTER_ADDRESS || '',
      FerryAdapter: process.env.FERRY_ADAPTER_ADDRESS || ''
    };
  }

  public getContract(name: string): ethers.Contract | null {
    return this.contracts.get(name) || null;
  }

  public getContractWithSigner(name: string, signer: ethers.Signer): ethers.Contract | null {
    const contract = this.contracts.get(name);
    if (!contract) return null;
    
    return contract.connect(signer);
  }

  public getProvider(): FallbackProvider {
    return this.provider;
  }

  public async getSigner(privateKey?: string): Promise<ethers.Signer> {
    if (privateKey) {
      return new ethers.Wallet(privateKey, this.provider);
    }
    
    // For browser environments, this would connect to MetaMask
    throw new Error('Private key required for server-side signing');
  }

  public getNetworkConfig(): NetworkConfig {
    return this.networkConfig;
  }

  public getContractAbi(name: string): any[] | null {
    const contractConfig = contractRegistry.contracts[name as keyof typeof contractRegistry.contracts];
    return contractConfig?.abi || null;
  }

  public async validateContract(name: string, address: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      this.logger.error(`Failed to validate contract ${name}:`, error);
      return false;
    }
  }

  public async getContractInfo(name: string): Promise<{
    name: string;
    address: string;
    deployed: boolean;
    abi: any[];
  } | null> {
    const contract = this.contracts.get(name);
    if (!contract) return null;

    try {
      const address = await contract.getAddress();
      const deployed = await this.validateContract(name, address);
      const abi = this.getContractAbi(name) || [];

      return {
        name,
        address,
        deployed,
        abi
      };
    } catch (error) {
      this.logger.error(`Failed to get contract info for ${name}:`, error);
      return null;
    }
  }

  public async getSystemStatus(): Promise<{
    network: NetworkConfig;
    providerStatus: string;
    contractCount: number;
    contracts: Array<{
      name: string;
      address: string;
      deployed: boolean;
    }>;
  }> {
    const contractStatuses = [];
    
    for (const [name] of this.contracts) {
      const info = await this.getContractInfo(name);
      if (info) {
        contractStatuses.push({
          name: info.name,
          address: info.address,
          deployed: info.deployed
        });
      }
    }

    // Test provider status
    let providerStatus = 'healthy';
    try {
      await this.provider.getNetwork();
    } catch (error) {
      providerStatus = 'unhealthy';
      this.logger.error('Provider health check failed:', error);
    }

    return {
      network: this.networkConfig,
      providerStatus,
      contractCount: this.contracts.size,
      contracts: contractStatuses
    };
  }

  // Utility methods for common contract interactions
  public async callContractMethod(
    contractName: string,
    methodName: string,
    ...args: any[]
  ): Promise<any> {
    const contract = this.getContract(contractName);
    if (!contract) {
      throw new Error(`Contract not found: ${contractName}`);
    }

    try {
      const result = await contract[methodName](...args);
      return result;
    } catch (error) {
      this.logger.error(`Failed to call ${contractName}.${methodName}:`, error);
      throw error;
    }
  }

  public async sendTransaction(
    contractName: string,
    methodName: string,
    signer: ethers.Signer,
    ...args: any[]
  ): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner(contractName, signer);
    if (!contract) {
      throw new Error(`Contract not found: ${contractName}`);
    }

    try {
      const tx = await contract[methodName](...args);
      this.logger.info(`Transaction sent: ${contractName}.${methodName}`, {
        hash: tx.hash,
        from: signer.getAddress()
      });
      
      return tx;
    } catch (error) {
      this.logger.error(`Failed to send transaction ${contractName}.${methodName}:`, error);
      throw error;
    }
  }

  public async waitForTransaction(
    txHash: string,
    confirmations: number = 1
  ): Promise<ethers.TransactionReceipt> {
    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations);
      return receipt;
    } catch (error) {
      this.logger.error(`Failed to wait for transaction ${txHash}:`, error);
      throw error;
    }
  }
}
