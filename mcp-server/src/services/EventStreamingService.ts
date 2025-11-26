import { WebSocketServer, WebSocket } from 'ws';
import { ethers } from 'ethers';
import { ContractRegistry } from './ContractRegistry';
import { Logger } from '../utils/Logger';
import * as contractRegistry from '../contracts/contract-registry.json';

interface EventSubscription {
  ws: WebSocket;
  filters: EventFilters;
  id: string;
  subscribedAt: Date;
}

interface EventFilters {
  contracts?: string[];
  events?: string[];
  addresses?: string[];
  fromBlock?: number;
  toBlock?: number;
}

interface ProcessedEvent {
  contractName: string;
  eventName: string;
  address: string;
  blockNumber: number;
  transactionHash: string;
  args: any[];
  timestamp: Date;
}

export class EventStreamingService {
  private wss: WebSocketServer;
  private contractRegistry: ContractRegistry;
  private provider: ethers.FallbackProvider;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventListeners: Map<string, ethers.Contract> = new Map();
  private logger: Logger;
  private isRunning: boolean = false;
  private processingQueue: ProcessedEvent[] = [];
  private batchSize: number = 100;
  private batchTimeout: number = 5000; // 5 seconds

  constructor(contractRegistry: ContractRegistry, wss: WebSocketServer) {
    this.contractRegistry = contractRegistry;
    this.wss = wss;
    this.provider = contractRegistry.getProvider();
    this.logger = new Logger('EventStreamingService');
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Event streaming service already running');
      return;
    }

    try {
      await this.initializeEventListeners();
      this.startBatchProcessor();
      this.isRunning = true;
      
      this.logger.info('Event streaming service started', {
        listenerCount: this.eventListeners.size,
        batchSize: this.batchSize,
        batchTimeout: this.batchTimeout
      });
    } catch (error) {
      this.logger.error('Failed to start event streaming service:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Remove all event listeners
    for (const [contractName, contract] of this.eventListeners) {
      try {
        contract.removeAllListeners();
        this.logger.info(`Removed listeners for ${contractName}`);
      } catch (error) {
        this.logger.error(`Failed to remove listeners for ${contractName}:`, error);
      }
    }
    
    this.eventListeners.clear();
    this.subscriptions.clear();
    
    this.logger.info('Event streaming service stopped');
  }

  private async initializeEventListeners(): Promise<void> {
    const eventSignatures = contractRegistry.eventIndexes;
    
    for (const [contractName, events] of Object.entries(eventSignatures)) {
      const contract = this.contractRegistry.getContract(contractName);
      if (!contract) {
        this.logger.warn(`Contract not found for event listening: ${contractName}`);
        continue;
      }

      try {
        // Set up listeners for all events in the contract
        for (const eventConfig of events) {
          contract.on(eventConfig.name, (...args: any[]) => {
            this.handleEvent(contractName, eventConfig.name, args);
          });
        }
        
        this.eventListeners.set(contractName, contract);
        this.logger.info(`Event listeners initialized for ${contractName}`, {
          eventCount: events.length
        });
      } catch (error) {
        this.logger.error(`Failed to initialize event listeners for ${contractName}:`, error);
      }
    }
  }

  private handleEvent(contractName: string, eventName: string, args: any[]): void {
    try {
      // Extract event data
      const event = args[args.length - 1]; // Last argument is the event object
      const processedEvent: ProcessedEvent = {
        contractName,
        eventName,
        address: event.address,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        args: args.slice(0, -1), // All arguments except the event object
        timestamp: new Date()
      };

      // Add to processing queue
      this.processingQueue.push(processedEvent);
      
      this.logger.debug(`Event queued: ${contractName}.${eventName}`, {
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      });

      // Process immediately if queue is getting large
      if (this.processingQueue.length >= this.batchSize) {
        this.processBatch();
      }
    } catch (error) {
      this.logger.error(`Failed to handle event ${contractName}.${eventName}:`, error);
    }
  }

  private startBatchProcessor(): void {
    setInterval(() => {
      if (this.processingQueue.length > 0) {
        this.processBatch();
      }
    }, this.batchTimeout);
  }

  private processBatch(): void {
    if (this.processingQueue.length === 0) {
      return;
    }

    const batch = this.processingQueue.splice(0, this.batchSize);
    
    this.logger.info(`Processing event batch`, {
      batchSize: batch.length,
      remainingInQueue: this.processingQueue.length
    });

    // Filter and broadcast events to subscribers
    for (const event of batch) {
      this.broadcastEvent(event);
    }
  }

  private broadcastEvent(event: ProcessedEvent): void {
    const message = JSON.stringify({
      type: 'event',
      data: event,
      timestamp: new Date().toISOString()
    });

    let sentCount = 0;
    
    for (const [subscriptionId, subscription] of this.subscriptions) {
      if (this.shouldSendEvent(event, subscription.filters)) {
        try {
          subscription.ws.send(message);
          sentCount++;
        } catch (error) {
          this.logger.warn(`Failed to send event to subscription ${subscriptionId}:`, error);
          // Remove dead subscription
          this.removeSubscription(subscriptionId);
        }
      }
    }

    if (sentCount > 0) {
      this.logger.debug(`Event broadcasted to ${sentCount} subscribers`, {
        contractName: event.contractName,
        eventName: event.eventName,
        blockNumber: event.blockNumber
      });
    }
  }

  private shouldSendEvent(event: ProcessedEvent, filters: EventFilters): boolean {
    // Filter by contract name
    if (filters.contracts && filters.contracts.length > 0) {
      if (!filters.contracts.includes(event.contractName)) {
        return false;
      }
    }

    // Filter by event name
    if (filters.events && filters.events.length > 0) {
      if (!filters.events.includes(event.eventName)) {
        return false;
      }
    }

    // Filter by address
    if (filters.addresses && filters.addresses.length > 0) {
      if (!filters.addresses.includes(event.address.toLowerCase())) {
        return false;
      }
    }

    // Filter by block range
    if (filters.fromBlock !== undefined && event.blockNumber < filters.fromBlock) {
      return false;
    }

    if (filters.toBlock !== undefined && event.blockNumber > filters.toBlock) {
      return false;
    }

    return true;
  }

  public async subscribe(ws: WebSocket, filters: EventFilters): Promise<string> {
    const subscriptionId = this.generateSubscriptionId();
    
    const subscription: EventSubscription = {
      ws,
      filters,
      id: subscriptionId,
      subscribedAt: new Date()
    };

    this.subscriptions.set(subscriptionId, subscription);
    
    this.logger.info('New subscription created', {
      subscriptionId,
      filters,
      totalSubscriptions: this.subscriptions.size
    });

    // Send historical events if requested
    if (filters.fromBlock !== undefined) {
      await this.sendHistoricalEvents(ws, filters);
    }

    return subscriptionId;
  }

  public async unsubscribe(ws: WebSocket, filters: EventFilters): Promise<void> {
    const toRemove: string[] = [];
    
    for (const [subscriptionId, subscription] of this.subscriptions) {
      if (subscription.ws === ws) {
        // If no specific filters, remove all subscriptions for this WebSocket
        if (Object.keys(filters).length === 0) {
          toRemove.push(subscriptionId);
        } else {
          // Otherwise, check if filters match
          if (this.filtersMatch(subscription.filters, filters)) {
            toRemove.push(subscriptionId);
          }
        }
      }
    }

    for (const subscriptionId of toRemove) {
      this.subscriptions.delete(subscriptionId);
    }

    this.logger.info('Subscriptions removed', {
      removedCount: toRemove.length,
      totalSubscriptions: this.subscriptions.size
    });
  }

  private removeSubscription(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
    this.logger.debug('Subscription removed due to error', {
      subscriptionId,
      totalSubscriptions: this.subscriptions.size
    });
  }

  private filtersMatch(filters1: EventFilters, filters2: EventFilters): boolean {
    // Simple filter matching - can be enhanced for more complex scenarios
    const keys1 = Object.keys(filters1);
    const keys2 = Object.keys(filters2);
    
    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (JSON.stringify(filters1[key as keyof EventFilters]) !== 
          JSON.stringify(filters2[key as keyof EventFilters])) {
        return false;
      }
    }

    return true;
  }

