# CONTRIBUTING

## Markdown Guidelines

Although we use the MDX format which sometimes allows the instantiation of React components in mdx files (see the [Readme section on this subject](/README.md#MDX)), it is recommended to avoid doing so to facilitate the contribution.

Prefer Markdown over strings for translations, as soon as there are multiple paragraphs.

## Development

```
npm install
npm run dev
```

### Test to your local IP address

To test the site on multiple terminals, you may need to access the site from your local IP address.

Run `npm run dev -H YOUR.LOCAL.IP.ADRESS`

Note : on MacOS, get your local IP with `ipconfig getifaddr en0`

## Modules documentation

- [I18n](./src/modules/I18n/README.md)
- [Analytics](./src/modules/Analytics/README.md)
- [Scraper](./src/modules/Scraper/README.md)

## Contributing code

### Pull requests

We follow the [GitHub Flow](https://guides.github.com/introduction/flow/): all code contributions are submitted via a pull request towards the `master` branch.

Opening a Pull Request means you want that code to be merged. If you want to only discuss it, send a link to your branch along with your questions through whichever communication channel you prefer.

#### Peer reviews

All pull requests must be reviewed by at least one person who is not their original author.

To help reviewers, make sure to describe your pull request with a **clear text explanation** of your changes.

### Commit messages

We strive to follow this [recommendation](https://chris.beams.io/posts/git-commit) to write our commit messages, which contains the following rules:

- [Separate subject from body with a blank line](https://chris.beams.io/posts/git-commit/#separate).
- [Limit the subject line to 50 characters](https://chris.beams.io/posts/git-commit/#limit-50).
- [Capitalize the subject line](https://chris.beams.io/posts/git-commit/#capitalize).
- [Do not end the subject line with a period](https://chris.beams.io/posts/git-commit/#end).
- [Use the imperative mood in the subject line](https://chris.beams.io/posts/git-commit/#imperative).
- [Wrap the body at 72 characters](https://chris.beams.io/posts/git-commit/#wrap-72).
- [Use the body to explain what and why vs. how](https://chris.beams.io/posts/git-commit/#why-not-how).

We add this additional rule:

- Do not rely on GitHub issue reference numbers in commit messages, as we have no guarantee the host system and its autolinking will be stable in time. Make sure the context is self-explanatory. If an external reference is given, use its full URL.

### MDX

As we use MDX ([mdxjs.com](https://mdxjs.com/)), we can use JSX in Markdown content with the `<MDXRemote />` component. This one takes a `components` parameter that lists React components that can be instantiated `.mdx` corresponding file.

Exemple to allow using a `Button` component in a `.mdx` file:

In `my-page.tsx`:

```jsx
<MDXRemote {...(mdxContent as any)} components={{ Button: Button }} />
```

In `my-page.mdx`:

```mdx
<Button type="secondary">Read</Button>
```
