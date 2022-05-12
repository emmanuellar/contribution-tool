require('dotenv').config();

import express, { Request, Response } from 'express';
import { serverRuntimeConfig } from '../../next.config';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const port = +(process.env.PORT || 3000);
const hostname = 'localhost'; // https://github.com/vercel/next.js/blob/85cc454023aa36c86602db9110e7377704b62e53/packages/next/server/lib/start-server.ts
const app = next({ dev, port, hostname });
const handle = app.getRequestHandler();

(async () => {
  try {
    await app.prepare();
    const server = express();

    server.use(
      `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${serverRuntimeConfig.scrapedIframeUrl}`,
      express.static(serverRuntimeConfig.scrapedFilesFolder)
    );

    server.all('*', (req: Request, res: Response) => {
      return handle(req, res);
    });
    server.listen(port, (err?: any) => {
      if (err) throw err;
      console.log(`> Ready on localhost:${port} - env ${process.env.NODE_ENV}`);
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
