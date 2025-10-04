const openApiDocument = {
  openapi: '3.0.1',
  info: {
    title: 'Hashpay API',
    version: '1.0.0',
    description: 'Hashpay REST API for BTC/USD wallets and conversions.'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server'
    }
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      BalanceResponse: {
        type: 'object',
        properties: {
          btcBalance: {
            type: 'object',
            properties: {
              balance: { type: 'number', format: 'double' },
              pending: { type: 'number', format: 'double' },
              depositAddress: { type: 'string', nullable: true }
            }
          },
          usdBalance: {
            type: 'object',
            properties: {
              balance: { type: 'number', format: 'double' },
              pending: { type: 'number', format: 'double' },
              depositAddress: { type: 'string', nullable: true }
            }
          }
        }
      },
      BitcoinSendRequest: {
        type: 'object',
        required: ['toAddress', 'amountBtc'],
        properties: {
          toAddress: { type: 'string' },
          amountBtc: { type: 'number', format: 'double' }
        }
      },
      UsdSendRequest: {
        type: 'object',
        required: ['toUserId', 'amountUsd'],
        properties: {
          toUserId: { type: 'integer' },
          amountUsd: { type: 'number', format: 'double' }
        }
      },
      ConversionQuoteRequest: {
        type: 'object',
        required: ['from', 'amount'],
        properties: {
          from: { type: 'string', enum: ['BTC', 'USD'] },
          amount: { type: 'number', format: 'double' }
        }
      },
      ConversionExecuteRequest: {
        type: 'object',
        required: ['from', 'amount'],
        properties: {
          from: { type: 'string', enum: ['BTC', 'USD'] },
          amount: { type: 'number', format: 'double' }
        }
      },
      TransactionListResponse: {
        type: 'object',
        properties: {
          transactions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                type: { type: 'string' },
                direction: { type: 'string' },
                status: { type: 'string' },
                currency: { type: 'string' },
                amount: { type: 'string' },
                feeAmount: { type: 'string' },
                txHash: { type: 'string', nullable: true },
                metadata: { type: 'object' },
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          },
          pagination: {
            type: 'object',
            properties: {
              limit: { type: 'integer' },
              offset: { type: 'integer' }
            }
          }
        }
      }
    }
  },
  paths: {
    '/v1/balance': {
      get: {
        summary: 'Retrieve BTC and USD balances',
        tags: ['Wallet'],
        responses: {
          200: {
            description: 'User balances',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BalanceResponse' }
              }
            }
          }
        }
      }
    },
    '/v1/btc/address': {
      post: {
        summary: 'Generate a new Bitcoin deposit address',
        tags: ['Bitcoin'],
        responses: {
          201: {
            description: 'New address generated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { address: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    },
    '/v1/btc/send': {
      post: {
        summary: 'Send BTC to an external address',
        tags: ['Bitcoin'],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BitcoinSendRequest' } }
          }
        },
        responses: {
          201: {
            description: 'Transaction broadcast',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    txId: { type: 'string' },
                    feeBtc: { type: 'string' },
                    totalDebitBtc: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/v1/usd/send': {
      post: {
        summary: 'Send USD to another user',
        tags: ['USD'],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UsdSendRequest' } }
          }
        },
        responses: {
          201: {
            description: 'Transfer completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    feeUsd: { type: 'string' },
                    netAmountUsd: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/v1/convert/quote': {
      post: {
        summary: 'Get conversion quote between BTC and USD',
        tags: ['Conversion'],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ConversionQuoteRequest' } }
          }
        },
        responses: {
          200: {
            description: 'Conversion quote',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    from: { type: 'string' },
                    to: { type: 'string' },
                    requestedAmount: { type: 'number' },
                    convertedAmount: { type: 'number' },
                    feeAmount: { type: 'string' },
                    feeUsd: { type: 'number' },
                    rate: {
                      type: 'object',
                      properties: {
                        raw: { type: 'number' },
                        final: { type: 'number' },
                        fetchedAt: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/v1/convert/execute': {
      post: {
        summary: 'Execute conversion at latest cached rate',
        tags: ['Conversion'],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ConversionExecuteRequest' } }
          }
        },
        responses: {
          201: {
            description: 'Conversion executed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    convertedAmount: { type: 'number' },
                    feeAmount: { type: 'string' },
                    rate: { type: 'number' },
                    direction: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/v1/transactions': {
      get: {
        summary: 'List BTC and USD transactions',
        tags: ['Transactions'],
        parameters: [
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100 },
            required: false
          },
          {
            in: 'query',
            name: 'offset',
            schema: { type: 'integer', minimum: 0 },
            required: false
          }
        ],
        responses: {
          200: {
            description: 'Transactions list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TransactionListResponse' }
              }
            }
          }
        }
      }
    },
    '/v1/webhook/btc': {
      post: {
        summary: 'Internal webhook for Bitcoin confirmations',
        tags: ['Webhook'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'txHash', 'amountBtc', 'confirmations'],
                properties: {
                  userId: { type: 'integer' },
                  txHash: { type: 'string' },
                  amountBtc: { type: 'number' },
                  confirmations: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Webhook processed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    }
  }
};

export default openApiDocument;
