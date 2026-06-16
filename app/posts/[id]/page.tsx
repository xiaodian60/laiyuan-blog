import { createClient } from '@supabase/supabase-js'
import PostDetailClient from './PostDetailClient'

/* ═══════════════════════════════════════════════════════
   Supabase 客户端（硬编码）
   ═══════════════════════════════════════════════════════ */
const SUPABASE_URL = 'https://scosnulrtmlzbcbacoyt.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Zx_ftzPLaaufc9nENbMopw_PDIBIa8h'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/* ── 生成静态路由参数 ─────────────────────────────── */
export async function generateStaticParams() {
  try {
    const { data: posts } = await supabase.from('posts').select('id')
    return (posts || []).map((post) => ({ id: String(post.id) }))
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

  const [{ data: post }, { data: comments }] = await Promise.all([
    supabase.from('posts').select('*').eq('id', id).single(),
    supabase.from('comments').select('*').eq('post_id', id).order('created_at', { ascending: true }),
  ])

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
