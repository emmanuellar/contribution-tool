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

export const getFileContent = async ({
  branch,
  filePath,
  ...params
}: {
  filePath: string;
  branch: string;
  owner: string;
  repo: string;
}) => {
  let sha;
  let content = '';

  try {
    const { data: fileData } = await octokit.rest.repos.getContent({
      ...params,
      path: filePath,
      ref: `refs/heads/${branch}`,
    });

    // @ts-ignore sha is detected as not existent even though is is
    sha = fileData.sha;
    // @ts-ignore content is detected as not existent even though is is
    content = Buffer.from(fileData.content, 'base64').toString();
  } catch (e: any) {
    if (e?.response?.data?.message !== 'Not Found') {
      throw e;
    }
    // file does not exist on main branch, continue
  }

  return { sha, content, branch };
};

const createBranch = async ({
  targetBranch,
  newBranch,
  ...params
}: {
  targetBranch: string;
  newBranch: string;
  owner: string;
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
};

export const createOrUpdateJsonFile = async ({
  filePath,
  fromBranch,
  toBranch,
  message,
  merger = merge,
  content,
  ...params
}: {
  filePath: string;
  fromBranch: string;
  toBranch: string;
  message: string;
  merger?: (existingContent: any, content: any) => any;
  content: any;
  owner: string;
  repo: string;
}) => {
  const { sha: existingSha, content: existingContentString } = await getFileContent({
    filePath,
    branch: fromBranch,
    ...params,
  });

  const prevContent = JSON.parse(existingContentString || '{}');
  const newContent = merger({ ...prevContent }, content);

  await octokit.rest.repos.createOrUpdateFileContents({
    ...params,
    branch: toBranch,
    path: filePath,
    message,
    content: Buffer.from(`${JSON.stringify(newContent, null, 2)}\n`).toString('base64'),
    ...(existingSha ? { sha: existingSha } : {}),
  });

  return { prevContent, newContent };
};

export const createDocumentAddPullRequest = async ({
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
  body: string;
  owner: string;
  repo: string;
}) => {
  await createBranch({ targetBranch, newBranch, ...params });

  await createOrUpdateJsonFile({
    ...params,
    filePath,
    fromBranch: targetBranch,
    toBranch: newBranch,
    content,
    message: title,
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

export const updateDocumentsInBranch = async ({
  filePath,
  historyFilePath,
  branch,
  title,
  targetBranch,
  documentType,
  lastFailingDate,
  message,
  historyMessage,
  body,
  content,
  ...params
}: {
  filePath: string;
  branch: string;
  targetBranch: string;
  title: string;
  content: any;
  owner: string;
  message: string;
  historyMessage?: string;
  historyFilePath?: string;
  documentType?: string;
  lastFailingDate?: string;
  body: string;
  repo: string;
}) => {
  const { prevContent } = await createOrUpdateJsonFile({
    ...params,
    filePath,
    fromBranch: branch,
    toBranch: branch,
    content,
    message,
    merger: (existingContent, content) => {
      const newContent = merge(existingContent, content);
      // merge everything except the current submitted document
      newContent.documents = {
        ...existingContent.documents,
        ...content.documents,
      };
      return newContent;
    },
  });

  if (historyFilePath && documentType && lastFailingDate && historyMessage) {
    await createOrUpdateJsonFile({
      ...params,
      filePath: historyFilePath,
      fromBranch: branch,
      toBranch: branch,
      content: prevContent.documents[documentType],
      message: historyMessage,
      merger: (existingContent, contentToInsert) => ({
        ...existingContent,
        [documentType]: [
          ...(existingContent[documentType] || []),
          {
            ...contentToInsert,
            validUntil: lastFailingDate || 'to-be-determined',
          },
        ],
      }),
    });
  }

  const { data: existingPrs } = await octokit.rest.pulls.list({
    ...params,
    state: 'open',
    head: `${params.owner}:${branch}`,
  });

  const existingPr = existingPrs[0];

  if (existingPr) {
    await octokit.rest.issues.createComment({
      ...params,
      body,
      issue_number: existingPr.number,
    });
    return existingPrs[0];
  } else {
    const { data } = await octokit.rest.pulls.create({
      ...params,
      base: targetBranch,
      head: branch,
      title,
      body,
    });
    return data;
  }
};

export const createDocumentUpdatePullRequest = async ({
  filePath,
  historyFilePath,
  targetBranch,
  newBranch,
  title,
  documentType,
  message,
  body,
  historyMessage,
  lastFailingDate,
  content,
  ...params
}: {
  filePath: string;
  historyFilePath: string;
  targetBranch: string;
  newBranch: string;
  documentType: string;
  title: string;
  content: any;
  owner: string;
  message: string;
  historyMessage: string;
  lastFailingDate?: string;
  body: string;
  repo: string;
}) => {
  await createBranch({
    targetBranch,
    newBranch,
    ...params,
  });

  const { prevContent } = await createOrUpdateJsonFile({
    ...params,
    filePath,
    fromBranch: targetBranch,
    toBranch: newBranch,
    content,
    message,
    merger: (existingContent, content) => {
      const newContent = merge(existingContent, content);
      // merge everything except the current submitted document
      newContent.documents = {
        ...existingContent.documents,
        ...content.documents,
      };
      return newContent;
    },
  });

  await createOrUpdateJsonFile({
    ...params,
    filePath: historyFilePath,
    fromBranch: targetBranch,
    toBranch: newBranch,
    content: prevContent.documents[documentType],
    message,
    merger: (existingContent, contentToInsert) => ({
      ...existingContent,
      [documentType]: [
        ...(existingContent[documentType] || []),
        {
          ...contentToInsert,
          validUntil: lastFailingDate || 'to-be-determined',
        },
      ],
    }),
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
  } catch (e: any) {
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

    if (!issue) {
      throw new Error(
        `There does not seem to be any open issue for ${serviceName} - ${documentType}`
      );
    }

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
    return {
      issueNumber: issue.number,
      lastFailingDate: mostRecentFailingComment.createdAt,
    };
  } catch (e: any) {
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
  } catch (e: any) {
    console.error('Could not search issue');
    console.error(e.toString());
    throw e;
  }
};

export const getDataFromCommit = async ({
  commitId,
  ...params
}: {
  commitId: string;
  owner: string;
  repo: string;
}) => {
  try {
    const { data } = await octokit.rest.repos.getCommit({
      ...params,
      ref: commitId,
    });
    return data;
  } catch (e: any) {
    console.error(`Could not get data from commit ${commitId}`);
    console.error(e.toString());
    throw e;
  }
};
