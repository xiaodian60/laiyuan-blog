"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { ChevronLeft, Heart, MessageSquare, Edit, Trash2, X, Reply } from 'lucide-react';
import Link from 'next/link';

const supabase = createClient(
  'https://scosnulrtmlzbcbacoyt.supabase.co',
  'sb_publishable_Zx_ftzPLaaufc9nENbMopw_PDIBIa8h'
);

export default function PostDetailClient() {
  const { id } = useParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [likes, setLikes] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editImage, setEditImage] = useState("");
  const [imgExpanded, setImgExpanded] = useState(false);
  
  const [replyTo, setReplyTo] = useState<any>(null);
  const [replyContent, setReplyContent] = useState("");

  useEffect(() => {
    if (id) fetchPostData();
  }, [id]);

  const fetchPostData = async () => {
    const { data: postData } = await supabase.from('posts').select('*').eq('id', id).single();
    const { data: commentData } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: true });
    const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', id);
    setPost(postData);
    setComments((commentData ?? []) as any[]);
    setLikes(count || 0);
    if (postData) {
      setEditTitle(postData.title);
      setEditContent(postData.content);
      setEditImage(postData.image_url || "");
    }
    setLoading(false);
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    await supabase.from('comments').insert([{ post_id: id, content: newComment }]);
    setNewComment("");
    await fetchPostData();
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !replyTo) return;
    await supabase.from('comments').insert([
      { post_id: id, content: replyContent, parent_id: replyTo }
    ]);
    setReplyContent("");
    setReplyTo(null);
    await fetchPostData();
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("确定要删除这条评论吗？")) return;
    await supabase.from('comments').delete().eq('id', commentId);
    await fetchPostData();
  };

  const handleLike = async () => {
    if (userLiked) {
      await supabase.from('likes').delete().eq('post_id', id);
      setLikes(likes - 1);
      setUserLiked(false);
    } else {
      await supabase.from('likes').insert([{ post_id: id }]);
      setLikes(likes + 1);
      setUserLiked(true);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("确定要永久删除这篇文章吗？")) return;
    await supabase.from('posts').delete().eq('id', id);
    router.push('/');
  };

  const handleUpdatePost = async () => {
    await supabase.from('posts').update({ title: editTitle, content: editContent, image_url: editImage }).eq('id', id);
    setIsEditing(false);
    fetchPostData();
  };

  const buildCommentTree = (flatComments: any[]) => {
    const map: any = {};
    const roots: any[] = [];
    flatComments.forEach(comment => {
      map[comment.id] = { ...comment, children: [] };
    });
    flatComments.forEach(comment => {
      if (comment.parent_id) {
        if (map[comment.parent_id]) {
          map[comment.parent_id].children.push(map[comment.id]);
        }
      } else {
        roots.push(map[comment.id]);
      }
    });
    return roots;
  };

  const CommentItem = ({ comment, level = 0 }: { comment: any; level?: number }) => {
    return (
      <div className={`flex flex-col gap-2 ${level > 0 ? 'ml-6 border-l border-white/10 pl-4' : ''}`}>
        <div className="bg-white/[0.05] p-4 rounded-2xl flex items-start gap-3 border border-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <p className="text-gray-300 break-words">{comment.content}</p>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setReplyTo(comment.id)}
                  className="text-gray-500 hover:text-blue-400 transition text-xs flex items-center gap-1"
                >
                  <Reply size={14} /> 回复
                </button>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-gray-500 hover:text-red-400 transition text-xs"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">
              {new Date(comment.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        {replyTo === comment.id && (
          <div className="ml-6 flex gap-2 mb-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="写下你的回复..."
              className="flex-1 bg-white/10 p-2 rounded-lg text-white border border-white/10 focus:outline-none focus:border-white/30 h-16 resize-none text-sm"
            />
            <button
              onClick={handleReply}
              className="px-3 py-1 bg-blue-500/80 hover:bg-blue-500 rounded-lg text-white transition h-fit text-sm"
            >
              发送
            </button>
            <button
              onClick={() => setReplyTo(null)}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white transition h-fit text-sm"
            >
              取消
            </button>
          </div>
        )}

        {comment.children && comment.children.length > 0 && (
          <div className="flex flex-col gap-2">
            {comment.children.map((child: any) => (
              <CommentItem key={child.id} comment={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const commentTree = buildCommentTree(comments);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">加载中...</div>;
  if (!post) return <div className="min-h-screen bg-black text-white flex items-center justify-center">文章不存在</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12">
      <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition"><ChevronLeft size={20} className="mr-1" /> 返回首页</Link>
      <div className="max-w-3xl mx-auto relative">
        {isEditing ? (
          <div className="space-y-4">
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-white/10 p-3 rounded-lg text-white border border-white/10 focus:outline-none focus:border-white/30 text-3xl font-bold" />
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full bg-white/10 p-3 rounded-lg text-white border border-white/10 focus:outline-none focus:border-white/30 h-60 resize-none" />
            <input type="text" value={editImage} onChange={(e) => setEditImage(e.target.value)} placeholder="图片链接" className="w-full bg-white/10 p-3 rounded-lg text-white border border-white/10 focus:outline-none focus:border-white/30" />
            <div className="flex gap-3"><button onClick={handleUpdatePost} className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition">保存</button><button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition">取消</button></div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start"><h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
              <div className="flex gap-2"><button onClick={() => setIsEditing(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"><Edit size={18} /></button>
              <button onClick={handleDeletePost} className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition text-red-400"><Trash2 size={18} /></button></div>
            </div>
            <div className="flex gap-4 text-sm text-gray-400 mb-6"><span>{new Date(post.created_at).toLocaleDateString()}</span><span className="flex items-center gap-1"><Heart size={14} /> {likes}</span></div>

            {post.image_url && (
              <>
                {imgExpanded && <div className="fixed inset-0 bg-black/70 z-40 transition-opacity duration-300" onClick={() => setImgExpanded(false)} />}
                <div className={`relative mb-6 transition-all duration-300 ${imgExpanded ? 'fixed inset-0 z-50 flex items-center justify-center' : ''}`}>
                  <img src={post.image_url} alt="封面" className={`w-full rounded-xl transition-all duration-300 cursor-pointer ${imgExpanded ? 'h-auto max-h-[85vh] object-contain' : 'h-80 object-cover'}`} onClick={() => setImgExpanded(!imgExpanded)} />
                  <button onClick={() => setImgExpanded(!imgExpanded)} className="absolute bottom-2 right-2 bg-black/60 text-white px-3 py-1 rounded-lg text-sm hover:bg-black/80 transition">{imgExpanded ? '收起图片' : '展开图片'}</button>
                </div>
              </>
            )}

            <div className="text-lg leading-relaxed text-gray-300 mb-8 whitespace-pre-wrap break-words">
              {post.content}
            </div>

            <div className="flex items-center gap-4 mb-8">
              <button onClick={handleLike} className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${userLiked ? 'bg-red-500/20 text-red-500' : 'bg-white/10 hover:bg-white/20'}`}><Heart size={20} fill={userLiked ? "currentColor" : "none"} /> {likes} 赞</button>
            </div>
          </>
        )}
        
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><MessageSquare size={20} /> 评论 ({comments.length})</h3>
          
          <div className="flex gap-2 mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="写下你的评论..."
              className="flex-1 bg-white/10 p-3 rounded-lg text-white border border-white/10 focus:outline-none focus:border-white/30 h-20 resize-none"
            />
            <button
              onClick={handleComment}
              className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-lg text-white transition h-fit"
            >
              发送
            </button>
          </div>

          <div className="space-y-4">
            {commentTree.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">还没有评论，写下第一条吧 ✍️</p>
            ) : (
              commentTree.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}