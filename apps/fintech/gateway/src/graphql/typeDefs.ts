import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  # Custom scalars
  scalar DateTime
  scalar UUID

  # Enums
  enum AccountType {
    ASSET
    LIABILITY
    EQUITY
    REVENUE
    EXPENSE
  }

  enum AccountStatus {
    ACTIVE
    SUSPENDED
    CLOSED
  }

  enum Currency {
    USD
    EUR
    SEK
    GBP
    JPY
    CAD
    AUD
    CHF
    NOK
    DKK
  }

  enum PaymentStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
  }

  # Types
  type Account {
    id: UUID!
    accountNumber: String!
    type: AccountType!
    currency: Currency!
    status: AccountStatus!
    balance: Float!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Payment {
    id: UUID!
    idempotencyKey: UUID!
    fromAccountId: UUID!
    toAccountId: UUID!
    amount: Float!
    currency: Currency!
    description: String
    status: PaymentStatus!
    failureReason: String
    createdAt: DateTime!
    updatedAt: DateTime!
    sentAt: DateTime
  }

  type LimitCheckResult {
    allowed: Boolean!
    remaining: Float!
    limitAmount: Float!
    usedAmount: Float!
    limitType: String!
    accountId: String!
    errorMessage: String
  }

  # Input types
  input CreateAccountInput {
    accountNumber: String!
    type: AccountType!
    currency: Currency!
  }

  input InitiatePaymentInput {
    fromAccountId: UUID!
    toAccountId: UUID!
    amount: Float!
    currency: Currency!
    description: String
  }

  input EvaluateLimitInput {
    accountId: String!
    limitType: String!
    amount: Float!
    currency: String!
  }

  # Queries
  type Query {
    # Account queries
    account(id: UUID!): Account
    accounts(limit: Int, offset: Int): [Account!]!

    # Payment queries
    payment(id: UUID!): Payment
    payments(limit: Int, offset: Int): [Payment!]!

    # Health check
    health: String!
  }

  # Mutations
  type Mutation {
    # Account mutations
    createAccount(input: CreateAccountInput!): Account!

    # Payment mutations
    initiatePayment(
      input: InitiatePaymentInput!
      idempotencyKey: UUID!
    ): Payment!

    # Limit evaluation
    evaluateLimit(input: EvaluateLimitInput!): LimitCheckResult!
  }

  # Schema definition
  schema {
    query: Query
    mutation: Mutation
  }
`;
