"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/app/firebase";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth } from "@/app/firebase"; // Firebaseのauthもインポート

const CommunityPosts = ({ communityId }) => {
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState("");

    const fetchPosts = useCallback(() => {
        const docRef = doc(db, "community_posts", communityId);

        // リアルタイムリスナーを設定
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPosts(data.posts || []);
            } else {
                // ドキュメントが存在しない場合は初期化
                setDoc(docRef, { community_id: communityId, posts: [] });
                setPosts([]); // 初期化した後、空の配列を設定
            }
        });

        return unsubscribe; // クリーンアップ用の関数を返す
    }, [communityId]);

    useEffect(() => {
        const unsubscribe = fetchPosts(); // fetchPostsを呼び出し、リスナーを登録
        return () => unsubscribe(); // コンポーネントがアンマウントされたときにリスナーを解除
    }, [fetchPosts]); // fetchPostsが変更されたときに再実行

    const handleNewPost = async () => {
        if (!newPostContent) return;

        const postId = posts.length + 1; // 投稿IDを決定（単純な例）

        // 新しい投稿のデータ
        const newPost = {
            content: newPostContent,
            created_at: new Date(),
            likedBy: [],
            likes: 0,
            post_id: postId,
            user_icon: auth.currentUser.photoURL, // ユーザーアイコンURL
            user_id: auth.currentUser.uid, // ユーザーID
            user_name: auth.currentUser.displayName // ユーザー名
        };

        // community_postsのドキュメントを更新
        const docRef = doc(db, "community_posts", communityId);
        await updateDoc(docRef, {
            posts: [...posts, newPost] // 既存の投稿に新しい投稿を追加
        });

        setNewPostContent("");
    };

    return (
        <div>
            <h2>コミュニティ投稿</h2>
            <input
                type="text"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="新しい投稿を入力"
            />
            <button onClick={handleNewPost}>投稿</button>
            <div>
                {posts.map((post) => (
                    <div key={post.post_id}> {/* post_idをキーに使用 */}
                        <p>{post.content}</p>
                        <p>投稿者: {post.user_name}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CommunityPosts;
