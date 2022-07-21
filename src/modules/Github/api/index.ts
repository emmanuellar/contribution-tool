const DOCUMENT_TYPES_URL = 'http://51.89.227.200:7011/data/api/list_documentTypes/v1/';

import { Octokit } from 'octokit';
import axios from 'axios';
import merge from 'lodash/fp/merge';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export interface Commit {
  url: string;
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

export type Commits = Commit[];

export const getDocumentTypes: any = async () => {
  try {
    const { data: documentTypes } = await axios.get(DOCUMENT_TYPES_URL);
    return [...new Set(Object.keys(documentTypes))].sort();
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const createPullRequest = async ({
  filePath,
  targetBranch,
  newBranch,
  title,
  body,
  content,
  ...params
}: {
  filePath: string;
  targetBranch: string;
  newBranch: string;
  title: string;
  content: string;
  owner: string;
  body: string;
  repo: string;
}) => {
  const { data: refData } = await octokit.rest.git.getRef({
    ...params,
    ref: `heads/${targetBranch}`,
  });
  const commitSha = refData.object.sha;

  // create branch if it doesn't exist
  try {
    await octokit.rest.git.createRef({
      ...params,
      ref: `refs/heads/${newBranch}`,
      sha: commitSha,
    });
  } catch (e: any) {
    if (e?.response?.data?.message !== 'Reference already exists') {
      throw e;
    }
    // Branch already exists, let's reuse it
  }

  let existingSha;
  let existingContent = {};

  try {
    const { data: fileData } = await octokit.rest.repos.getContent({
      ...params,
      path: filePath,
      ref: `refs/heads/${targetBranch}`,
    });

    // @ts-ignore sha is detected as not existent even though is is
    existingSha = fileData.sha;
    // @ts-ignore content is detected as not existent even though is is
    existingContent = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
  } catch (e: any) {
    if (e?.response?.data?.message !== 'Not Found') {
      throw e;
    }
    // file does not exist on main branch, continue
  }

  await octokit.rest.repos.createOrUpdateFileContents({
    ...params,
    branch: newBranch,
    path: filePath,
    message: title,
    content: Buffer.from(`${JSON.stringify(merge(existingContent, content), null, 2)}\n`).toString(
      'base64'
    ),
    ...(existingSha ? { sha: existingSha } : {}),
  });

  const { data } = await octokit.rest.pulls.create({
    ...params,
    base: targetBranch,
    head: newBranch,
    title,
    body,
  });

  return data;
};

export const getLatestCommit = async (params: { repo: string; path: string }) => {
  const repoUrl = `https://api.github.com/repos/${params.repo}/commits`;

  try {
    const { data }: { data: Commits } = await octokit.request(
      `GET ${repoUrl}?path=${params.path}`,
      {
        page: 1,
        per_page: 1,
      }
    );

    return data[0] as Commit;
  } catch (e) {
    console.error(e);
    return {} as Commit;
  }
};
