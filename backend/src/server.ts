import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import config from '../config';
import './db';
import authRoutes from './routes/auth';
import v1Routes from './routes/v1';
import conversionService from './services/ConversionService';
import openApiDocument from './docs/openapi';
import rateLimiter from './middleware/rateLimit';

const app: Application = express();

app.set('trust proxy', 1);

if (config.server.nodeEnv === 'production' && config.server.enforceHttps) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const forwardedProtoHeader = req.headers['x-forwarded-proto'];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader;

    if (req.secure || forwardedProto === 'https') {
      return next();
    }

    const host = req.headers.host ?? '';
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  });
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimiter);
app.use(morgan('combined'));

app.use('/auth', authRoutes);
app.use('/v1', v1Routes);

app.get('/docs/openapi.json', (_req: Request, res: Response) => {
  res.status(200).json(openApiDocument);
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

conversionService.start();

const PORT = config.server.port;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});

export default app;
