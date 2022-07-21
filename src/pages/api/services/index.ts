import {
  GetContributeServiceResponse,
  PostContributeServiceResponse,
} from '../../../modules/Contribute/interfaces';
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

import HttpStatusCode from 'http-status-codes';
import { addService } from '../../../modules/Contribute/managers/ServiceManager';
import axios from 'axios';
import dayjs from 'dayjs';
import { downloadUrl } from 'modules/Scraper/utils/downloader';
import fs from 'fs';
import getConfig from 'next/config';
import { getLatestCommit } from 'modules/Github/api';
import path from 'path';

const { serverRuntimeConfig } = getConfig();

const cleanStringForFileSystem = (string: string) => string.replace(/[^\p{L}\d_]/gimu, '_');

const isPdf = async (url: string) => {
  try {
    const response = await axios.head(url, { timeout: 3000 });
    return response.headers['content-type'] === 'application/pdf';
  } catch (e) {
    return false;
  }
};

const get =
  (json: any, acceptLanguage: string = 'en') =>
  async (_: NextApiRequest, res: NextApiResponse<GetContributeServiceResponse>) => {
    const url = json.fetch;

    if (await isPdf(url)) {
      res.json({
        status: 'ok',
        message: 'OK',
        url,
        isPdf: true,
      });
      return res;
    }

    // In case executeClientScripts is true, ota snapshot fetcher will wait
    // for selector to be found on the page, so resulting snapshot will be
    // different each time a new selector is added
    // same if language changes
    const folderName = cleanStringForFileSystem(
      `${url}_${acceptLanguage}${
        json.executeClientScripts
          ? `_${json.executeClientScripts}_${
              json.select ? (Array.isArray(json.select) ? json.select.join(',') : json.select) : ''
            }`
          : ''
      }`
    );

    const folderPath = path.join(serverRuntimeConfig.scrapedFilesFolder, folderName);

    const newUrlPath = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${
      serverRuntimeConfig.scrapedIframeUrl
    }/${folderName}`;

    const newUrl = `${newUrlPath}/index.html`;

    if (fs.existsSync(folderPath)) {
      console.log(`Folder ${folderPath} exists`);
      res.statusCode = HttpStatusCode.OK;
      res.json({
        status: 'ok',
        message: 'OK',
        url: newUrl,
      });
      return res;
    }

    try {
      console.log(`Folder ${folderPath} does not exist`);
      console.log(`downloading ${url}`);
      console.time('downloading');
      const { error } = await downloadUrl(json, { folderPath, newUrlPath, acceptLanguage });
      console.timeEnd('downloading');

      if (error) {
        res.statusCode = HttpStatusCode.OK;
        res.json({
          status: 'ko',
          message: 'Could not download url',
          url: '',
          error,
        });
        return res;
      }

      res.statusCode = HttpStatusCode.OK;
      res.json({
        status: 'ok',
        message: 'OK',
        url: newUrl,
      });
      return res;
    } catch (e: any) {
      console.error(e);
      res.statusCode = HttpStatusCode.METHOD_FAILURE;
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
  versionsRepo,
  documentType,
  existingJson,
}: {
  historyFullPath: string;
  serviceName: string;
  existingJson: any;
  versionsRepo: string;
  documentType: string;
}) => {
  if (!fs.existsSync(historyFullPath)) {
    fs.writeFileSync(historyFullPath, '{}');
  }

  let historyJson = JSON.parse(fs.readFileSync(historyFullPath, 'utf8'));

  const latestCommit = await getLatestCommit({
    repo: versionsRepo,
    path: `${encodeURIComponent(serviceName)}/${encodeURIComponent(documentType)}.md`,
  });

  const lastCommitDate = latestCommit?.commit?.author.date;

  const newHistoryJson = {
    ...historyJson,
    [documentType]: [
      {
        ...existingJson.documents[documentType],
        validUntil: dayjs(lastCommitDate || new Date()).format(),
      },
      ...(historyJson[documentType] || []),
    ],
  };
  fs.writeFileSync(historyFullPath, `${JSON.stringify(newHistoryJson, null, 2)}\n`);
};

const saveOnLocal =
  (data: string, path: string, versionsRepo: string) =>
  async (_: NextApiRequest, res: NextApiResponse<any>) => {
    try {
      let json = JSON.parse(data);

      const documentType = Object.keys(json.documents)[0];
      const sanitizedName = json.name.replace(/[^\p{L}\.\s\d]/gimu, '');
      const fullPath = `${path}/${sanitizedName}.json`;
      const historyFullPath = `${path}/${sanitizedName}.history.json`;

      if (fs.existsSync(fullPath)) {
        const existingJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (versionsRepo) {
          await saveHistoryFile({
            serviceName: sanitizedName,
            versionsRepo,
            documentType,
            historyFullPath,
            existingJson,
          });
        }
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
    if (!['OpenTermsArchive', 'ambanum'].includes(body?.destination.split('/')[0])) {
      res.json({
        status: 'ko',
        message: 'Destination should be OpenTermsArchive/something or ambanum/something',
        error: 'Invalid destination',
      });
      return res;
    }

    try {
      const service: any = await addService({
        destination: body?.destination,
        name: body?.name,
        documentType: body?.documentType,
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
      body?.versionsRepo as string
    )(req, res);
  }

  res.statusCode = HttpStatusCode.FORBIDDEN;
  res.json({ status: 'ko', message: 'Nothing there' });
};

export default services;
