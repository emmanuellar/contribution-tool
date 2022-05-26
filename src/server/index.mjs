import dotenv from 'dotenv';
dotenv.config();

import pkg from '../../next.config.js';
const { serverRuntimeConfig } = pkg;
import express from 'express';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
const app = next({ dev, port, hostname: 'localhost' });
const handle = app.getRequestHandler();

(async () => {
  try {
    await app.prepare();
    const server = express();

    server.use(
      `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${serverRuntimeConfig.scrapedIframeUrl}`,
      express.static(serverRuntimeConfig.scrapedFilesFolder)
    );

    server.all('*', (req, res) => {
      return handle(req, res);
    });

    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on localhost:${port} - env ${process.env.NODE_ENV}`);
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
