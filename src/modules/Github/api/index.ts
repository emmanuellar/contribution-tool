const DOCUMENT_TYPES_URL = 'https://opentermsarchive.org/data/api/list_documentTypes/v1/';

import { Octokit } from 'octokit';
import axios from 'axios';

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

export const createLabel = async (
  params: Parameters<typeof octokit.rest.issues.createLabel>[0]
) => {
  return octokit.rest.issues.createLabel(params).catch((error) => {
    if (error.toString().includes('"code":"already_exists"')) {
      return;
    }
    console.error(`Could not create label "${params?.name}": ${error.toString()}`);
  });
};

export const createIssue: any = async (
  params: Parameters<typeof octokit.rest.issues.create>[0]
) => {
  try {
    const { data } = await octokit.rest.issues.create(params);
    return data;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const searchIssue = async ({ title, ...searchParams }: any) => {
  try {
    const request = {
      per_page: 100,
      ...searchParams,
    };

    const issues = await octokit.paginate(
      octokit.rest.issues.listForRepo,
      request,
      (response) => response.data
    );

    const issuesWithSameTitle = issues.filter((item) => item.title === title);

    return issuesWithSameTitle[0];
  } catch (e: any) {
    console.error('Could not search issue');
    console.error(e.toString());
    return null;
  }
};

export const addCommentToIssue = async (
  params: Parameters<typeof octokit.rest.issues.createComment>[0]
) => {
  try {
    const { data } = await octokit.rest.issues.createComment(params);
    return data;
  } catch (e) {
    console.error(e);
    return null;
  }
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
