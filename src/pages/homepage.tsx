import Search, { SearchProps } from 'components/Search/Search';
import { WithI18nResult, withI18n } from 'modules/I18n';

import Column from 'modules/Common/components/Column';
import Container from 'modules/Common/containers/Container';
import Hero from 'modules/Common/components/Hero';
import { FiAlertTriangle as IconAlert } from 'react-icons/fi';
import Layout from 'modules/Common/containers/Layout';
import { MDXRemote } from 'next-mdx-remote';
import TextContent from 'modules/Common/components/TextContent';
import { useEvent } from 'react-use';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

const HomePage = ({ mdxContent }: WithI18nResult) => {
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
          <Hero title={t('homepage:title')}></Hero>
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

export const getStaticProps = withI18n({ load: 'mdx', filename: 'homepage' })(
  async (props: any) => {
    return JSON.parse(JSON.stringify({ props: { ...props }, revalidate: 10 }));
  }
);

export default HomePage;
