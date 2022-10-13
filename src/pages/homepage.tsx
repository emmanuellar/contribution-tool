import Search, { SearchProps } from 'components/Search/Search';
import withMdx, { WithMdxResult } from 'modules/I18n/hoc/withMdx';

import Container from 'modules/Common/containers/Container';
import Hero from 'modules/Common/components/Hero';
import { FiAlertTriangle as IconAlert } from 'react-icons/fi';
import Layout from 'modules/Common/containers/Layout';
import { MDXRemote } from 'next-mdx-remote';
import TextContent from 'modules/Common/components/TextContent';
import { useEvent } from 'react-use';
import classNames from 'classnames';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

const HomePage = ({ mdxContent }: WithMdxResult) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { localPath, destination } = router.query;
  const commonUrlParams = `destination=${destination}${localPath ? `&localPath=${localPath}` : ''}`;

  useEvent('touchstart', () => {
    router.push(`/sorry?${commonUrlParams}`);
  });

  const onSubmit: SearchProps['onSearchSubmit'] = async (url) => {
    try {
      router.push(`/service?${commonUrlParams}&url=${encodeURIComponent(url)}`);
    } catch (e) {
      console.error(e);
    }
  };

  const onUseCommit = (event: any) => {
    router.push(`/service?commit=${event.target.value}`);
  };

  return (
    <Layout title={t('homepage:seo.title')} desc={t('homepage:seo.desc')}>
      {/* Hero */}
      <Container layout="wide" paddingY={false} dark={true}>
        <Container gridCols="12" gridGutters="11" flex={true} paddingX={false}>
          <Hero title={t('homepage:title')}>{destination && <>{destination}</>}</Hero>
        </Container>
      </Container>

      <Container paddingY={false}>
        <Container gridCols="10" gridGutters="9">
          {mdxContent && <MDXRemote {...(mdxContent as any)} />}
        </Container>
        <Container gridCols="10" gridGutters="9" paddingTop={false}>
          <TextContent>
            <h2>{t('homepage:add.title')}</h2>
            {!destination && (
              <TextContent className="text__error">
                <IconAlert /> {t('homepage:no-destination')}
              </TextContent>
            )}

            <Search
              label={t('homepage:search.label')}
              buttonLabel={t('homepage:search.button')}
              placeholder="https://www.amazon.com/gp/help/customer/display.html?nodeId=13819201"
              onSearchSubmit={onSubmit}
              disabled={!destination}
            />
          </TextContent>
        </Container>

        <Container gridCols="10" gridGutters="9" paddingTop={false}>
          <TextContent>
            <h2>{t('homepage:edit.title')}</h2>
            <div className={classNames('formfield')}>
              <label htmlFor="github-commit">{t('homepage:edit.subtitle')}</label>
              <input
                id="github-commit"
                placeholder="https://github.com/OpenTermsArchive/contrib-versions/commit/76b17c1038ba610c010c7fb271ae04196de1e19a"
                onInput={onUseCommit}
              />
            </div>
          </TextContent>
        </Container>
      </Container>
    </Layout>
  );
};

export const getStaticProps = withMdx({ load: 'mdx', filename: 'homepage', folder: 'static' })();

export default HomePage;
