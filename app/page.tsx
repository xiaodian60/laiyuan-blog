"use client";

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { ChevronDown, Plus, Search, Upload, Download } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  'https://scosnulrtmlzbcbacoyt.supabase.co',
  'sb_publishable_Zx_ftzPLaaufc9nENbMopw_PDIBIa8h'
);

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  image_url: string;
  created_at: string;
  is_pinned?: boolean;
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTag, setActiveTag] = useState("全部");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", tags: "", image: "" });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const allTags = ["全部", ...new Set(posts.flatMap(post => post.tags || []))];
  const filteredPosts = activeTag === "全部" ? posts : posts.filter(post => (post.tags || []).includes(activeTag));

  const uploadImage = async (file: File) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `posts-images/${fileName}`;
    const { error } = await supabase.storage.from('posts-images').upload(filePath, file);
    if (error) return null;
    const { data } = supabase.storage.from('posts-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handlePublish = async () => {
    if (!newPost.title || !newPost.content) return alert("标题和内容不能为空！");
    setUploading(true);
    let imageUrl = newPost.image;
    if (fileInputRef.current?.files?.[0]) {
      const uploadedUrl = await uploadImage(fileInputRef.current.files[0]);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }
    const { error } = await supabase.from('posts').insert([{
      title: newPost.title,
      content: newPost.content,
      tags: newPost.tags.split(',').map(t => t.trim()),
      image_url: imageUrl || "https://picsum.photos/seed/"+Date.now()+"/600/400",
    }]);
    setUploading(false);
    if (!error) {
      await fetchPosts();
      setNewPost({ title: "", content: "", tags: "", image: "" });
      setShowPublishModal(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条动态吗？')) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) await fetchPosts();
  };

  const handleTogglePin = async (id: string, currentPinnedStatus?: boolean) => {
    const { error } = await supabase
      .from('posts')
      .update({ is_pinned: !currentPinnedStatus })
      .eq('id', id);
    if (!error) await fetchPosts();
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <section className="relative h-screen w-full flex flex-col justify-center items-center overflow-hidden bg-black">
        <div className="absolute inset-0 z-0 bg-black overflow-hidden">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[80%] bg-gradient-to-b from-purple-500/20 to-transparent blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] border border-white/10 rounded-[50%] animate-[spin_40s_linear_infinite] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] border border-white/20 rounded-[50%] animate-[spin_25s_linear_infinite] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] border border-white/20 rounded-[50%] animate-[spin_35s_linear_infinite_reverse] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white/60 rounded-full blur-[2px]" />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-wider drop-shadow-2xl">莱源公司</h1>
          <p className="mt-6 text-white/90 text-lg max-w-xl mx-auto leading-relaxed">团结协调，主体安全</p>
        </div>
        <div className="absolute bottom-10 z-10 animate-bounce cursor-pointer" onClick={() => {
          document.getElementById('content-section')?.scrollIntoView({ behavior: 'smooth' });
        }}>
          <ChevronDown size={40} className="text-white/80" />
        </div>
      </section>

      <section id="content-section" className="min-h-screen bg-[#0a0a0a] text-white relative pt-20">
        <div className="max-w-[1400px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="col-span-12 lg:col-span-3 sticky top-20 h-screen overflow-y-auto">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <h3 className="font-bold mb-4 border-b border-white/10 pb-2">🏷️ 事件分类</h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                    className={`px-3 py-1 text-xs rounded-lg transition ${
                      activeTag === tag 
                        ? 'bg-white text-black font-bold' 
                        : 'bg-white/10 hover:bg-white/20 text-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <MusicSearch />
          </aside>

          <main className="col-span-12 lg:col-span-6 flex flex-col gap-6">
            <div className="sticky top-20 z-10 bg-[#0a0a0a] pb-2">
              <h2 className="text-3xl font-black tracking-wider">· 莱源动态</h2>
            </div>
            <div className="flex flex-col gap-6">
              {filteredPosts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onDelete={() => handleDelete(post.id)}
                  onTogglePin={() => handleTogglePin(post.id, post.is_pinned)}
                />
              ))}
            </div>
          </main>

          <aside className="col-span-12 lg:col-span-3 sticky top-20 h-screen overflow-y-auto">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <h3 className="font-bold text-sm mb-4 border-b border-white/10 pb-2">📊 公司档案</h3>
              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex justify-between"><span>动态总数</span><span>{posts.length}</span></div>
              </div>
            </div>
            <CompanyFiles />
          </aside>
        </div>
      </section>

      <button onClick={() => setShowPublishModal(true)} className="fixed bottom-10 right-10 z-50 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition duration-300">
        <Plus size={24} strokeWidth={3} />
      </button>

      {showPublishModal && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] max-w-md w-full rounded-2xl p-6 border border-white/10 shadow-2xl">
             <h3 className="text-xl font-bold mb-4 text-white">📝 发布动态</h3>
             <input type="text" placeholder="输入标题..." className="w-full bg-white/10 p-3 rounded-lg mb-3 text-white border border-white/10" value={newPost.title} onChange={(e) => setNewPost({...newPost, title: e.target.value})} />
             <textarea placeholder="说说你的想法..." className="w-full bg-white/10 p-3 rounded-lg mb-3 text-white border border-white/10 h-32 resize-none" value={newPost.content} onChange={(e) => setNewPost({...newPost, content: e.target.value})} />
             <input type="text" placeholder="标签（用逗号隔开）" className="w-full bg-white/10 p-3 rounded-lg mb-3 text-white border border-white/10" value={newPost.tags} onChange={(e) => setNewPost({...newPost, tags: e.target.value})} />
             <input type="file" accept="image/*" ref={fileInputRef} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/20 mb-3" />
             <input type="text" placeholder="或直接粘贴图片链接" className="w-full bg-white/10 p-3 rounded-lg mb-4 text-white border border-white/10" value={newPost.image} onChange={(e) => setNewPost({...newPost, image: e.target.value})} />
             <div className="flex gap-3">
               <button onClick={() => setShowPublishModal(false)} className="flex-1 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition">取消</button>
               <button onClick={handlePublish} disabled={uploading} className="flex-1 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:opacity-90 transition disabled:opacity-50">{uploading ? '发布中...' : '发布'}</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, onDelete, onTogglePin }: { post: Post; onDelete: () => void; onTogglePin: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 100;
  const isLong = post.content.length > MAX_LENGTH;
  const displayContent = isLong && !isExpanded ? post.content.substring(0, MAX_LENGTH) + "..." : post.content;
  return (
    <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl hover:-translate-y-1 transition duration-300 shadow-lg group overflow-hidden">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-b from-purple-500/20 to-transparent blur-[50px]" />
      </div>
      <div className="absolute top-3 left-3 flex gap-2 z-20">
        <button onClick={() => onTogglePin()} className={`text-xs px-2 py-1 rounded-lg transition ${post.is_pinned ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}>{post.is_pinned ? '取消置顶' : '置顶'}</button>
      </div>
      <button onClick={() => onDelete()} className="absolute top-3 right-3 text-white/50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 z-10">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
      </button>
      <div className="flex flex-wrap gap-2 mb-2 relative z-10">
        {post.tags.map(tag => <span key={tag} className="text-xs px-2 py-1 bg-white/10 rounded-full text-gray-300">{tag}</span>)}
        <span className="text-xs text-gray-500 ml-auto">{new Date(post.created_at).toISOString().slice(0, 10)}</span>
      </div>
      <Link href={`/posts/${post.id}`}><h3 className="text-2xl font-bold mb-2 hover:text-purple-400 transition cursor-pointer relative z-10">{post.title}</h3></Link>
      <p className="text-gray-300 leading-relaxed mb-4 break-all relative z-10">{displayContent}{isLong && <button onClick={() => setIsExpanded(!isExpanded)} className="ml-2 text-xs text-purple-400 hover:underline">{isExpanded ? '收起' : '展开阅读'}</button>}</p>
      <div className="relative w-full h-64 rounded-lg overflow-hidden border border-white/5 z-10">
        <img src={post.image_url} alt="配图" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

function MusicSearch() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [currentSongId, setCurrentSongId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`https://binaryify-netease-cloud-music-api.vercel.app/search?keywords=${keyword}`);
      const data = await res.json();
      if (data.result && data.result.songs) {
        setResults(data.result.songs.slice(0, 6));
      }
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索歌曲..."
          className="flex-1 bg-black/30 text-sm px-3 py-1.5 rounded-lg border border-white/10 focus:border-purple-400 focus:outline-none text-white placeholder-gray-500"
        />
        <button 
          type="button" 
          onClick={handleSearch} 
          className="p-1.5 bg-purple-500/20 hover:bg-purple-500/40 rounded-lg transition"
        >
          <Search size={18} className="text-white" />
        </button>
      </div>
      
      {loading && <div className="text-xs text-gray-400">搜索中...</div>}
      
      {results.length > 0 && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
          {results.map((song) => (
            <div
              key={song.id}
              onDoubleClick={() => setCurrentSongId(song.id)}  // ✨ 修改这里：双击触发播放
              className={`text-xs px-2 py-1 rounded cursor-pointer hover:bg-white/10 transition ${
                currentSongId === song.id ? 'bg-white/10 text-purple-400' : 'text-gray-300'
              }`}
            >
              {song.name} - {song.artists?.map(a => a.name).join('、')}
            </div>
          ))}
        </div>
      )}

      {currentSongId && (
        <div className="mt-3">
          <iframe
            style={{ borderRadius: '12px' }}
            src={`//music.163.com/outchain/player?type=2&id=${currentSongId}&auto=1&height=66`}
            width="100%"
            height="66"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </div>
  );
}

function CompanyFiles() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from('company-files').list('', { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
    if (error) console.error('加载文件失败:', error);
    else setFiles(data || []);
    setLoading(false);
  };

  useEffect(() => { loadFiles(); }, []);

  const sanitizeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._]/g, '_');
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const password = prompt(`请输入上传密码：`);
    if (password === null) return;
    if (password !== '114514') { alert('❌ 密码错误，上传已取消！'); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const originalName = file.name;
    const safeName = sanitizeFileName(originalName);
    const filePath = `${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('company-files').upload(filePath, file);
    if (error) alert('上传失败: ' + error.message);
    else await loadFiles();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (fileName: string) => {
    const password = prompt(`请输入删除密码以删除文件 "${fileName}"：`);
    if (password === null) return;
    if (password !== '114514') { alert('❌ 密码错误，删除已取消！'); return; }
    if (!window.confirm(`确定要删除文件 "${fileName}" 吗？`)) return;
    const { error } = await supabase.storage.from('company-files').remove([fileName]);
    if (error) alert('删除失败: ' + error.message);
    else await loadFiles();
  };

  const getFileUrl = (fileName: string) => {
    const { data } = supabase.storage.from('company-files').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm">📁 公司文件</h3>
        <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition flex items-center gap-1"><Upload size={14} /> 上传</button>
        <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
      </div>
      {uploading && <div className="text-xs text-gray-400">上传中...</div>}
      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
        {loading ? <div className="text-xs text-gray-400">加载中...</div> : files.length === 0 ? <div className="text-xs text-gray-500 text-center py-4">暂无文件</div> : files.map((file) => (
          <div key={file.id} className="flex items-center justify-between text-xs px-2 py-1.5 bg-white/5 rounded hover:bg-white/10 transition group">
            <span className="truncate max-w-[120px] text-gray-300">{file.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-[10px]">{formatSize(file.metadata?.size || 0)}</span>
              <a href={getFileUrl(file.name)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition"><Download size={14} /></a>
              <button onClick={() => handleDelete(file.name)} className="text-red-400 hover:text-red-300 transition"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}