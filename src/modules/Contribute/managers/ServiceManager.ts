import { createDocumentPullRequest, updateDocumentInBranch } from 'modules/Github/api';
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
  const branchName = snakeCase(prTitle);
  const id = deriveIdFromName(name);
  const filePath = `declarations/${id}.json`;
  const { origin } = new URL(url);

  const localUrl = url.replace(origin, 'http://localhost:3000');

  const hasSelector = !!json?.documents[documentType]?.select;
  const selectorsCheckBoxes = hasSelector
    ? [
        '- [ ] **Selectors are:**',
        '  - **stable**: as much as possible, the CSS selectors are meaningful and specific (e.g. `.tos-content` rather than `.ab23 .cK_drop > div`).',
        '  - **simple**: the CSS selectors do not have unnecessary specificity (e.g. if there is an ID, do not add a class or a tag).',
      ]
    : [];

  const checkBoxes = [
    '- [ ] The suggested document **matches the scope of this instance**: it targets a service in the language, jurisdiction, and industry that are part of those [described](../#scope) for this instance.',
    `- [ ] **The service name \`${name}\` matches what you see on the web page**, and it complies with the [guidelines](https://github.com/OpenTermsArchive/contrib-declarations/blob/main/CONTRIBUTING.md#service-name).`,
    `- [ ] **The service ID \`${id}\` (i.e. the name of the file) is derived from the service name** according to the [guidelines](https://github.com/OpenTermsArchive/contrib-declarations/blob/main/CONTRIBUTING.md#service-id).`,
    `- [ ] The document type \`${documentType}\` is appropriate for this document: if you read out loud the [document type tryptich](https://github.com/ambanum/OpenTermsArchive/blob/main/src/archivist/services/documentTypes.json), you can say that **“this document describes how the \`writer\` commits to handle the \`object\` for its \`audience\`”**.`,
    ...selectorsCheckBoxes,
    '- [ ] **Generated version** is:',
    '  - **relevant**: it is not just a series of links, for example.',
    '  - **readable**: it is complete and not mangled.',
    '  - **clean**: it does not contain navigation links, unnecessary images, or extra content.',
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
    return await createDocumentPullRequest({
      ...commonParams,
      targetBranch: 'main',
      newBranch: branchName,
      title: prTitle,
      content: json,
      filePath,
      body,
    });
  } catch (e: any) {
    if (e?.response?.data?.message === 'Reference already exists') {
      const updateBody = `### [🔎 Inspect this declaration suggestion](${url})

- - -

A new suggestion has been made, voiding the above ones.
      
As a human reviewer, here are the things you should check:

${checkBoxes.join('\n')}

- - -

_This suggestion has been created through the [Contribution Tool](https://github.com/OpenTermsArchive/contribution-tool/), which enables graphical declaration of documents.
You can load it [on your local instance](${localUrl}) if you have one set up._
`;
      // a branch already exists wit this name, add a commit to it
      return await updateDocumentInBranch({
        ...commonParams,
        branch: branchName,
        content: json,
        filePath,
        message: 'Update declaration from contribution tool',
        body: updateBody,
      });
    }
    throw e;
  }
};
