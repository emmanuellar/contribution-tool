// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

import HttpStatusCode from 'http-status-codes';
import { getReposFromOrg } from 'modules/Github/api';
import { authorizedOrganizations } from 'modules/Common/managers/ServiceManager';

export const getInstances = async () => {
  let repos: any[] = [];
  for (const org of authorizedOrganizations) {
    repos = [...repos, ...(await getReposFromOrg({ org }))];
  }
  return repos
    .filter(({ name }) => name.endsWith('-declarations'))
    .map(({ full_name }) => full_name);
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    return res.json(await getInstances());
  }

  res.statusCode = HttpStatusCode.FORBIDDEN;
  res.json({ status: 'ko', message: 'Nothing there' });
};
