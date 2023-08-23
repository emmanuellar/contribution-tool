import {
  createDocumentAddPullRequest,
  updateDocumentsInBranch,
  createDocumentUpdatePullRequest,
  getLatestFailDate,
  getFileContent,
  getDataFromCommit,
} from 'modules/Github/api';
import snakeCase from 'lodash/fp/snakeCase';
import latinize from 'latinize';
import { OTAJson } from 'modules/Common/services/open-terms-archive';
import getConfig from 'next/config';
const { publicRuntimeConfig } = getConfig() || {};

const authorizedOrganizations = ['OpenTermsArchive', 'ambanum'];

const selectorsCheckboxes = [
  '- [ ] **Selectors are:**',
  '  - **stable**: as much as possible, the CSS selectors are meaningful and specific (e.g. `.tos-content` rather than `.ab23 .cK_drop > div`).',
  '  - **simple**: the CSS selectors do not have unnecessary specificity (e.g. if there is an ID, do not add a class or a tag).',
];

const versionCheckboxes = [
  '- [ ] **Generated version** is:',
  '  - **relevant**: it is not just a series of links, for example.',
  '  - **readable**: it is complete and not mangled.',
  '  - **clean**: it does not contain navigation links, unnecessary images, or extra content.',
];

export default class ServiceManager {
  public githubOrganization: string;
  public githubRepository: string;
  public name: string;
  public type: string;
  public id: string;
  public author: { email: string; name: string };
  public declarationFilePath: string;
  public historyFilePath: string;

  private commonParams: { owner: string; repo: string; accept: string };

  static deriveIdFromName = (name: string) => {
    return latinize(name) // remove accents
      .replace(/(&|\\|\/|:)/gi, '-'); // remove characters that might be problematic on the file system
  };

  static getOrganizationAndRepository = (destination: string) => {
    if (!destination) {
      throw new Error('Destination is mandatory');
    }
    const [githubOrganization, githubRepository] = (destination || '')?.split('/');

    if (!authorizedOrganizations.includes(githubOrganization)) {
      throw new Error(
        `Destination should be OpenTermsArchive/something or ambanum/something. Was ${destination}`
      );
    }

    return { githubOrganization, githubRepository };
  };

  constructor({
    destination,
    name,
    type,
    author,
  }: {
    destination: string;
    name: string;
    type: string;
    author?: { email?: string; name?: string };
  }) {
    const { githubOrganization, githubRepository } =
      ServiceManager.getOrganizationAndRepository(destination);

    this.githubOrganization = githubOrganization;
    this.githubRepository = githubRepository;
    this.name = name;
    this.type = type;
    this.id = ServiceManager.deriveIdFromName(name);
    this.declarationFilePath = `declarations/${this.id}.json`;
    this.historyFilePath = `declarations/${this.id}.history.json`;
    this.author = {
      name: author?.name || publicRuntimeConfig.author.name,
      email: author?.email || publicRuntimeConfig.author.email,
    };

    this.commonParams = {
      owner: this.githubOrganization,
      repo: this.githubRepository,
      accept: 'application/vnd.github.v3+json',
    };
  }

  public async addOrUpdateService({ json, url }: { json: any; url: string }) {
    const { origin } = new URL(url);
    const localUrl = url.replace(origin, 'http://localhost:3000');

    const { declaration } = await this.getDeclarationFiles();

    if (!declaration) {
      return this.addService({ json, url, localUrl });
    }

    try {
      const { lastFailingDate, issueNumber } = await getLatestFailDate({
        ...this.commonParams,
        serviceName: this.name,
        documentType: this.type,
      });
      return this.updateService({
        json,
        url,
        localUrl,
        lastFailingDate,
        issueNumber,
      });
    } catch (e: any) {
      return this.updateService({
        json,
        url,
        localUrl,
      });
    }
  }

