"use client";

import { useState, useEffect } from "react";
import { HomeScreen } from "../Home_screen/page";
import styles from "@/styles/PostList.module.css"

const PostList = () => {
    const [posts, setPosts] = useState([]);  // 投稿データを格納する状態
    const [loading, setLoading] = useState(true); // ローディング状態を管理


    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const fetchedPosts = await HomeScreen();  // データを取得 
                setPosts(fetchedPosts) // 状態に投稿データを設定
            } catch (e) {
                console.log("エラーが発生しました", e);  // エラーハンドリング
            }
        };
        fetchPosts(); // 関数を呼び出す
    }, []);

    return (
        <div className={styles.post_list}>
                {posts.map(post => (
                    <div key={post.id} className={styles.post}>
                        <h3>{post.content}</h3> {/* 投稿内3000容を表示 */}
                        <p>投稿日: {new Date(post.create_at.seconds * 1000).toLocaleString()}</p> {/* 投稿日時を表示 */}
                        <p>投稿ID: {post.post_id}</p>
                        <p>ユーザーID: {post.user_id}</p>
                    </div>
                ))}
        </div>
    );
};

export default PostList;