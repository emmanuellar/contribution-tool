import { createPullRequest } from 'modules/Github/api';
import snakeCase from 'lodash/fp/snakeCase';
import latinize from 'latinize';

export const deriveIdFromName = (name: string) => {
  return latinize(name) // remove accents
    .replace(/(&|\\|\/|:)/gi, '-'); // remove characters that might be problematic on the file system
};

export const addService = async ({
  destination,
  name,
  documentType,
  json,
  url,
}: {
  destination: string;
  name: string;
  documentType: string;
  json: any;
  url: string;
}) => {
  if (!destination) {
    return {};
  }
  const [githubOrganization, githubRepository] = (destination || '')?.split('/');

  const commonParams = {
    owner: githubOrganization,
    repo: githubRepository,
    accept: 'application/vnd.github.v3+json',
  };

  const prTitle = `Add ${name} ${documentType}`;
  const id = deriveIdFromName(name);
  const filePath = `declarations/${id}.json`;
  const { origin } = new URL(url);

  const localUrl = url.replace(origin, 'http://localhost:3000');

  const body = `This suggestion has been created with the [Contribution Tool](https://github.com/OpenTermsArchive/contribution-tool/), which enables graphical declaration of documents. You can see this declaration suggestion [online](${url}) or [on your local instance](${localUrl}) if you have one set up.
  
Bots should take care of checking the formatting and the validity of the declaration. As a human reviewer, here are the things you should check:

- [ ] **The suggested document matches the scope of this instance**: it targets a service in the language, jurisdiction, and industry that are part of those [described](../#scope) for this instance.
- [ ] **The service name matches what you see on the web page**, and it complies with the [guidelines](https://github.com/OpenTermsArchive/contrib-declarations/blob/main/CONTRIBUTING.md#service-name).
- [ ] **The service ID (i.e. the name of the file) is derived from the service name** according to the [guidelines](https://github.com/OpenTermsArchive/contrib-declarations/blob/main/CONTRIBUTING.md#service-id).
- [ ] The document type is appropriate for this document: if you read out loud the [document type tryptich](https://github.com/ambanum/OpenTermsArchive/blob/main/src/archivist/services/documentTypes.json), you can say that **“this document describes how the \`writer\` commits to handle the \`object\` for its \`audience\`”**.
- [ ] **The selectors seem to be stable**: as much as possible, the CSS selectors are meaningful and specific (e.g. \`.tos-content\` rather than \`.ab23 .cK_drop > div\`).
- [ ] **The selectors are as simple as they can be**: the CSS selectors do not have unnecessary specificity (e.g. if there is an ID, do not add a class).
- [ ] **The document content is relevant**: it is not just a series of links, for example.
- [ ] **The generated version is readable**: it is complete and not mangled.
- [ ] **The generated version is clean**: it does not contain navigation links, unnecessary images, or extra content.

If there seems to be no appropriate document type for this document yet it is relevant to track for this instance, please check if there is already an [open discussion](https://github.com/ambanum/OpenTermsArchive/discussions) about such a type and reference your case there, or open a new discussion if not.

Thanks to your work and attention, Open Terms Archive will ensure that high quality data is available for all reusers, enabling them to do their part in shifting the balance of power towards end users and regulators instead of spending time collecting and cleaning documents 👏💪
`;

  return createPullRequest({
    ...commonParams,
    targetBranch: 'main',
    newBranch: snakeCase(prTitle),
    title: prTitle,
    content: json,
    filePath,
    body,
  });
};