  public async addService({ json, url, localUrl }: { json: any; url: string; localUrl: string }) {
    const prTitle = `Add ${this.name} ${this.type}`;
    const branchName = snakeCase(prTitle);

    const hasSelector = !!json?.documents[this.type]?.select;

    const checkBoxes = [
      '- [ ] The suggested document **matches the scope of this instance**: it targets a service in the language, jurisdiction, and industry that are part of those [described](../#scope) for this instance.',
      `- [ ] **The service name \`${this.name}\` matches what you see on the web page**, and it complies with the [guidelines](https://docs.opentermsarchive.org/guidelines/declaring/#service-name).`,
      `- [ ] **The service ID \`${this.id}\` (i.e. the name of the file) is derived from the service name** according to the [guidelines](https://docs.opentermsarchive.org/guidelines/declaring/#service-id).`,
      `- [ ] The terms type \`${this.type}\` is appropriate for this document: if you read out loud the [terms type tryptich](https://github.com/OpenTermsArchive/terms-types/blob/main/termsTypes.json), you can say that **“this document describes how the \`writer\` commits to handle the \`object\` for its \`audience\`”**.`,
      ...(hasSelector ? selectorsCheckboxes : []),
      ...versionCheckboxes,
    ];

    const body = `Bots should take care of checking the formatting and the validity of the declaration. As a human reviewer, you should check:

${checkBoxes.join('\n')}

### [🔎 Inspect this declaration suggestion](${url})

If no document type seems appropriate for this document yet it is relevant to track in this instance, please check if there is already an [open discussion](https://github.com/OpenTermsArchive/engine/discussions) about such a type and reference your case there, or open a new discussion if not.

Thanks to your work and attention, Open Terms Archive will ensure that high quality data is available for all reusers, enabling them to do their part in shifting the balance of power towards end users and regulators instead of spending time collecting and cleaning documents 💪

- - -

_This suggestion has been created through the [Contribution Tool](https://github.com/OpenTermsArchive/contribution-tool/), which enables graphical declaration of documents. You can load it [on your local instance](${localUrl}) if you have one set up._
`;

    try {
      return await createDocumentAddPullRequest({
        ...this.commonParams,
        targetBranch: 'main',
        newBranch: branchName,
        title: prTitle,
        message: prTitle,
        content: json,
        author: this.author,
        filePath: this.declarationFilePath,
        body,
      });
    } catch (e: any) {
      if (e?.response?.data?.message === 'Reference already exists') {
        const updateBody = `### [🔎 Inspect the updated declaration suggestion](${url})

A new suggestion has been made, voiding the previous ones. As a human reviewer, here are the things you should check:

${checkBoxes.join('\n')}

- - -

_This suggestion has been created through the [Contribution Tool](https://github.com/OpenTermsArchive/contribution-tool/), which enables graphical declaration of documents. You can load it [on your local instance](${localUrl}) if you have one set up._
`;
        // a branch already exists wit this name, add a commit to it
        return await updateDocumentsInBranch({
          ...this.commonParams,
          branch: branchName,
          targetBranch: 'main',
          content: json,
          filePath: this.declarationFilePath,
          message: `Update ${json.name} ${this.type} declaration`,
          title: prTitle,
          author: this.author,
          body: updateBody,
        });
      }
      throw e;
    }
  }

