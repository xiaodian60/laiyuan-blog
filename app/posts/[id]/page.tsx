import PostDetailClient from './PostDetailClient';

export async function generateStaticParams() {
  return [];
}

export default function Page() {
  return <PostDetailClient />;
}