  private async sendHistoricalEvents(ws: WebSocket, filters: EventFilters): Promise<void> {
    try {
      const fromBlock = filters.fromBlock || 0;
      const toBlock = filters.toBlock || 'latest';
      
      this.logger.info('Sending historical events', {
        fromBlock,
        toBlock,
        filters
      });

      // This would involve querying historical events from the blockchain
      // For now, we'll implement a simplified version
      const historicalEvents = await this.queryHistoricalEvents(fromBlock, toBlock, filters);
      
      for (const event of historicalEvents) {
        const message = JSON.stringify({
          type: 'historical_event',
          data: event,
          timestamp: new Date().toISOString()
        });
        
        ws.send(message);
      }
      
      this.logger.info(`Sent ${historicalEvents.length} historical events`);
    } catch (error) {
      this.logger.error('Failed to send historical events:', error);
    }
  }

  private async queryHistoricalEvents(
    fromBlock: number | 'latest',
    toBlock: number | 'latest',
    filters: EventFilters
  ): Promise<ProcessedEvent[]> {
    // Simplified historical event query
    // In a production environment, this would use efficient indexing
    const events: ProcessedEvent[] = [];
    
    // For now, return empty array - would implement actual querying
    return events;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getSubscriptionStats(): {
    totalSubscriptions: number;
    activeContracts: number;
    queuedEvents: number;
    isRunning: boolean;
  } {
    return {
      totalSubscriptions: this.subscriptions.size,
      activeContracts: this.eventListeners.size,
      queuedEvents: this.processingQueue.length,
      isRunning: this.isRunning
    };
  }

  public async getEventHistory(
    contractName: string,
    eventName: string,
    fromBlock: number = 0,
    toBlock: number | 'latest' = 'latest',
    limit: number = 100
  ): Promise<ProcessedEvent[]> {
    try {
      const contract = this.contractRegistry.getContract(contractName);
      if (!contract) {
        throw new Error(`Contract not found: ${contractName}`);
      }

      const eventFilter = contract.filters[eventName]();
      const events = await contract.queryFilter(eventFilter, fromBlock, toBlock);
      
      const processedEvents: ProcessedEvent[] = events.slice(-limit).map(event => ({
        contractName,
        eventName,
        address: event.address,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        args: event.args ? Array.from(event.args) : [],
        timestamp: new Date()
      }));

      return processedEvents;
    } catch (error) {
      this.logger.error(`Failed to get event history for ${contractName}.${eventName}:`, error);
      throw error;
    }
  }
}