  public async updateService({
    json,
    url,
    localUrl,
    lastFailingDate,
    issueNumber,
  }: {
    json: any;
    url: string;
    lastFailingDate?: string;
    issueNumber?: number;
    localUrl: string;
  }) {
    const prTitle = `Update ${this.name} ${this.type}`;
    const branchName = snakeCase(prTitle);
    const hasSelector = !!json?.documents[this.type]?.select;

    const validUntilCheckboxes = !lastFailingDate
      ? [
          '- [ ] **`validUntil` date is correctly input**:',
          `  - Check the [latest versions](${this.getVersionsURL()})`,
          '  - Find the **first occurence** of the problematic change',
          '  - Note the **creation date** of this issue (inspect `x days ago` with developer tools and copy `datetime`)',
          `  - Find the **latest snapshot** from the [list of snapshots](${this.getSnapshotsURL()}) strictly anterior to this date`,
          '  - Copy the **creation date** of this snapshot (inspect `x days ago` with developer tools and copy `datetime`)',
          `  - Replace the \`to-be-determined\` date in history file directly from GitHub or check out branch \`${branchName}\` and do so on your local`,
        ]
      : [];

    const checkBoxes = [
      ...(hasSelector ? selectorsCheckboxes : []),
      ...versionCheckboxes,
      ...validUntilCheckboxes,
    ];

    const body = `### [🔎 Inspect this declaration update suggestion](${url})

Bots should take care of checking the formatting and the validity of the declaration. As a human reviewer, you should check:

${checkBoxes.join('\n')}

- - -

Thanks to your work and attention, Open Terms Archive will ensure that high quality data is available for all reusers, enabling them to do their part in shifting the balance of power towards end users and regulators instead of spending time collecting and cleaning documents 💪

${issueNumber ? `Fixes #${issueNumber}` : ''}
- - -

_This update suggestion has been created through the [Contribution Tool](https://github.com/OpenTermsArchive/contribution-tool/), which enables graphical declaration of documents. You can load it [on your local instance](${localUrl}) if you have one set up._
`;

    try {
      return await createDocumentUpdatePullRequest({
        ...this.commonParams,
        targetBranch: 'main',
        newBranch: branchName,
        title: prTitle,
        documentType: this.type,
        content: json,
        filePath: this.declarationFilePath,
        lastFailingDate,
        historyFilePath: this.historyFilePath,
        historyMessage: `Update ${json.name} ${this.type} history`,
        message: `Update ${json.name} ${this.type} declaration`,
        author: this.author,
        body,
      });
    } catch (e) {
      const updateBody = `### [🔎 Inspect the updated declaration suggestion](${url})

A new suggestion has been made to update this declaration, voiding the previous ones. As a human reviewer, here are the things you should check:

${checkBoxes.join('\n')}

- - -

_This suggestion has been created through the [Contribution Tool](https://github.com/OpenTermsArchive/contribution-tool/), which enables graphical declaration of documents. You can load it [on your local instance](${localUrl}) if you have one set up._
`;

      // a branch already exists wit this name, add a commit to it
      return await updateDocumentsInBranch({
        ...this.commonParams,
        documentType: this.type,
        targetBranch: 'main',
        branch: branchName,
        content: json,
        filePath: this.declarationFilePath,
        historyFilePath: this.historyFilePath,
        historyMessage: `Update ${json.name} ${this.type} history`,
        message: `Update ${json.name} ${this.type} declaration`,
        author: this.author,
        title: prTitle,
        body: updateBody,
      });
    }
  }

  public getVersionsURL() {
    return `https://github.com/${this.githubOrganization}/${this.githubRepository.replace(
      '-declarations',
      '-versions'
    )}/commits/main/${encodeURIComponent(
      ServiceManager.deriveIdFromName(this.name)
    )}/${encodeURIComponent(this.type)}.md`;
  }

  public getSnapshotsURL() {
    return `https://github.com/${this.githubOrganization}/${this.githubRepository.replace(
      '-declarations',
      '-snapshots'
    )}/commits/main/${encodeURIComponent(
      ServiceManager.deriveIdFromName(this.name)
    )}/${encodeURIComponent(this.type)}.html`;
  }

  getDeclarationFiles = async () => {
    const { content: existingContentString } = await getFileContent({
      ...this.commonParams,
      filePath: this.declarationFilePath,
      branch: 'main',
    });

    if (!existingContentString) {
      return { declaration: null };
    }

    const fullDeclaration = JSON.parse(existingContentString) as OTAJson;

    return {
      declaration: fullDeclaration.documents[this.type]
        ? {
            ...fullDeclaration,
            documents: {
              [this.type]: fullDeclaration.documents[this.type],
            },
          }
        : null,
    };
  };

  static getDataFromCommit = async (commitURL: string) => {
    const { pathname } = new URL(commitURL);

    let [repo, commitId] = pathname.replace(/^\//g, '').split('/commit/');
    const { githubOrganization, githubRepository } =
      ServiceManager.getOrganizationAndRepository(repo);

    const { commit, files } = await getDataFromCommit({
      commitId,
      owner: githubOrganization,
      repo: githubRepository,
    });

    if (!files || files.length === 0) {
      throw new Error(`Commit ${commitURL} could not be retrieved`);
    }

    const filename = files[0].filename.replace(/\.md$/, '');
    const [service, documentType] = filename.split('/');

    return {
      service,
      documentType,
      message: commit?.message,
      date: commit?.committer?.date,
      destination: repo.replace('-versions', '-declarations'),
    };
  };
}
