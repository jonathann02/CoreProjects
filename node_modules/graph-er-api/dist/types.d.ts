export interface Context {
    req: any;
    driver: neo4j.Driver;
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}
//# sourceMappingURL=types.d.ts.map