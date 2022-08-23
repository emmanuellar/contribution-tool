const DOCUMENT_TYPES_URL =
  'https://raw.githubusercontent.com/ambanum/OpenTermsArchive/main/src/archivist/services/documentTypes.json';

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

export interface DocumentTypes {
  [key: string]: {
    commitment: {
      writer: string;
      audience: string;
      object: string;
    };
  };
}

export const getDocumentTypes = async () => {
  try {
    const { data: documentTypes } = await axios.get<DocumentTypes>(DOCUMENT_TYPES_URL);
    return documentTypes;
  } catch (e) {
    console.error(e);
    return {};
  }
};

export const createDocumentPullRequest = async ({
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
  content: any;
  owner: string;
  body: string;
  repo: string;
}) => {
  const { data: refData } = await octokit.rest.git.getRef({
    ...params,
    ref: `heads/${targetBranch}`,
  });
  const commitSha = refData.object.sha;

  await octokit.rest.git.createRef({
    ...params,
    ref: `refs/heads/${newBranch}`,
    sha: commitSha,
  });

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

export const updateDocumentInBranch = async ({
  filePath,
  branch,
  message,
  body,
  content,
  ...params
}: {
  filePath: string;
  branch: string;
  content: any;
  owner: string;
  message: string;
  body: string;
  repo: string;
}) => {
  const { data: fileData } = await octokit.rest.repos.getContent({
    ...params,
    path: filePath,
    ref: `refs/heads/${branch}`,
  });

  // @ts-ignore sha is detected as not existent even though is is
  const existingSha = fileData.sha;
  // @ts-ignore content is detected as not existent even though is is
  const existingContent = JSON.parse(Buffer.from(fileData.content, 'base64').toString());

  const newContent = merge(existingContent, content);
  // merge everything except the current submitted document
  newContent.documents = {
    ...existingContent.documents,
    ...content.documents,
  };

  await octokit.rest.repos.createOrUpdateFileContents({
    ...params,
    branch,
    path: filePath,
    message,
    content: Buffer.from(`${JSON.stringify(newContent, null, 2)}\n`).toString('base64'),
    sha: existingSha,
  });

  const { data: existingPrs } = await octokit.rest.pulls.list({
    ...params,
    state: 'open',
    head: `${params.owner}:${branch}`,
  });

  const existingPr = existingPrs[0];

  await octokit.rest.issues.createComment({
    ...params,
    body,
    issue_number: existingPr.number,
  });

  return existingPrs[0];
};

export const searchIssues = async ({ title, ...searchParams }: any) => {
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

    return issuesWithSameTitle;
  } catch (e) {
    console.error('Could not search issue');
    console.error(e.toString());
    throw e;
  }
};

export const getLatestFailDate = async ({ serviceName, documentType, ...commonParams }: any) => {
  try {
    const issues = await searchIssues({
      ...commonParams,
      state: 'open',
      title: `Fix ${serviceName} - ${documentType}`,
    });
    const issue = issues[0];

    const firstComment = {
      createdAt: issue.created_at,
      body: issue.body,
    };

    const comments = await getIssueComments({
      ...commonParams,
      issue_number: issue.number,
    });

    const automatedComments = comments
      .filter((comment) => comment?.user?.login === 'OTA-Bot')
      .map((comment) => ({
        createdAt: comment.created_at,
        body: comment.body,
      }));

    const allComments = [firstComment, ...automatedComments];

    const failingComments = allComments.filter(
      ({ body }) =>
        body &&
        (body.startsWith('🤖 Reopened') ||
          body.includes('no longer properly tracked') ||
          body.includes('not available anymore'))
    );

    const mostRecentFailingComment = failingComments[failingComments.length - 1];
    return mostRecentFailingComment.createdAt;
  } catch (e) {
    console.error('Could not search issue');
    console.error(e.toString());
    throw e;
  }
};

export const getIssueComments = async ({ issue_number, ...searchParams }: any) => {
  try {
    const request = {
      per_page: 100,
      issue_number,
      ...searchParams,
    };

    const comments = await octokit.paginate(
      octokit.rest.issues.listComments,
      request,
      (response) => response.data
    );
    return comments;
  } catch (e) {
    console.error('Could not search issue');
    console.error(e.toString());
    throw e;
  }
};
