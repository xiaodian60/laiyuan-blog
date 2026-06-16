'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

interface CompanyFile {
  id: string
  name: string
  url: string
  size: number
  created_at: string
}

interface NeteaseSong {
  id: number
  name: string
  artists: { name: string }[]
}

/* ═══════════════════════════════════════════════════════
   首页
   ═══════════════════════════════════════════════════════ */
export default function HomePage() {
  /* ── 状态 ──────────────────────────────────────── */
  const [posts, setPosts] = useState<Post[]>([])
  const [files, setFiles] = useState<CompanyFile[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // 发布弹窗
  const [showPublish, setShowPublish] = useState(false)
  const [pubTitle, setPubTitle] = useState('')
  const [pubContent, setPubContent] = useState('')
  const [pubTags, setPubTags] = useState('')
  const [pubImage, setPubImage] = useState<File | null>(null)
  const [pubImagePreview, setPubImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // 音乐搜索
  const [musicQuery, setMusicQuery] = useState('')
  const [musicResults, setMusicResults] = useState<NeteaseSong[]>([])
  const [musicSearching, setMusicSearching] = useState(false)
  const [selectedMusicId, setSelectedMusicId] = useState<number | null>(null)
  const [selectedMusicName, setSelectedMusicName] = useState('')

  // 文件密码
  const [pwdInput, setPwdInput] = useState('')
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const publishImageRef = useRef<HTMLInputElement>(null)

  /* ── 数据获取 ──────────────────────────────────── */
  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setPosts(data || [])
  }, [])

  const fetchFiles = useCallback(async () => {
    const { data } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false })
    setFiles(data || [])
  }, [])

  useEffect(() => {
    Promise.all([fetchPosts(), fetchFiles()]).finally(() => setLoading(false))
  }, [fetchPosts, fetchFiles])

  /* ── 派生 ──────────────────────────────────────── */
  const allTags = [...new Set(posts.flatMap((p) => p.tags || []))]
  const filteredPosts = selectedTag
    ? posts.filter((p) => p.tags?.includes(selectedTag))
    : posts

  /* ── 操作：置顶 / 删除 / 点赞 ─────────────────── */
  const togglePin = async (post: Post) => {
    await supabase.from('posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id)
    fetchPosts()
  }

  const deletePost = async (id: string) => {
    if (!confirm('确定删除此文章？')) return
    await supabase.from('posts').delete().eq('id', id)
    fetchPosts()
  }

  const likePost = async (post: Post) => {
    if (localStorage.getItem(`liked_${post.id}`)) return
    await supabase.from('posts').update({ likes_count: post.likes_count + 1 }).eq('id', post.id)
    localStorage.setItem(`liked_${post.id}`, '1')
    fetchPosts()
  }

  const isLiked = (id: string) => !!localStorage.getItem(`liked_${id}`)

  /* ── 发布 ──────────────────────────────────────── */
  const handlePublish = async () => {
    if (!pubTitle.trim() || !pubContent.trim()) return
    setUploading(true)
    let imageUrl: string | null = null
    if (pubImage) {
      const ext = pubImage.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('post-images').upload(path, pubImage)
      if (!error) {
        const { data } = supabase.storage.from('post-images').getPublicUrl(path)
        imageUrl = data.publicUrl
      }
    }
    await supabase.from('posts').insert({
      title: pubTitle,
      content: pubContent,
      tags: pubTags.split(',').map((t) => t.trim()).filter(Boolean),
      image_url: imageUrl,
      is_pinned: false,
      likes_count: 0,
    })
    setShowPublish(false)
    setPubTitle('')
    setPubContent('')
    setPubTags('')
    setPubImage(null)
    setPubImagePreview(null)
    setUploading(false)
    fetchPosts()
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPubImage(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPubImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  /* ── 音乐搜索（网易云） ─────────────────────── */
  const searchMusic = async () => {
    if (!musicQuery.trim()) return
    setMusicSearching(true)
    try {
      const res = await fetch(
        `https://binaryify-netease-cloud-music-api.vercel.app/search?keywords=${encodeURIComponent(musicQuery)}`
      )
      const data = await res.json()
      const songs: NeteaseSong[] = (data.result?.songs || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.artists || s.ar || [],
      }))
      setMusicResults(songs)
    } catch {
      setMusicResults([])
    }
    setMusicSearching(false)
  }

  const selectSong = (song: NeteaseSong) => {
    setSelectedMusicId(song.id)
    setSelectedMusicName(`${song.name} - ${song.artists.map((a) => a.name).join('/')}`)
  }

  /* ── 文件操作（密码保护） ─────────────────────── */
  const requirePwd = (action: () => void) => {
    setPendingAction(() => action)
    setShowPwdModal(true)
  }

  const confirmPwd = () => {
    if (pwdInput === '114514' && pendingAction) {
      pendingAction()
      setShowPwdModal(false)
      setPwdInput('')
      setPendingAction(null)
    } else {
      alert('密码错误！')
      setPwdInput('')
    }
  }

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const theFile = file
    requirePwd(async () => {
      const path = `${Date.now()}_${theFile.name}`
      await supabase.storage.from('company-files').upload(path, theFile)
      const { data } = supabase.storage.from('company-files').getPublicUrl(path)
      await supabase.from('files').insert({ name: theFile.name, url: data.publicUrl, size: theFile.size })
      fetchFiles()
    })
    e.target.value = ''
  }

  const deleteFile = (file: CompanyFile) => {
    requirePwd(async () => {
      await supabase.from('files').delete().eq('id', file.id)
      fetchFiles()
    })
  }

  /* ── 折叠切换 ─────────────────────────────────── */
  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  /* ── 工具函数 ──────────────────────────────────── */
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  /* ── 加载动画 ──────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════
     渲染
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ━━━ 顶部栏 ━━━ */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="text-2xl">📝</span> My Blog
          </h1>
          <span className="text-xs text-muted">Next.js + Supabase</span>
        </div>
      </header>

      {/* ━━━ 三栏布局 ━━━ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ═══ 左侧栏：标签 + 网易云电台 ═══ */}
          <aside className="lg:col-span-1 space-y-5 order-2 lg:order-1">
            {/* 标签分类 */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">🏷️ 标签分类</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTag === null ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  全部
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTag === tag ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 莱源电台（网易云音乐搜索） */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">📻 莱源电台</h2>
              <div className="flex gap-2 mb-3">
                <input
                  value={musicQuery}
                  onChange={(e) => setMusicQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchMusic()}
                  placeholder="搜索歌曲或歌手..."
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={searchMusic}
                  disabled={musicSearching}
                  className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 shrink-0"
                >
                  {musicSearching ? '...' : '搜索'}
                </button>
              </div>

              {/* 搜索结果列表 — 双击播放 */}
              {musicResults.length > 0 && (
                <div className="space-y-1 max-h-52 overflow-y-auto mb-3">
                  {musicResults.map((song) => (
                    <div
                      key={song.id}
                      onDoubleClick={() => selectSong(song)}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors select-none ${
                        selectedMusicId === song.id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-gray-50'
                      }`}
                      title="双击播放"
                    >
                      <span className="text-sm shrink-0">🎵</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{song.name}</p>
                        <p className="text-xs text-muted truncate">{song.artists.map((a) => a.name).join('/')}</p>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted text-center pt-1">💡 双击歌名播放</p>
                </div>
              )}

              {/* 网易云外链播放器 */}
              {selectedMusicId && (
                <div className="mt-3">
                  <p className="text-xs text-muted mb-2 truncate">🎶 {selectedMusicName}</p>
                  <iframe
                    key={selectedMusicId}
                    src={`//music.163.com/outchain/player?type=2&id=${selectedMusicId}&auto=1&height=66`}
                    className="w-full rounded-lg border-0"
                    style={{ height: 86 }}
                    allow="autoplay"
                  />
                </div>
              )}
            </div>
          </aside>

          {/* ═══ 中间栏：卡片流 ═══ */}
          <section className="lg:col-span-3 space-y-4 order-1 lg:order-2">
            {filteredPosts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center text-muted">
                <p className="text-4xl mb-3">📭</p>
                <p>暂无文章，点击右下角 + 发布</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <article key={post.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* 头图 */}
                  {post.image_url && (
                    <a href={`/posts/${post.id}`}>
                      <img src={post.image_url} alt={post.title} className="w-full h-48 object-cover hover:opacity-95 transition-opacity" />
                    </a>
                  )}

                  <div className="p-5">
                    {/* 标题 */}
                    <h2 className="text-lg font-bold mb-2 leading-snug">
                      <a href={`/posts/${post.id}`} className="hover:text-primary transition-colors">{post.title}</a>
                    </h2>

                    {/* 置顶按钮 + 标签（同行） */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <button
                        onClick={() => togglePin(post)}
                        className={`shrink-0 px-2 py-0.5 text-xs font-bold rounded transition-colors ${
                          post.is_pinned ? 'bg-accent text-white' : 'bg-gray-100 text-muted hover:bg-gray-200'
                        }`}
                        title={post.is_pinned ? '取消置顶' : '置顶'}
                      >
                        {post.is_pinned ? '📌 置顶' : '📍 置顶'}
                      </button>
                      {(post.tags || []).map((tag) => (
                        <span
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className="cursor-pointer px-2 py-0.5 text-xs bg-primary-light/30 text-primary-dark rounded-full hover:bg-primary-light/50 transition-colors"
                        >
                          {tag}
                        </span>
                      ))}
                      {/* 日期靠右 */}
                      <span className="ml-auto text-xs text-muted shrink-0">{formatDate(post.created_at)}</span>
                    </div>

                    {/* 内容（折叠/展开） */}
                    <div className={`text-sm text-gray-600 leading-relaxed mb-3 ${collapsed[post.id] ? '' : 'line-clamp-3'}`}>
                      {post.content}
                    </div>
                    {post.content.length > 120 && (
                      <button
                        onClick={() => toggleCollapse(post.id)}
                        className="text-xs text-primary hover:underline mb-3 inline-block"
                      >
                        {collapsed[post.id] ? '收起 ▲' : '展开阅读 ▼'}
                      </button>
                    )}

                    {/* 底部操作栏 */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => likePost(post)}
                          className={`flex items-center gap-1 text-sm transition-colors ${isLiked(post.id) ? 'text-danger' : 'text-muted hover:text-danger'}`}
                        >
                          {isLiked(post.id) ? '❤️' : '🤍'} {post.likes_count}
                        </button>
                        <a href={`/posts/${post.id}`} className="text-sm text-primary hover:underline">💬 评论</a>
                      </div>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="text-xs text-muted hover:text-danger transition-colors"
                      >
                        🗑️ 删除
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* ═══ 右侧栏：公司文件 ═══ */}
          <aside className="lg:col-span-1 space-y-5 order-3">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">📁 公司文件</h2>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  上传
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={uploadFile} />
              </div>

              {files.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">暂无文件</p>
              ) : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group transition-colors">
                      <span className="text-base shrink-0">📄</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted">{formatSize(file.size)}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => window.open(file.url, '_blank')} className="text-xs text-primary hover:underline" title="下载">⬇️</button>
                        <button onClick={() => deleteFile(file)} className="text-xs text-danger hover:underline" title="删除">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* ━━━ 悬浮发布按钮 ━━━ */}
      <button
        onClick={() => setShowPublish(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary-dark transition-all hover:scale-105 flex items-center justify-center text-3xl z-40 leading-none"
      >
        +
      </button>

      {/* ━━━ 发布弹窗 ━━━ */}
      {showPublish && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowPublish(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">发布动态</h3>
              <button onClick={() => setShowPublish(false)} className="text-muted hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <input value={pubTitle} onChange={(e) => setPubTitle(e.target.value)} placeholder="标题" className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <textarea value={pubContent} onChange={(e) => setPubContent(e.target.value)} placeholder="内容..." rows={6} className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm leading-relaxed" />
            <input value={pubTags} onChange={(e) => setPubTags(e.target.value)} placeholder="标签（逗号分隔，如：技术,生活）" className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => publishImageRef.current?.click()}>
              <input ref={publishImageRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              {pubImagePreview ? <img src={pubImagePreview} alt="preview" className="max-h-40 mx-auto rounded" /> : <p className="text-sm text-muted">📷 点击上传图片</p>}
            </div>
            <button onClick={handlePublish} disabled={uploading || !pubTitle.trim() || !pubContent.trim()} className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm font-medium">
              {uploading ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      )}

      {/* ━━━ 密码验证弹窗 ━━━ */}
      {showPwdModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowPwdModal(false); setPwdInput('') } }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">🔐 密码验证</h3>
            <p className="text-sm text-muted">此操作需要密码验证</p>
            <input type="password" value={pwdInput} onChange={(e) => setPwdInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmPwd()} placeholder="请输入操作密码" className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => { setShowPwdModal(false); setPwdInput('') }} className="flex-1 py-2.5 border rounded-lg hover:bg-gray-50 transition-colors text-sm">取消</button>
              <button onClick={confirmPwd} className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm">确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
