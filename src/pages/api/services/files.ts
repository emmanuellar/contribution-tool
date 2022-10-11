import { GetServiceFilesResponse } from 'modules/Common/interfaces';
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

import HttpStatusCode from 'http-status-codes';
import ServiceManager from 'modules/Common/managers/ServiceManager';
const get =
  ({ name, documentType, destination, commitURL }: any) =>
  async (_: NextApiRequest, res: NextApiResponse<GetServiceFilesResponse>) => {
    try {
      let serviceManager;

      if (commitURL) {
        const commit = await ServiceManager.getDataFromCommit(commitURL);
        serviceManager = new ServiceManager({
          destination,
          name: commit.service,
          type: commit.documentType,
        });
      } else {
        serviceManager = new ServiceManager({
          destination,
          name,
          type: documentType,
        });
      }

      const files = await serviceManager.getDeclarationFiles();

      res.json({
        status: 'ok',
        message: 'OK',
        ...files,
      });
      return res;
    } catch (e: any) {
      console.error(e);
      res.statusCode = HttpStatusCode.OK;
      res.json({
        status: 'ko',
        message: 'Could not download url',
        error: e.toString(),
      });
      return res;
    }
  };

const files = async (req: NextApiRequest, res: NextApiResponse) => {
  const { query } = req;

  if (req.method === 'GET') {
    return get({
      destination: query?.destination,
      name: query?.name,
      documentType: query?.documentType,
      commitURL: query?.commitURL,
    })(req, res);
  }

  res.statusCode = HttpStatusCode.FORBIDDEN;
  res.json({ status: 'ko', message: 'Nothing there' });
};

export default files;
