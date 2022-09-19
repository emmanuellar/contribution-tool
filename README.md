# OpenTermsArchive Contribution Tool

This is the repository for `contribute.opentermsarchive.org`, a website that helps user create service declarations for the [Open Terms Archive](https://github.com/ambanum/OpenTermsArchive) project.

## Introduction

Build on [Next.js](https://nextjs.org) react framework, using [TypeScript](https://www.typescriptlang.org/) and [PostCSS](https://postcss.org/).

## Configuration

Copy `.env.example` to `.env` file at the root of the project and fill in the values of the constants.

Note that you can use [Nextjs Documentation](https://nextjs.org/docs/basic-features/environment-variables#loading-environment-variables) if you wish to add more environment variables

### `PORT`

Port on which the website will run.

Example `PORT=5000`
Default is `3000`

### `NEXT_PUBLIC_BASE_PATH`

To deploy the website under a sub-path of a domain you can use this env variable config option.

Example `NEXT_PUBLIC_BASE_PATH="/prefix"`
Default is empty

### `GITHUB_TOKEN`

In order for the service to automatically create issues in Github when a submitting a new service declaration, you need the below environment variables:

- `GITHUB_TOKEN`: A token with repository privileges which allow access to the [GitHub API](https://github.com/settings/tokens).

### `NEXT_PUBLIC_MATOMO_URL`, `NEXT_PUBLIC_MATOMO_SITE_ID`

You can easily set up analytics with [Matomo](https://matomo.org/) by providing those 2 values.

## Contribution interface Usage

### Destination repository (Mandatory)

The contribution interface can be used against any repository on which github user which generated the `GITHUB_TOKEN` has issue creation rights.

This repo must be passed by an url parameter called `destination`

Here are some examples for contributing to different projects using

- /en?destination=OpenTermsArchive/contrib-declarations
- /en?destination=OpenTermsArchive/dating-declarations
- /en?destination=OpenTermsArchive/sandbox (For tests)

### Usage

Once `destination` is setup, you need to enter an url and follow the written guidelines.

After selecting the page parts you want to track, clicking on `Validate` will automatically create an issue in the given `destination` github repository.

In case this automatic creation does not work, a fallback is setup, opening a `mailto` link with prepopulated data.

#### Local creation of services from contribution interface

If you are interested in setting up a local instance where you can locally save the result of the contribution interface, you have to specify where to save it.
This can be done with a url parameter called `localPath`.

It takes a full local path string and must point to the exact folder containing the declarations.
See below examples:

```
/en?destination=OpenTermsArchive/contrib-declarations&localPath=/Users/username/Workspace/OpenTermsArchive/contrib-declarations/declarations
/en?destination=OpenTermsArchive/dating-declarations&localPath=/Users/username/Workspace/somewhere-else/dating-declarations/declarations
```

This way, a `Save on local` button will appear on the contribution interface. By clicking on it, it will add or modify the service declaration (saved as a `.json` file) in the corresponding directory.

### Automatically generating history file

As we want to ensure we can retrace the whole history of selectors we used to retrieve the corresponding documents, a history file should be created **every time you change the service declaration** (See the corresponding [decision record](./decision-record/0002-service-history.md).
As this is a very time consuming thing to do (retrieve the last version date, format it in ISO format and pasting it in a history file), an attempt to find this date has been implemented.
When having the [Local creation of services from contribution interface](#local-creation-of-services-from-contribution-interface) feature enabled, if a service file already exists, the contribution tool will try to retrieve the first error referenced on GitHub concerning this document, will fetch its date and add the record to the history file.
This will not always be accurate but we'll use this until the core of Open Terms Archive provides such a feature.

## Contributing

See our [contributing guide](CONTRIBUTING.md).

## License

The code for this software is distributed under the European Union Public Licence (EUPL) v1.2.
Contact the author if you have any specific need or question regarding licensing.

```

```
