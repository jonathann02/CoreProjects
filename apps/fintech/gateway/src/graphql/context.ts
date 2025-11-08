import { ExpressContext } from 'apollo-server-express';

export interface GraphQLContext {
  user: {
    sub: string;
    scope?: string;
    [key: string]: any;
  } | null;
  req: ExpressContext['req'];
  res: ExpressContext['res'];
}

export const context = ({ req, res }: ExpressContext): GraphQLContext => {
  return {
    user: (req as any).user || null,
    req,
    res,
  };
};
