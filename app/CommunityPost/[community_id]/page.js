"use client";

import { useEffect, useState } from "react";
import { db } from "../../firebase"; // Firebase設定をインポート
import { doc, getDoc, setDoc, collection, addDoc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";

const CommunityPostPage = ({ params }) => {
    const { community_id } = params;  // URLからcommunity_idを取得
    const [community, setCommunity] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState("");  // 投稿内容の状態を定義

    // Firestoreのデータ取得と新規作成の処理
    useEffect(() => {
        if (!community_id) return;  // community_idがまだ取得できていない場合は何もせず終了

        const fetchCommunityData = async () => {
            try {
                // community_idに基づいてコミュニティデータを取得
                const communityDoc = await getDoc(doc(db, "communities", community_id));
                if (communityDoc.exists()) {
                    setCommunity(communityDoc.data());
                } else {
                    // コミュニティがない場合、新しく作成
                    await setDoc(doc(db, "communities", community_id), {
                        community_name: "新しいコミュニティ",
                        community_profile: "このコミュニティについての説明",
                        created_at: serverTimestamp(),
                    });
                    setCommunity({
                        community_name: "新しいコミュニティ",
                        community_profile: "このコミュニティについての説明",
                    });
                }

                // 投稿データを取得し、特定のコミュニティに関連するものだけをフィルタリング
                const postsSnapshot = await getDocs(collection(db, "community_posts"));
                const postsData = postsSnapshot.docs
                    .map((doc) => doc.data())
                    .filter(post => post.community_id === community_id); // community_idでフィルタリング
                setPosts(postsData);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching data:", error);
                setLoading(false);
            }
        };

        fetchCommunityData();
    }, [community_id]);  // community_id が変更されたときに再実行

    // 新しい投稿を追加
    const handleNewPost = async (event) => {
        event.preventDefault();

        // 空の投稿内容を防ぐ
        if (!newPostContent.trim()) return;

        try {
            // 新しい投稿を Firestore に追加
            const newPostRef = await addDoc(collection(db, "community_posts"), {
                content: newPostContent,
                created_at: serverTimestamp(), // 作成日時
                user_id: "user-id",  // ユーザーIDを動的に取得したい場合、認証情報を使う
                user_name: "ユーザー名",  // ユーザー名を取得したい場合、認証情報を使う
                community_id,  // 投稿がどのコミュニティに属するか
                likes: 0,  // 初期状態での「いいね」数
                likedBy: [],  // 初期状態で「いいね」しているユーザーの配列
            });

            // 投稿リストに新しい投稿を追加
            setPosts([
                ...posts,
                {
                    post_id: newPostRef.id,
                    content: newPostContent,
                    created_at: new Date(),
                    user_id: "user-id",  // 動的に設定
                    user_name: "ユーザー名",  // 動的に設定
                    likes: 0,
                    likedBy: [],
                },
            ]);

            setNewPostContent("");  // 投稿内容をリセット
        } catch (error) {
            console.error("投稿エラー:", error);
        }
    };

    // 投稿内容の入力が変更されたときに実行される
    const handleNewPostChange = (event) => {
        setNewPostContent(event.target.value);
    };

    // 投稿にいいねを追加する処理
    const handleLikePost = async (post) => {
        const postRef = doc(db, "community_posts", post.post_id);

        // 投稿がすでに「いいね」されているかを確認
        const updatedLikes = post.likedBy.includes("user-id")
            ? post.likes - 1
            : post.likes + 1;

        const updatedLikedBy = post.likedBy.includes("user-id")
            ? post.likedBy.filter((userId) => userId !== "user-id")
            : [...post.likedBy, "user-id"];

        // Firestoreで投稿を更新
        await updateDoc(postRef, {
            likes: updatedLikes,
            likedBy: updatedLikedBy,
        });

        // ローカルの投稿リストも更新
        setPosts(posts.map((p) =>
            p.post_id === post.post_id
                ? { ...p, likes: updatedLikes, likedBy: updatedLikedBy }
                : p
        ));
    };

    if (loading) {
        return <p>コミュニティ情報を読み込んでいます...</p>;
    }

    return (
        <div>
            <h1>{community ? community.community_name : "コミュニティ情報を取得中"}</h1>
            <p>{community ? community.community_profile : ""}</p>

            {/* 新しい投稿フォーム */}
            <div>
                <h3>新しい投稿を作成</h3>
                <form onSubmit={handleNewPost}>
                    <textarea
                        value={newPostContent}
                        onChange={handleNewPostChange}
                        placeholder="投稿内容を入力..."
                        rows="4"
                        cols="50"
                    />
                    <br />
                    <button type="submit">投稿</button>
                </form>
            </div>

            {/* 投稿リスト */}
            <div>
                <h3>投稿一覧</h3>
                {posts.length === 0 ? (
                    <p>投稿はまだありません。</p>
                ) : (
                    posts.map((post) => (
                        <div key={post.post_id} style={{ borderBottom: "1px solid #ccc", marginBottom: "10px" }}>
                            <div>{post.user_name}</div>
                            <div>{post.content}</div>
                            <div>投稿日: {new Date(post.created_at.seconds * 1000).toLocaleString()}</div>
                            <div>
                                <button onClick={() => handleLikePost(post)}>いいね ({post.likes})</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CommunityPostPage;
