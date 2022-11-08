import React from 'react';
import TextContent from 'modules/Common/components/TextContent';
import { useLocalStorage } from 'react-use';
import { MDXRemote } from 'next-mdx-remote';
import classNames from 'classnames';
import s from './Version.module.css';
import sButton from 'modules/Common/components/Button.module.css';

type ContributorFormProps = {
  onContributorChange: (newContributor: string) => any;
  mdxContent: any;
} & React.HTMLAttributes<HTMLDivElement>;

type FormElements = HTMLFormControlsCollection & { email: HTMLInputElement };

const ContributorForm: React.FC<ContributorFormProps> = ({
  className,
  onContributorChange,
  mdxContent,
  ...props
}) => {
  const [contributorEmail, setContributorEmail] = useLocalStorage<string | undefined>(
    'ota-contributor-email',
    ''
  );

  const onChangeContributor = (value: string) => {
    setContributorEmail(value);
    onContributorChange(value);
  };

  const onOptOut = () => {
    onChangeContributor('');
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onChangeContributor(((event.target as HTMLFormElement).elements as FormElements).email.value);
  };

  return (
    <TextContent className={classNames(s.markdown, className)} {...props}>
      {mdxContent && (
        <form onSubmit={onSubmit}>
          <MDXRemote
            {...mdxContent}
            components={{
              SignatureInput: () => (
                <input
                  required
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  defaultValue={contributorEmail}
                />
              ),
              UpdateButton: ({ children }: any) => (
                <input
                  type="submit"
                  className={classNames(sButton.button, sButton.sm)}
                  style={{ margin: 'var(--mXS) 0' }}
                  value={children}
                />
              ),
              OptOutButton: ({ children }: any) => <a onClick={onOptOut}>{children}</a>,
            }}
          />
        </form>
      )}
    </TextContent>
  );
};

export default ContributorForm;
