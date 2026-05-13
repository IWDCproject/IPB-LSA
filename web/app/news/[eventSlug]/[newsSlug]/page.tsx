import { notFound }      from 'next/navigation';
import type { Metadata } from 'next';
import Image             from 'next/image';
import { getNewsBySlug } from '@/lib/directus';
import DOMPurify         from 'isomorphic-dompurify';
import DOMPurify         from 'isomorphic-dompurify';
import Footer            from '@/components/Footer';
import styles            from './NewsDetail.module.css';
import EventLink         from './_components/EventLink';
import AnimatedArticle   from './_components/AnimatedArticle';


interface Props {
  params: { eventSlug: string; newsSlug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const news = await getNewsBySlug(params.eventSlug, params.newsSlug);
  if (!news) return {};

  const title       = `${news.title} - IPB LSA`;
  const description = news.excerpt?.slice(0, 160) ?? news.title;
  const ogImage     = news.thumbnail_url ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      ...(ogImage && {
        images: [{ url: ogImage, width: 1200, height: 630, alt: news.title }],
      }),
    },
    twitter: {
      card:  ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const news = await getNewsBySlug(params.eventSlug, params.newsSlug);
  if (!news) notFound();

  const eventName  = news.event_id?.name ?? null;
  const eventSlug  = news.event_id?.slug ?? params.eventSlug;
  const authorName = (news as any).author_id?.organisation_name ?? 'IPB LSA';

  const formattedDate = news.published_at
    ? new Date(news.published_at).toLocaleDateString('en-GB', {
        day:   'numeric',
        month: 'short',
        year:  'numeric',
      })
    : null;

  return (
    <>
      <main className={styles.page}>
        <AnimatedArticle>

          <header className={styles.header}>
            <h1 className={styles.title}>{news.title}</h1>

            <div className={styles.byline}>
              <div className={styles.bylineLeft}>
                <span className={styles.author}>{authorName}</span>
                {formattedDate && (
                  <>
                    <span className={styles.bylineDot} aria-hidden="true">·</span>
                    <time dateTime={news.published_at ?? undefined} className={styles.date}>
                      {formattedDate}
                    </time>
                  </>
                )}
                {news.category && (
                  <span className={styles.badge}>{news.category}</span>
                )}
              </div>
              {eventName && (
                <div className={styles.bylineRight}>
                  <EventLink href={`/events/${eventSlug}?tab=news`} name={eventName} />
                </div>
              )}
            </div>

            <div className={styles.divider} />
          </header>

          {/* -- Hero image -- */}
          <div className={styles.heroWrap}>
            {news.thumbnail_url ? (
              <Image
                src={news.thumbnail_url}
                alt={news.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 800px"
                className={styles.heroImage}
              />
            ) : (
              <div className={styles.heroPlaceholder} />
            )}
          </div>

          {/* -- Article body -- */}
          <div
            className={`${styles.body} prose`}
            dangerouslySetInnerHTML={{ __html: news.content ?? '' }}
          />

        </AnimatedArticle>
      </main>
      <Footer />
    </>
  );
}