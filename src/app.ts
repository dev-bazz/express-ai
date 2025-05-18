import express from 'express';
import { handleAi } from './ai.controller';
import cors from 'cors';

const app = express();
app.use(cors());
app.get('/', handleAi);
export default app;
