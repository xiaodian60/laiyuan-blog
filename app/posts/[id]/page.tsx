/* ═══════════════════════════════════════════════════════
   Supabase 配置（硬编码）
   ═══════════════════════════════════════════════════════ */
const SUPABASE_URL = 'https://scosnulrtmlzbcbacoyt.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Zx_ftzPLaaufc9nENbMopw_PDIBIa8h'

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
}

import PostDetailClient from './PostDetailClient'

/* ── 生成静态路由参数 ─────────────────────────────── */
export async function generateStaticParams() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=id`, { headers })
    const posts = await res.json()
    return (posts || []).map((post: any) => ({ id: String(post.id) }))
  } catch {
    return []
  }
}

export const dynamicParams = false

/* ── 页面组件 ─────────────────────────────────────── */
export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [postRes, commentsRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}&select=*&limit=1`, { headers }),
    fetch(`${SUPABASE_URL}/rest/v1/comments?post_id=eq.${id}&select=*&order=created_at.asc`, { headers }),
  ])

  const posts = await postRes.json()
  const comments = await commentsRes.json()
  const post = posts?.[0] || null

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">😵</p>
          <p className="text-gray-500">文章不存在</p>
          <a href="/" className="text-primary hover:underline text-sm mt-2 inline-block">返回首页</a>
        </div>
      </div>
    )
  }

  return <PostDetailClient post={post} initialComments={comments || []} />
}
