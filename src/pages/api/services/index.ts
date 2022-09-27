import {
  GetContributeServiceResponse,
  PostContributeServiceResponse,
} from 'modules/Contribute/interfaces';
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

import HttpStatusCode from 'http-status-codes';
import ServiceManager from 'modules/Contribute/managers/ServiceManager';
import dayjs from 'dayjs';
import { downloadUrl } from 'modules/Scraper/utils/downloader';
import fs from 'fs';
import getConfig from 'next/config';
import { getLatestFailDate } from 'modules/Github/api';

const { serverRuntimeConfig } = getConfig();

const get =
  (json: any, acceptLanguage: string = 'en') =>
  async (_: NextApiRequest, res: NextApiResponse<GetContributeServiceResponse>) => {
    try {
      if (json.combine) {
        res.statusCode = HttpStatusCode.OK;
        res.json({
          status: 'ko',
          url: '',
          error: 'Sorry but multipage is not supported yet',
        });
        return res;
      }

      const downloadResult = await downloadUrl(json, {
        folderDirPath: serverRuntimeConfig.scrapedFilesFolder,
        newUrlDirPath: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${
          serverRuntimeConfig.scrapedIframeUrl
        }`,
        acceptLanguage,
      });

      const { url: newUrl, isPDF } = downloadResult;

      res.statusCode = HttpStatusCode.OK;
      res.json({
        status: 'ok',
        message: 'OK',
        url: newUrl,
        isPDF,
      });
      return res;
    } catch (e: any) {
      console.error(e);
      res.statusCode = HttpStatusCode.OK;
      res.json({
        status: 'ko',
        message: 'Could not download url',
        url: '',
        error: e.toString(),
      });
      return res;
    }
  };

const saveHistoryFile = async ({
  historyFullPath,
  serviceName,
  declarationsRepo,
  documentType,
  existingJson,
}: {
  historyFullPath: string;
  serviceName: string;
  existingJson: any;
  declarationsRepo: string;
  documentType: string;
}) => {
  if (!fs.existsSync(historyFullPath)) {
    fs.writeFileSync(historyFullPath, '{}');
  }

  let historyJson = JSON.parse(fs.readFileSync(historyFullPath, 'utf8'));

  const [githubOrganization, githubRepository] = (declarationsRepo || '')?.split('/');

  const commonParams = {
    owner: githubOrganization,
    repo: githubRepository,
    accept: 'application/vnd.github.v3+json',
  };
  let lastFailingDate: string;

  try {
    lastFailingDate = await getLatestFailDate({
      ...commonParams,
      serviceName,
      documentType,
    });
  } catch (e) {
    lastFailingDate = new Date().toISOString();
  }

  const newHistoryJson = {
    ...historyJson,
    [documentType]: [
      {
        ...existingJson.documents[documentType],
        validUntil: dayjs(lastFailingDate || new Date()).format(),
      },
      ...(historyJson[documentType] || []),
    ],
  };
  fs.writeFileSync(historyFullPath, `${JSON.stringify(newHistoryJson, null, 2)}\n`);
};

const saveOnLocal =
  (data: string, path: string, declarationsRepo: string) =>
  async (_: NextApiRequest, res: NextApiResponse<any>) => {
    try {
      let json = JSON.parse(data);

      const documentType = Object.keys(json.documents)[0];
      const sanitizedName = json.name.replace(/[^\p{L}\.\s\d]/gimu, '');
      const fullPath = `${path}/${sanitizedName}.json`;
      const historyFullPath = `${path}/${sanitizedName}.history.json`;

      if (fs.existsSync(fullPath)) {
        const existingJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        await saveHistoryFile({
          declarationsRepo,
          serviceName: sanitizedName,
          documentType,
          historyFullPath,
          existingJson,
        });
        json = {
          ...existingJson,
          documents: { ...existingJson.documents, [documentType]: json.documents[documentType] },
        };
      }

      fs.writeFileSync(fullPath, `${JSON.stringify(json, null, 2)}\n`);

      res.json({
        status: 'ok',
        message: `File saved`,
        path: fullPath,
      });
    } catch (e: any) {
      res.statusCode = HttpStatusCode.METHOD_FAILURE;
      res.json({
        status: 'ko',
        message: 'Could not download url',
        error: e.toString(),
      });
      return res;
    }

    return res;
  };

const addNewService =
  (body: any) => async (_: NextApiRequest, res: NextApiResponse<PostContributeServiceResponse>) => {
    try {
      const serviceManager = new ServiceManager({
        destination: body?.destination,
        name: body?.name,
        type: body?.documentType,
      });
      const service: any = await serviceManager.addOrUpdateService({
        json: body?.json,
        url: body?.url,
      });
      return res.json({
        status: 'ok',
        message: `PR available on Github`,
        url: service?.html_url,
      });
    } catch (e: any) {
      let message = e.toString();

      if (e?.response?.data?.message === 'Reference already exists') {
        message = `A branch with this name already exists on ${body?.destination}`;
      }

      res.json({
        status: 'ko',
        message,
        error: e.toString(),
      });
      return res;
    }
  };

const services = async (req: NextApiRequest, res: NextApiResponse) => {
  const { body, query } = req;
  if (req.method === 'GET' && query?.json) {
    try {
      const json = JSON.parse(query.json as string);
      return get(json, query.acceptLanguage as string)(req, res);
    } catch (e: any) {
      res.statusCode = HttpStatusCode.METHOD_FAILURE;
      res.json({ status: 'ko', message: 'Error occured', error: e.toString() });
      return;
    }
  }

  if (req.method === 'POST' && body?.json) {
    return addNewService(body)(req, res);
  }

  if (req.method === 'POST' && body?.data) {
    return saveOnLocal(
      body?.data as string,
      body?.path as string,
      body?.destination as string
    )(req, res);
  }

  res.statusCode = HttpStatusCode.FORBIDDEN;
  res.json({ status: 'ko', message: 'Nothing there' });
};

export default services;
