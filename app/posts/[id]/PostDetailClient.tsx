'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

/* ═══════════════════════════════════════════════════════
   Supabase 客户端（硬编码）
   ═══════════════════════════════════════════════════════ */
const SUPABASE_URL = 'https://scosnulrtmlzbcbacoyt.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Zx_ftzPLaaufc9nENbMopw_PDIBIa8h'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/* ── 类型 ──────────────────────────────────────────── */
interface Post {
  id: string
  title: string
  content: string
  tags: string[]
  image_url: string | null
  is_pinned: boolean
  likes_count: number
  created_at: string
}

interface Comment {
  id: string
  post_id: string
  author: string
  content: string
  parent_id: string | null
  created_at: string
}

/* ═══════════════════════════════════════════════════════
   详情页客户端组件
   ═══════════════════════════════════════════════════════ */
export default function PostDetailClient({
  post,
  initialComments,
}: {
  post: Post
  initialComments: Comment[]
}) {
  /* ── 状态 ──────────────────────────────────────── */
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editContent, setEditContent] = useState(post.content)
  const [editTags, setEditTags] = useState((post.tags || []).join(', '))
  const [saving, setSaving] = useState(false)

  // 图片放大
  const [imageExpanded, setImageExpanded] = useState(false)

  useEffect(() => {
    setLiked(!!localStorage.getItem(`liked_${post.id}`))
  }, [post.id])

  /* ── 操作 ──────────────────────────────────────── */
  const handleLike = async () => {
    if (liked) return
    await supabase.from('posts').update({ likes_count: likesCount + 1 }).eq('id', post.id)
    setLiked(true)
    setLikesCount((c) => c + 1)
    localStorage.setItem(`liked_${post.id}`, '1')
  }

  const refreshComments = async () => {
    const { data } = await supabase.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true })
    setComments(data || [])
  }

  const addComment = async () => {
    if (!newComment.trim() || !authorName.trim()) return
    await supabase.from('comments').insert({ post_id: post.id, author: authorName, content: newComment, parent_id: null })
    await refreshComments()
    setNewComment('')
  }

  const addReply = async (parentId: string) => {
    if (!replyContent.trim() || !authorName.trim()) return
    await supabase.from('comments').insert({ post_id: post.id, author: authorName, content: replyContent, parent_id: parentId })
    await refreshComments()
    setReplyContent('')
    setReplyTo(null)
  }

  const deleteComment = async (id: string) => {
    if (!confirm('确定删除此评论？')) return
    await supabase.from('comments').delete().eq('id', id)
    await refreshComments()
  }

  const saveEdit = async () => {
    setSaving(true)
    await supabase.from('posts').update({
      title: editTitle,
      content: editContent,
      tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
    }).eq('id', post.id)
    setSaving(false)
    setIsEditing(false)
    window.location.reload()
  }

  /* ── 辅助 ──────────────────────────────────────── */
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const topLevel = comments.filter((c) => !c.parent_id)
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId)

  /* ═══════════════════════════════════════════════════════
     渲染
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部栏 */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="text-primary hover:underline text-sm flex items-center gap-1">← 返回首页</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* ━━ 文章区域 ━━ */}
        <article className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* 封面图 — 可点击放大 */}
          {post.image_url && !isEditing && (
            <div className="relative cursor-pointer group" onClick={() => setImageExpanded(true)}>
              <img src={post.image_url} alt={post.title} className="w-full max-h-80 object-cover group-hover:opacity-95 transition-opacity" />
              <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                🔍 点击放大
              </div>
            </div>
          )}

          <div className="p-6">
            {isEditing ? (
              /* ── 编辑模式 ── */
              <div className="space-y-4">
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="标题" className="w-full text-2xl font-bold px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={12} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm leading-relaxed" />
                <input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="标签（逗号分隔）" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsEditing(false)} className="px-5 py-2 border rounded-lg hover:bg-gray-50 transition-colors text-sm">取消</button>
                  <button onClick={saveEdit} disabled={saving} className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm">{saving ? '保存中...' : '保存修改'}</button>
                </div>
              </div>
            ) : (
              /* ── 阅读模式 ── */
              <>
                {/* 标题行 */}
                <div className="flex items-start gap-2 mb-4">
                  {post.is_pinned && <span className="shrink-0 px-2 py-0.5 text-xs font-bold bg-amber-400 text-white rounded mt-1">置顶</span>}
                  <h1 className="text-2xl font-bold flex-1 leading-snug">{post.title}</h1>
                  <button onClick={() => setIsEditing(true)} className="shrink-0 text-sm text-primary hover:underline mt-1">✏️ 编辑</button>
                </div>

                {/* 正文 */}
                <div className="text-gray-700 whitespace-pre-wrap mb-5 leading-relaxed text-sm">{post.content}</div>

                {/* 底部信息 */}
                <div className="flex items-center justify-between pt-4 border-t flex-wrap gap-3">
                  <div className="flex gap-2 flex-wrap">
                    {(post.tags || []).map((tag) => (
                      <span key={tag} className="px-2.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-1 text-sm transition-colors ${liked ? 'text-red-500 cursor-default' : 'text-gray-400 hover:text-red-500'}`}
                    >
                      {liked ? '❤️' : '🤍'} {likesCount}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </article>

        {/* ━━ 评论区 ━━ */}
        <section className="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-lg flex items-center gap-2">💬 评论 <span className="text-sm font-normal text-gray-400">({comments.length})</span></h2>

          {/* 昵称 */}
          <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="你的昵称" className="w-full max-w-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm" />

          {/* 新评论 */}
          <div className="flex gap-2">
            <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComment()} placeholder="发表评论..." className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <button onClick={addComment} disabled={!newComment.trim() || !authorName.trim()} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm shrink-0">发送</button>
          </div>

          {/* 评论列表 */}
          {topLevel.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">暂无评论，来抢沙发吧 🛋️</p>
          ) : (
            <div className="space-y-4 divide-y">
              {topLevel.map((comment) => (
                <div key={comment.id} className="space-y-3 pt-4 first:pt-0">
                  {/* 一级评论 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-primary">{comment.author}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                        <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-xs text-primary hover:underline">回复</button>
                        <button onClick={() => deleteComment(comment.id)} className="text-xs text-red-400 hover:underline">删除</button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
                  </div>

                  {/* 回复输入框 */}
                  {replyTo === comment.id && (
                    <div className="ml-6 flex gap-2">
                      <input value={replyContent} onChange={(e) => setReplyContent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addReply(comment.id)} placeholder={`回复 ${comment.author}...`} className="flex-1 px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm" autoFocus />
                      <button onClick={() => addReply(comment.id)} disabled={!replyContent.trim()} className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-xs shrink-0">回复</button>
                    </div>
                  )}

                  {/* 嵌套回复 */}
                  {getReplies(comment.id).map((reply) => (
                    <div key={reply.id} className="ml-6 bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-primary">{reply.author}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{formatDate(reply.created_at)}</span>
                          <button onClick={() => deleteComment(reply.id)} className="text-xs text-red-400 hover:underline">删除</button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{reply.content}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ━━━ 图片放大浮层 ━━━ */}
      {imageExpanded && post.image_url && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setImageExpanded(false)}
        >
          <img
            src={post.image_url}
            alt={post.title}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setImageExpanded(false)}
            className="mt-4 px-6 py-2 bg-white text-gray-700 rounded-full shadow-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            onClickCapture={(e) => e.stopPropagation()}
          >
            收起图片 ✕
          </button>
        </div>
      )}
    </div>
  )
}
