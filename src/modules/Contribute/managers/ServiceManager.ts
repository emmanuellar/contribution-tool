import {
  createDocumentAddPullRequest,
  updateDocumentInBranch,
  createDocumentUpdatePullRequest,
  getLatestFailDate,
} from 'modules/Github/api';
import snakeCase from 'lodash/fp/snakeCase';
import latinize from 'latinize';

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
  public declarationFilePath: string;
  public historyFilePath: string;

  private commonParams: { owner: string; repo: string; accept: string };

  static deriveIdFromName = (name: string) => {
    return latinize(name) // remove accents
      .replace(/(&|\\|\/|:)/gi, '-'); // remove characters that might be problematic on the file system
  };

  constructor({ destination, name, type }: { destination: string; name: string; type: string }) {
    if (!destination) {
      throw new Error('Destination is mandatory');
    }
    const [githubOrganization, githubRepository] = (destination || '')?.split('/');

    if (!authorizedOrganizations.includes(githubOrganization)) {
      throw new Error('Destination should be OpenTermsArchive/something or ambanum/something');
    }

    this.githubOrganization = githubOrganization;
    this.githubRepository = githubRepository;
    this.name = name;
    this.type = type;
    this.id = ServiceManager.deriveIdFromName(name);
    this.declarationFilePath = `declarations/${this.id}.json`;
    this.historyFilePath = `declarations/${this.id}.history.json`;

    this.commonParams = {
      owner: this.githubOrganization,
      repo: this.githubRepository,
      accept: 'application/vnd.github.v3+json',
    };
  }

  public async addOrUpdateService({ json, url }: { json: any; url: string }) {
    const { origin } = new URL(url);
    const localUrl = url.replace(origin, 'http://localhost:3000');
    let lastFailingDate;
    try {
      lastFailingDate = await getLatestFailDate({
        ...this.commonParams,
        serviceName: this.name,
        documentType: this.type,
      });

      return this.updateService({
        json,
        url,
        localUrl,
        lastFailingDate,
      });
    } catch (e: any) {
      console.log('Try adding service');
      return this.addService({ json, url, localUrl });
    }
  }

  public async addService({ json, url, localUrl }: { json: any; url: string; localUrl: string }) {
    const prTitle = `Add ${this.name} ${this.type}`;
    const branchName = snakeCase(prTitle);

    const hasSelector = !!json?.documents[this.type]?.select;

    const checkBoxes = [
      '- [ ] The suggested document **matches the scope of this instance**: it targets a service in the language, jurisdiction, and industry that are part of those [described](../#scope) for this instance.',
      `- [ ] **The service name \`${this.name}\` matches what you see on the web page**, and it complies with the [guidelines](https://github.com/OpenTermsArchive/contrib-declarations/blob/main/CONTRIBUTING.md#service-name).`,
      `- [ ] **The service ID \`${this.id}\` (i.e. the name of the file) is derived from the service name** according to the [guidelines](https://github.com/OpenTermsArchive/contrib-declarations/blob/main/CONTRIBUTING.md#service-id).`,
      `- [ ] The document type \`${this.type}\` is appropriate for this document: if you read out loud the [document type tryptich](https://github.com/ambanum/OpenTermsArchive/blob/main/src/archivist/services/documentTypes.json), you can say that **“this document describes how the \`writer\` commits to handle the \`object\` for its \`audience\`”**.`,
      ...(hasSelector ? selectorsCheckboxes : []),
      ...versionCheckboxes,
    ];

    const body = `### [🔎 Inspect this declaration suggestion](${url})
  
  - - -
  
  Bots should take care of checking the formatting and the validity of the declaration. As a human reviewer, you should check:
  
  ${checkBoxes.join('\n')}
  
  If no document type seems appropriate for this document yet it is relevant to track in this instance, please check if there is already an [open discussion](https://github.com/ambanum/OpenTermsArchive/discussions) about such a type and reference your case there, or open a new discussion if not.
  
  Thanks to your work and attention, Open Terms Archive will ensure that high quality data is available for all reusers, enabling them to do their part in shifting the balance of power towards end users and regulators instead of spending time collecting and cleaning documents 💪
  
  - - -
  
  _This suggestion has been created through the [Contribution Tool](https://github.com/OpenTermsArchive/contribution-tool/), which enables graphical declaration of documents.
  You can load it [on your local instance](${localUrl}) if you have one set up._
  `;

    try {
      return await createDocumentAddPullRequest({
        ...this.commonParams,
        targetBranch: 'main',
        newBranch: branchName,
        title: prTitle,
        content: json,
        filePath: this.declarationFilePath,
        body,
      });
    } catch (e: any) {
      if (e?.response?.data?.message === 'Reference already exists') {
        const updateBody = `### [🔎 Inspect the updated declaration suggestion](${url})
  
  - - -
  
  A new suggestion has been made, voiding the previous ones.
        
  As a human reviewer, here are the things you should check:
  
  ${checkBoxes.join('\n')}
  
  - - -
  
  _This suggestion has been created through the [Contribution Tool](https://github.com/OpenTermsArchive/contribution-tool/), which enables graphical declaration of documents.
  You can load it [on your local instance](${localUrl}) if you have one set up._
  `;
        // a branch already exists wit this name, add a commit to it
        return await updateDocumentInBranch({
          ...this.commonParams,
          branch: branchName,
          content: json,
          filePath: this.declarationFilePath,
          message: 'Update declaration from contribution tool',
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
  }: {
    json: any;
    url: string;
    lastFailingDate: string;
    localUrl: string;
  }) {
    const prTitle = `Update ${this.name} ${this.type}`;
    const branchName = snakeCase(prTitle);
    const hasSelector = !!json?.documents[this.type]?.select;
    const checkBoxes = [...(hasSelector ? selectorsCheckboxes : []), ...versionCheckboxes];

    const body = `### [🔎 Inspect this declaration update suggestion](${url})

- - -

Bots should take care of checking the formatting and the validity of the declaration. As a human reviewer, you should check:

${checkBoxes.join('\n')}

Thanks to your work and attention, Open Terms Archive will ensure that high quality data is available for all reusers, enabling them to do their part in shifting the balance of power towards end users and regulators instead of spending time collecting and cleaning documents 💪

- - -

_This update suggestion has been created through the [Contribution Tool](https://github.com/OpenTermsArchive/contribution-tool/), which enables graphical declaration of documents.
You can load it [on your local instance](${localUrl}) if you have one set up._
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
        historyMessage: 'Update history from contribution tool',
        message: 'Update declaration from contribution tool',
        body,
      });
    } catch (e) {
      throw e;
    }
  }
}
