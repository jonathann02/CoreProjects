import type neo4j from 'neo4j-driver';

// GraphQL context type
export interface Context {
  req: any; // Express request
  driver: neo4j.Driver;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Request ID middleware type
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
