import React from 'react';
import TextContent from 'modules/Common/components/TextContent';
import { useLocalStorage } from 'react-use';
import { MDXRemote } from 'next-mdx-remote';
import classNames from 'classnames';
import s from './Version.module.css';
import sButton from 'modules/Common/components/Button.module.css';

const DEFAULT_CONTRIBUTOR_NAME = 'Anonymous Contributor';
const DEFAULT_CONTRIBUTOR_EMAIL = 'anonymous@contribute.opentermsarchive.org';

interface Contributor {
  name: string;
  email: string;
}

type ContributorFormProps = {
  onContributorChange: (contributor: Contributor) => any;
  mdxContent: any;
} & React.HTMLAttributes<HTMLDivElement>;

type FormElements = HTMLFormControlsCollection & {
  name: HTMLInputElement;
  email: HTMLInputElement;
};

export const useContributor = () => {
  const [email, setEmail] = useLocalStorage<string>(
    'ota-contributor-email',
    DEFAULT_CONTRIBUTOR_EMAIL
  );
  const [name, setName] = useLocalStorage<string>('ota-contributor-name', DEFAULT_CONTRIBUTOR_NAME);

  return {
    email,
    name,
    setEmail,
    setName,
  };
};

const ContributorForm: React.FC<ContributorFormProps> = ({
  className,
  onContributorChange,
  mdxContent,
  ...props
}) => {
  const { email, setEmail, name, setName } = useContributor();

  const onChangeContributor = ({ name, email }: Contributor) => {
    setEmail(email);
    setName(name);
    onContributorChange({ name, email });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { email, name } = (event.target as HTMLFormElement).elements as FormElements;

    onChangeContributor({ email: email.value, name: name.value });
  };

  return (
    <TextContent className={classNames(s.markdown, className)} {...props}>
      {mdxContent && (
        <form onSubmit={onSubmit}>
          <MDXRemote
            {...mdxContent}
            components={{
              SignatureNameInput: () => (
                <input
                  required
                  name="name"
                  type="name"
                  placeholder={DEFAULT_CONTRIBUTOR_NAME}
                  defaultValue={name}
                  style={{ margin: 'var(--mXS) 0' }}
                />
              ),
              SignatureEmailInput: () => (
                <input
                  required
                  name="email"
                  type="email"
                  placeholder={DEFAULT_CONTRIBUTOR_EMAIL}
                  defaultValue={email}
                  style={{ margin: 'var(--mXS) 0' }}
                />
              ),
              UpdateButton: ({ children }: any) => (
                <input
                  type="submit"
                  className={classNames(sButton.button, sButton.sm)}
                  style={{ margin: 'var(--mXS) 0 var(--mXL)' }}
                  value={children}
                />
              ),
            }}
          />
        </form>
      )}
    </TextContent>
  );
};

export default ContributorForm;
