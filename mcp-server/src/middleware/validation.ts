import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/Logger';

export const schemas = {
  // Protocol schemas
  createProposal: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    targetProject: Joi.number().integer().min(0).max(4).required(),
    actionData: Joi.string().max(1000).optional()
  }),

  castVote: Joi.object({
    support: Joi.boolean().required(),
    reason: Joi.string().max(500).optional()
  }),

  createCampaign: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    goalAmount: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    durationDays: Joi.number().integer().min(1).max(90).required(),
    requiresGovernanceApproval: Joi.boolean().default(false)
  }),

  contribute: Joi.object({
    amount: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required()
  }),

  // DEX schemas
  executeSwap: Joi.object({
    tokenIn: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    tokenOut: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    amountIn: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    amountOutMin: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    deadline: Joi.number().integer().min(Date.now() / 1000).required()
  }),

  addLiquidity: Joi.object({
    tokenA: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    tokenB: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    amountA: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    amountB: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    minAmountA: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    minAmountB: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required()
  }),

  removeLiquidity: Joi.object({
    tokenA: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    tokenB: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    liquidity: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    minAmountA: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    minAmountB: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required()
  }),

  commitSwap: Joi.object({
    commitment: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    expiresAt: Joi.number().integer().min(Date.now() / 1000).required()
  }),

  revealSwap: Joi.object({
    tokenIn: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    tokenOut: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    amountIn: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    amountOutMin: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    deadline: Joi.number().integer().min(Date.now() / 1000).required(),
    salt: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required()
  }),

  // Ferry schemas
  initiateBridge: Joi.object({
    token: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    amount: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    to: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    chainId: Joi.number().integer().min(1).max(999999).required(),
    requiresGovernanceApproval: Joi.boolean().default(false)
  }),

  fulfillBridge: Joi.object({
    token: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    amount: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    to: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    messageId: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required()
  }),

  mintNFT: Joi.object({
    recipient: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    tokenURI: Joi.string().uri().max(500).required(),
    signature: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required()
  }),

  // Treasury schemas
  withdrawFunds: Joi.object({
    project: Joi.string().valid('protocol', 'dex', 'ferry', 'analyst', 'app').required(),
    token: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    amount: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    recipient: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
  }),

  allocateBudget: Joi.object({
    project: Joi.string().valid('protocol', 'dex', 'ferry', 'analyst', 'app').required(),
    token: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    allocatedAmount: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    withdrawalLimit: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    dailyLimit: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required()
  }),

  schedulePayment: Joi.object({
    project: Joi.string().valid('protocol', 'dex', 'ferry', 'analyst', 'app').required(),
    token: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    recipient: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    amount: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    startTime: Joi.number().integer().min(Date.now() / 1000).required(),
    interval: Joi.number().integer().min(60).required(), // minimum 1 minute
    totalPayments: Joi.number().integer().min(1).max(1000).required()
  }),

  emergencyWithdraw: Joi.object({
    project: Joi.string().valid('protocol', 'dex', 'ferry', 'analyst', 'app').required(),
    token: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    amount: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).required(),
    recipient: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    reason: Joi.string().min(10).max(500).required()
  }),

  addOperator: Joi.object({
    project: Joi.string().valid('protocol', 'dex', 'ferry', 'analyst', 'app').required(),
    operator: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
  }),

  removeOperator: Joi.object({
    project: Joi.string().valid('protocol', 'dex', 'ferry', 'analyst', 'app').required(),
    operator: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
  })
};

export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const logger = new Logger('ValidationMiddleware');
      logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        errors: error.details.map(detail => detail.message)
      });

      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
      return;
    }

    // Replace request body with validated and cleaned data
    req.body = value;
    next();
  };
}

export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const logger = new Logger('ValidationMiddleware');
      logger.warn('Query validation failed', {
        path: req.path,
        method: req.method,
        errors: error.details.map(detail => detail.message)
      });

      res.status(400).json({
        error: 'Query validation failed',
        details: error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
      return;
    }

    // Replace request query with validated and cleaned data
    req.query = value;
    next();
  };
}

export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const logger = new Logger('ValidationMiddleware');
      logger.warn('Parameter validation failed', {
        path: req.path,
        method: req.method,
        errors: error.details.map(detail => detail.message)
      });

      res.status(400).json({
        error: 'Parameter validation failed',
        details: error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
      return;
    }

    // Replace request params with validated and cleaned data
    req.params = value;
    next();
  };
}
