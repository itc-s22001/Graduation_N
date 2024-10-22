"use client";

import { useState, useEffect } from "react";
import { query, collection, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

import { useState, useEffect } from "react";
import { query, collection, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const PostPage = () => {
    const [posts, setPosts] = useState([]); // 投稿データの状態管理

    // リアルタイムで投稿データを取得するためのuseEffect
    useEffect(() => {
        // Firestoreのコレクション 'post' を最新の順で取得するクエリを作成
        const q = query(collection(db, "post"), orderBy("create_at", "desc"));

        // リアルタイムでデータベースの変更を監視してデータを取得
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postData = snapshot.docs.map(doc => ({
                id: doc.id, // ドキュメントID
                ...doc.data() // ドキュメント内のデータを取得
            }));

            setPosts(postData); // 取得した投稿データを状態にセット
        });

        // コンポーネントがアンマウントされたときにリスナーを解除
        return () => unsubscribe();
    }, []);

    return (
        <div>
            {/* 投稿の表示 */}
            {posts.map(post => (
                <div key={post.id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
                    <p>内容: {post.content}</p>
                    <p>投稿日: {post.create_at ? new Date(post.create_at.seconds * 1000).toLocaleString() : "不明"}</p>
                    <p>いいね: {post.likes}</p>
                    <p>コメント数: {post.comments_count}</p>
                </div>
            ))}
        </div>
    );
};

export default PostPage;

