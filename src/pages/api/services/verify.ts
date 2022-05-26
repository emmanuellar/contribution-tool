import { GetServiceVerifyResponse } from 'modules/Common/interfaces';
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

import HttpStatusCode from 'http-status-codes';
import { getVersion } from 'modules/OTA-api/services/open-terms-archive';

const get =
  (json: any) => async (_: NextApiRequest, res: NextApiResponse<GetServiceVerifyResponse>) => {
    try {
      const data = await getVersion(json);
      res.statusCode = HttpStatusCode.OK;
      res.json({
        status: 'ok',
        message: 'OK',
        ...data,
      });
      return res;
    } catch (e) {
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

const verify = async (req: NextApiRequest, res: NextApiResponse) => {
  const { query } = req;

  if (req.method === 'GET' && query?.json) {
    try {
      return get(JSON.parse(query.json as string))(req, res);
    } catch (e) {
      console.error(e);
      res.statusCode = HttpStatusCode.METHOD_FAILURE;
      res.json({
        status: 'ko',
        message: 'Could not parse JSON',
        url: '',
      });
      return res;
    }
  }

  res.statusCode = HttpStatusCode.FORBIDDEN;
  res.json({ status: 'ko', message: 'Nothing there' });
};

export default verify;
