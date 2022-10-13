import Search, { SearchProps } from 'components/Search/Search';
import withMdx, { WithMdxResult } from 'modules/I18n/hoc/withMdx';

import Column from 'modules/Common/components/Column';
import Container from 'modules/Common/containers/Container';
import Hero from 'modules/Common/components/Hero';
import { FiAlertTriangle as IconAlert } from 'react-icons/fi';
import Layout from 'modules/Common/containers/Layout';
import { MDXRemote } from 'next-mdx-remote';
import TextContent from 'modules/Common/components/TextContent';
import { useEvent } from 'react-use';
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

  return (
    <Layout title={t('homepage:seo.title')} desc={t('homepage:seo.desc')}>
      {/* Hero */}
      <Container layout="wide" paddingY={false} dark={true}>
        <Container gridCols="12" gridGutters="11" flex={true} paddingX={false}>
          <Hero title={t('homepage:title')}>
            {destination && (
              <>
                {destination}
              </>
            )}
          </Hero>
        </Container>
      </Container>

      <Container paddingY={false}>
        {!destination && (
          <Container gridCols="12" gridGutters="11" flex={true} alignX="center" paddingX={false}>
            <Column width={75} className="text__center">
              <TextContent className="text__error">
                <IconAlert /> {t('homepage:no-destination')}
              </TextContent>
            </Column>
          </Container>
        )}
        {destination && (
          <Container gridCols="12" gridGutters="11" flex={true} paddingX={false}>
            <Column width={100}>
              <TextContent>
                <MDXRemote {...(mdxContent as any)} />
              </TextContent>
              <Search
                label={t('homepage:search.label')}
                buttonLabel={t('homepage:search.button')}
                placeholder="https://www.amazon.com/gp/help/customer/display.html?nodeId=13819201"
                onSearchSubmit={onSubmit}
              />
            </Column>
          </Container>
        )}
      </Container>
    </Layout>
  );
};

export const getStaticProps = withMdx({ load: 'mdx', filename: 'homepage', folder: 'static' })();

export default HomePage;
