'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/* ═══════════════════════════════════════════════════════
   Supabase 客户端（硬编码）
   ═══════════════════════════════════════════════════════ */
const SUPABASE_URL = 'https://scosnulrtmlzbcbacoyt.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Zx_ftzPLaaufc9nENbMopw_PDIBIa8h'

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
  file_path: string
  file_size: number
  file_type: string
  created_at: string
}

interface NeteaseSong {
  id: number
  name: string
  artists: { name: string }[]
}

/* ── 直接用 REST API 上传文件到 Storage（绕过 SDK 可能的问题）── */
async function uploadToStorage(bucket: string, path: string, file: File | Blob): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: file,
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[Storage] 上传失败 (${res.status}):`, errText)
      return null
    }

    const data = await res.json()
    console.log('[Storage] 上传成功, key:', data.Key)
    return data.Key
  } catch (err) {
    console.error('[Storage] 上传异常:', err)
    return null
  }
}

/* ── 图片上传 ── */
async function uploadImage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'png'
  const path = `${Date.now()}.${ext}`
  const result = await uploadToStorage('post-images', path, file)
  if (!result) return null
  return `${SUPABASE_URL}/storage/v1/object/public/post-images/${path}`
}

/* ═══════════════════════════════════════════════════════
   公司文件组件（接收 supabase 参数）
   ═══════════════════════════════════════════════════════ */
function CompanyFiles() {
  const [files, setFiles] = useState<CompanyFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [pwdInput, setPwdInput] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = useCallback(async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/files?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
    const data = await res.json()
    setFiles(data || [])
  }, [])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  /* ── 上传文件：先选文件，再弹密码框 ── */
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setShowPwdModal(true)
    e.target.value = ''
  }

  /* ── 密码确认后执行操作 ── */
  const confirmPwd = async () => {
    if (pwdInput !== '114514') {
      alert('密码错误！')
      setPwdInput('')
      return
    }

    setShowPwdModal(false)
    setPwdInput('')

    // 上传文件（直接 REST API）
    if (pendingFile) {
      const theFile = pendingFile
      setPendingFile(null)
      setUploading(true)
      try {
        const path = `${Date.now()}_${theFile.name}`
        console.log('[CompanyFiles] 开始上传:', theFile.name, '大小:', theFile.size, '类型:', theFile.type)

        const uploadResult = await uploadToStorage('company-files', path, theFile)

        if (!uploadResult) {
          alert('文件上传到存储失败，请检查网络连接或联系管理员')
          setUploading(false)
          return
        }

        console.log('[CompanyFiles] 存储上传成功, path:', path)

        // 写入数据库记录（也用 REST API）
        const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/files`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            name: theFile.name,
            file_path: path,
            file_size: theFile.size,
            file_type: theFile.type || 'application/octet-stream',
          }),
        })

        if (!dbRes.ok) {
          const errText = await dbRes.text()
          console.error('[CompanyFiles] 记录保存失败:', errText)
          alert('文件已上传但记录保存失败：' + errText)
        } else {
          console.log('[CompanyFiles] 记录保存成功')
        }

        fetchFiles()
      } catch (err) {
        console.error('[CompanyFiles] 上传异常:', err)
        alert('文件上传失败，请检查网络连接')
      }
      setUploading(false)
      return
    }

    // 删除文件（直接 REST API）
    if (pendingDeleteId) {
      const fileId = pendingDeleteId
      const file = files.find(f => f.id === fileId)
      setPendingDeleteId(null)
      try {
        if (file?.file_path) {
          await fetch(`${SUPABASE_URL}/storage/v1/object/company-files/${file.file_path}`, {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          })
        }
        await fetch(`${SUPABASE_URL}/rest/v1/files?id=eq.${fileId}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        })
        fetchFiles()
      } catch (err) {
        console.error('[CompanyFiles] 删除失败:', err)
        alert('删除文件失败')
      }
    }
  }

  /* ── 点击删除 ── */
  const onDeleteClick = (file: CompanyFile) => {
    setPendingDeleteId(file.id)
    setShowPwdModal(true)
  }

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">📁 公司文件</h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 min-h-[36px]"
        >
          {uploading ? '上传中...' : '上传'}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} />
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-white/30 text-center py-6">暂无文件</p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 group transition-colors">
              <span className="text-sm shrink-0">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">{file.name}</p>
                <p className="text-xs text-white/30">{formatSize(file.file_size)}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => {
                  const url = `${SUPABASE_URL}/storage/v1/object/public/company-files/${file.file_path}`
                  window.open(url, '_blank')
                }} className="text-xs text-purple-400 hover:underline min-h-[32px] flex items-center">⬇️</button>
                <button onClick={() => onDeleteClick(file)} className="text-xs text-red-400 hover:underline min-h-[32px] flex items-center">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 密码弹窗 */}
      {showPwdModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowPwdModal(false); setPwdInput(''); setPendingFile(null); setPendingDeleteId(null) } }}>
          <div className="bg-[#1a1a2e] rounded-2xl w-full max-w-sm p-6 space-y-4 border border-white/10">
            <h3 className="text-lg font-bold text-white">🔐 密码验证</h3>
            <p className="text-sm text-white/50">{pendingFile ? `上传文件：${pendingFile.name}` : pendingDeleteId ? '删除文件' : '此操作需要密码验证'}</p>
            <input
              type="password"
              value={pwdInput}
              onChange={(e) => setPwdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmPwd()}
              placeholder="请输入操作密码"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowPwdModal(false); setPwdInput(''); setPendingFile(null); setPendingDeleteId(null) }} className="flex-1 py-3 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-sm text-white/70 min-h-[44px]">取消</button>
              <button onClick={confirmPwd} className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm min-h-[44px]">确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   首页
   ═══════════════════════════════════════════════════════ */
export default function HomePage() {
  /* ── 状态 ──────────────────────────────────────── */
  const [posts, setPosts] = useState<Post[]>([])
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

  // 音乐搜索（修复：加 hasSearched + searchError）
  const [musicQuery, setMusicQuery] = useState('')
  const [musicResults, setMusicResults] = useState<NeteaseSong[]>([])
  const [musicSearching, setMusicSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedMusicId, setSelectedMusicId] = useState<number | null>(null)
  const [selectedMusicName, setSelectedMusicName] = useState('')

  const publishImageRef = useRef<HTMLInputElement>(null)

  /* ── 数据获取（REST API）────────────────────────── */
  const fetchPosts = useCallback(async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=*&order=is_pinned.desc,created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
    const data = await res.json()
    setPosts(data || [])
  }, [])

  useEffect(() => {
    fetchPosts().finally(() => setLoading(false))
  }, [fetchPosts])

  /* ── 派生 ──────────────────────────────────────── */
  const allTags = [...new Set(posts.flatMap((p) => p.tags || []))]
  const filteredPosts = selectedTag ? posts.filter((p) => p.tags?.includes(selectedTag)) : posts

  /* ── 操作 ──────────────────────────────────────── */
  const togglePin = async (post: Post) => {
    await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${post.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_pinned: !post.is_pinned }),
    })
    fetchPosts()
  }

  const deletePost = async (id: string) => {
    if (!confirm('确定删除此文章？')) return
    await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
    fetchPosts()
  }

  const likePost = async (post: Post) => {
    if (localStorage.getItem(`liked_${post.id}`)) return
    await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${post.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ likes_count: post.likes_count + 1 }),
    })
    localStorage.setItem(`liked_${post.id}`, '1')
    fetchPosts()
  }

  const isLiked = (id: string) => !!localStorage.getItem(`liked_${id}`)

  /* ── 发布（图片上传失败时 alert 提示）────────── */
  const handlePublish = async () => {
    if (!pubTitle.trim() || !pubContent.trim()) return
    setUploading(true)

    let imageUrl: string | null = null
    if (pubImage) {
      imageUrl = await uploadImage(pubImage)
      if (imageUrl === null) {
        alert('上传图片失败！请先在 Supabase SQL Editor 中执行 supabase-schema.sql 创建存储桶。\n\n详细步骤：\n1. 打开 Supabase Dashboard → SQL Editor\n2. 复制粘贴 supabase-schema.sql 的全部内容\n3. 点击 Run 执行')
        setUploading(false)
        return
      }
    }

    await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: pubTitle,
        content: pubContent,
        tags: pubTags.split(',').map((t) => t.trim()).filter(Boolean),
        image_url: imageUrl,
        is_pinned: false,
        likes_count: 0,
      }),
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

  /* ── 音乐搜索（修复：加载状态、无结果提示、错误 alert）── */
  const searchMusic = async () => {
    if (!musicQuery.trim()) return
    setMusicSearching(true)
    setHasSearched(true)
    setSearchError(null)
    try {
      const res = await fetch(
        `https://binaryify-netease-cloud-music-api.vercel.app/search?keywords=${encodeURIComponent(musicQuery)}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const songs: NeteaseSong[] = (data.result?.songs || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.artists || s.ar || [],
      }))
      setMusicResults(songs)
    } catch (err) {
      console.error('音乐搜索失败:', err)
      setMusicResults([])
      const msg = err instanceof Error ? err.message : '未知错误'
      setSearchError(msg)
      alert('音乐搜索失败：' + msg + '，请检查网络连接后重试')
    }
    setMusicSearching(false)
  }

  const selectSong = (song: NeteaseSong) => {
    setSelectedMusicId(song.id)
    setSelectedMusicName(`${song.name} - ${song.artists.map((a) => a.name).join('/')}`)
  }

  /* ── 折叠切换 ─────────────────────────────────── */
  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  /* ── 工具函数 ──────────────────────────────────── */
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  /* ── 加载动画 ──────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════
     渲染
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-full flex flex-col bg-[#0a0a0a] text-white">

      {/* ═══════════ Hero 区域 ═══════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black">
        {/* 紫色光晕 */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-purple-500/20 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />

        {/* 太阳系轨道 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-[500px] h-[500px] border border-white/5 rounded-full animate-[spin_40s_linear_infinite]" />
          <div className="absolute w-[350px] h-[350px] border border-white/8 rounded-full animate-[spin_25s_linear_infinite]" />
          <div className="absolute w-[200px] h-[200px] border border-white/5 rounded-full animate-[spin_35s_linear_infinite_reverse]" />
          <div className="absolute w-4 h-4 bg-white/60 rounded-full blur-[2px]" />
        </div>

        {/* 标题 */}
        <h1 className="relative z-10 text-5xl md:text-6xl lg:text-8xl font-black tracking-tight text-white">
          莱源公司
        </h1>
        <p className="relative z-10 mt-4 text-white/40 text-lg">创新 · 协作 · 未来</p>

        {/* 向下箭头 */}
        <a href="#content-section" className="absolute bottom-10 z-10 animate-bounce text-white/30">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </a>
      </section>

      {/* ═══════════ 三栏布局 ═══════════ */}
      <section id="content-section" className="min-h-screen bg-[#0a0a0a] text-white relative pt-20">
        <div className="max-w-7xl mx-auto px-4 py-12 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* ═══ 左侧栏（1号区域）：事件分类 + 莱源电台 ═══ */}
            <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-20 lg:h-screen lg:overflow-y-auto">
              {/* 事件分类 */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">🏷️ 事件分类</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedTag(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
                      selectedTag === null ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    全部
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
                        selectedTag === tag ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 莱源电台（修复：搜索按钮显式文字、加载状态、无结果提示、错误 alert） */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">📻 莱源电台</h3>
                <div className="flex gap-2 mb-3">
                  <input
                    value={musicQuery}
                    onChange={(e) => setMusicQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchMusic()}
                    placeholder="搜索歌曲或歌手..."
                    className="flex-1 min-w-0 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-white/30"
                  />
                  <button
                    onClick={searchMusic}
                    disabled={musicSearching}
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 shrink-0 min-h-[40px]"
                  >
                    {musicSearching ? '搜索中...' : '搜索'}
                  </button>
                </div>

                {/* 加载状态 */}
                {musicSearching && (
                  <p className="text-xs text-purple-400 text-center py-3 animate-pulse">正在搜索...</p>
                )}

                {/* 错误提示 */}
                {searchError && !musicSearching && (
                  <p className="text-xs text-red-400 text-center py-2">搜索失败，请检查网络连接后重试。</p>
                )}

                {/* 无结果提示 */}
                {hasSearched && !musicSearching && !searchError && musicResults.length === 0 && (
                  <p className="text-xs text-white/30 text-center py-3">未找到相关歌曲，请换个关键词。</p>
                )}

                {/* 搜索结果 — 双击播放 */}
                {musicResults.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-48 overflow-y-auto custom-scrollbar border-t border-white/10 pt-2">
                    {musicResults.map((song) => (
                      <div
                        key={song.id}
                        onDoubleClick={() => selectSong(song)}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors select-none ${
                          selectedMusicId === song.id ? 'bg-purple-600/20 ring-1 ring-purple-500/30' : 'hover:bg-white/5'
                        }`}
                        title="双击播放"
                      >
                        <span className="text-sm shrink-0">🎵</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/80 truncate">{song.name}</p>
                          <p className="text-xs text-white/30 truncate">{song.artists.map((a) => a.name).join('/')}</p>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-white/20 text-center pt-1">💡 双击歌名播放</p>
                  </div>
                )}

                {/* 网易云外链播放器 */}
                {selectedMusicId && (
                  <div className="mt-3">
                    <p className="text-xs text-white/40 mb-2 truncate">🎶 {selectedMusicName}</p>
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
            </div>

            {/* ═══ 中间栏（2号区域）：莱源动态 + 卡片流 ═══ */}
            <main className="lg:col-span-6">
              <h2 className="text-2xl font-bold text-white sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur-sm py-4 mb-4">
                📰 莱源动态
              </h2>

              <div className="space-y-4">
                {filteredPosts.length === 0 ? (
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="text-white/30">暂无动态，点击右下角 + 发布</p>
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <article
                      key={post.id}
                      className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] hover:bg-gradient-to-b hover:from-purple-500/10 hover:to-transparent"
                    >
                      {/* 头图 */}
                      {post.image_url && (
                        <a href={`/posts/${post.id}`}>
                          <img src={post.image_url} alt={post.title} className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        </a>
                      )}

                      <div className="p-5">
                        {/* 标题 */}
                        <h3 className="text-lg font-bold text-white mb-2 leading-snug">
                          <a href={`/posts/${post.id}`} className="hover:text-purple-400 transition-colors">{post.title}</a>
                        </h3>

                        {/* 置顶按钮 + 标签（同行） */}
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <button
                            onClick={() => togglePin(post)}
                            className={`shrink-0 px-2 py-1 text-xs font-bold rounded transition-colors min-h-[28px] ${
                              post.is_pinned ? 'bg-amber-500 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'
                            }`}
                            title={post.is_pinned ? '取消置顶' : '置顶'}
                          >
                            {post.is_pinned ? '📌 置顶' : '📍 置顶'}
                          </button>
                          {(post.tags || []).map((tag) => (
                            <span
                              key={tag}
                              onClick={() => setSelectedTag(tag)}
                              className="cursor-pointer px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full hover:bg-purple-500/30 transition-colors"
                            >
                              {tag}
                            </span>
                          ))}
                          {/* 日期靠右 */}
                          <span className="ml-auto text-xs text-white/20 shrink-0">{formatDate(post.created_at)}</span>
                        </div>

                        {/* 内容（折叠/展开） */}
                        <div className={`text-sm text-white/60 leading-relaxed mb-3 ${collapsed[post.id] ? '' : 'line-clamp-3'}`}>
                          {post.content}
                        </div>
                        {post.content.length > 100 && (
                          <button
                            onClick={() => toggleCollapse(post.id)}
                            className="text-xs text-purple-400 hover:text-purple-300 mb-3 inline-block transition-colors min-h-[28px]"
                          >
                            {collapsed[post.id] ? '收起 ▲' : '展开阅读 ▼'}
                          </button>
                        )}

                        {/* 底部操作栏 */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => likePost(post)}
                              className={`flex items-center gap-1 text-sm transition-colors min-h-[32px] ${
                                isLiked(post.id) ? 'text-red-400 cursor-default' : 'text-white/30 hover:text-red-400'
                              }`}
                            >
                              {isLiked(post.id) ? '❤️' : '🤍'} {post.likes_count}
                            </button>
                            <a href={`/posts/${post.id}`} className="text-sm text-white/30 hover:text-purple-400 transition-colors min-h-[32px] flex items-center">💬 评论</a>
                          </div>
                          <button
                            onClick={() => deletePost(post.id)}
                            className="text-xs text-white/20 hover:text-red-400 transition-colors min-h-[32px]"
                          >
                            🗑️ 删除
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </main>

            {/* ═══ 右侧栏（3号区域）：公司档案 + 公司文件 ═══ */}
            <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-20 lg:h-screen lg:overflow-y-auto">
              {/* 公司档案 */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">📊 公司档案</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">发布动态</span>
                    <span className="text-lg font-bold text-purple-400">{posts.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">总点赞数</span>
                    <span className="text-lg font-bold text-purple-400">{posts.reduce((s, p) => s + p.likes_count, 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">标签数</span>
                    <span className="text-lg font-bold text-purple-400">{allTags.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">置顶数</span>
                    <span className="text-lg font-bold text-purple-400">{posts.filter((p) => p.is_pinned).length}</span>
                  </div>
                </div>
              </div>

              {/* 公司文件 */}
              <CompanyFiles />
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 悬浮发布按钮 ━━━ */}
      <button
        onClick={() => setShowPublish(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg shadow-purple-500/30 hover:bg-purple-700 transition-all hover:scale-105 flex items-center justify-center text-3xl z-40 leading-none"
      >
        +
      </button>

      {/* ━━━ 发布弹窗 ━━━ */}
      {showPublish && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowPublish(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">发布动态</h3>
              <button onClick={() => setShowPublish(false)} className="text-white/30 hover:text-white/70 text-xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
            </div>
            <input
              value={pubTitle}
              onChange={(e) => setPubTitle(e.target.value)}
              placeholder="标题"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm placeholder-white/30"
            />
            <textarea
              value={pubContent}
              onChange={(e) => setPubContent(e.target.value)}
              placeholder="内容..."
              rows={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-white text-sm leading-relaxed placeholder-white/30"
            />
            <input
              value={pubTags}
              onChange={(e) => setPubTags(e.target.value)}
              placeholder="标签（逗号分隔，如：技术,生活）"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm placeholder-white/30"
            />
            <div
              className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500/50 transition-colors min-h-[80px] flex items-center justify-center"
              onClick={() => publishImageRef.current?.click()}
            >
              <input ref={publishImageRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              {pubImagePreview ? <img src={pubImagePreview} alt="preview" className="max-h-40 mx-auto rounded" /> : <p className="text-sm text-white/30">📷 点击上传图片</p>}
            </div>
            <button
              onClick={handlePublish}
              disabled={uploading || !pubTitle.trim() || !pubContent.trim()}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-medium min-h-[44px]"
            >
              {uploading ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
