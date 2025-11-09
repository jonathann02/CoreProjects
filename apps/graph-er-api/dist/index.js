import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
const app = express();
const PORT = process.env.PORT || 4000;
// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
// Basic health check
app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', service: 'graph-er-api' });
});
// Basic GraphQL placeholder
app.get('/graphql', (req, res) => {
    res.json({ message: 'GraphQL endpoint - not yet implemented' });
});
// Basic upload endpoint placeholder
app.post('/v1/upload/start', (req, res) => {
    res.json({ message: 'Upload endpoint - not yet implemented', sessionId: 'placeholder' });
});
app.listen(PORT, () => {
    console.log(`Graph & Entity Resolution API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/healthz`);
});
//# sourceMappingURL=index.js.map