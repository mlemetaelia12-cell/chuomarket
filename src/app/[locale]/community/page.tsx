import { desc, eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { communityAnswers, communityPosts, users } from '@/db/schema';
import { CommunityBoard } from '@/components/community/community-board';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ type: requestedType }, t] = await Promise.all([
    searchParams,
    getTranslations('Community'),
  ]);
  const selectedType =
    requestedType === 'material' || requestedType === 'room' || requestedType === 'lost_found'
      ? requestedType
      : undefined;
  const [posts, user] = await Promise.all([
    db.query.communityPosts.findMany({
      where: selectedType ? eq(communityPosts.type, selectedType) : undefined,
      orderBy: [desc(communityPosts.createdAt)],
      limit: 60,
      with: { author: true },
    }),
    requireMarketplaceUser(),
  ]);
  const answers = await db
    .select({
      postId: communityAnswers.postId,
      body: communityAnswers.body,
      createdAt: communityAnswers.createdAt,
      username: users.username,
    })
    .from(communityAnswers)
    .innerJoin(users, eq(communityAnswers.authorId, users.id))
    .orderBy(desc(communityAnswers.createdAt))
    .limit(150);
  const safePosts = posts.map((post) => ({
    id: post.id,
    type: post.type,
    title: post.title,
    description: post.description,
    course: post.course,
    year: post.year,
    meetingPlace: post.meetingPlace,
    photoUrl: post.photoUrl,
    postStatus: post.postStatus,
    lostFoundType: post.lostFoundType,
    createdAt: post.createdAt.toISOString(),
    author: { username: post.author.username, createdAt: post.author.createdAt.toISOString() },
    answers: answers
      .filter((answer) => answer.postId === post.id)
      .map((answer) => ({
        body: answer.body,
        createdAt: answer.createdAt.toISOString(),
        username: answer.username,
      })),
  }));
  return (
    <div className="space-y-4">
      <CommunityBoard loggedIn={Boolean(user)} posts={safePosts} />
      <p className="text-xs leading-5 text-brand-400">{t('safety')}</p>
    </div>
  );
}
