import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import config from '../config';
import './db';

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = config.server.port;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});

export default app;
