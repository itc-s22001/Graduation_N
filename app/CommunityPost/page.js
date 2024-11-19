"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router"; // Next.jsのuseRouterをインポート
import { db } from "../firebase"; // Firebaseの設定をインポート
import { collection, getDocs, addDoc, query, orderBy, where } from "firebase/firestore"; // Firestoreのクエリ関連メソッド
import { auth } from "../firebase"; // Firebase Authenticationの設定をインポート

const CommunityPosts = () => {
    const [community, setCommunity] = useState(null); // コミュニティ情報
    const [posts, setPosts] = useState([]); // 投稿一覧
    const [newPost, setNewPost] = useState(""); // 新しい投稿内容
    const [loading, setLoading] = useState(true); // ローディング状態
    const router = useRouter();
    const { community_id } = router.query;  // URLパラメータからcommunity_idを取得

    useEffect(() => {
        const fetchCommunityData = async () => {
            if (!community_id) return; // community_idが未定義の場合は何もしない

            setLoading(true);

            try {
                // コミュニティ情報の取得
                const communityRef = doc(db, "communities", community_id); // community_idで参照
                const communitySnapshot = await getDoc(communityRef);

                if (communitySnapshot.exists()) {
                    setCommunity(communitySnapshot.data());
                } else {
                    console.error("指定したコミュニティは存在しません");
                }

                // コミュニティの投稿を取得 (community_idで絞り込む)
                const postsRef = collection(db, "community_posts");
                const postsQuery = query(postsRef, where("community_id", "==", community_id), orderBy("created_at", "desc"));
                const postsSnapshot = await getDocs(postsQuery);
                const postsData = postsSnapshot.docs.map((doc) => ({
                    ...doc.data(),
                    post_id: doc.id // ドキュメントIDをpost_idとして追加
                }));

                setPosts(postsData);
            } catch (error) {
                console.error("コミュニティデータの取得に失敗しました:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCommunityData();
    }, [community_id]);  // community_idが変更された場合にのみ実行

    const handlePostSubmit = async (e) => {
        e.preventDefault();

        if (!newPost.trim()) return;

        try {
            // 新しい投稿をFirestoreに追加
            const newPostRef = await addDoc(collection(db, "community_posts"), {
                content: newPost,
                created_at: new Date(),
                user_id: auth.currentUser.uid,
                user_name: auth.currentUser.displayName || "匿名ユーザー", // ユーザー名が取得できない場合は"匿名ユーザー"
                user_icon: auth.currentUser.photoURL || "", // アイコンURL
                community_id, // 投稿がどのコミュニティに属するか
                likedBy: [], // 初期状態ではいいねしているユーザーなし
                likes: 0, // 初期状態ではいいねの数は0
            });

            setPosts([
                { content: newPost, created_at: new Date(), user_id: auth.currentUser.uid, user_name: auth.currentUser.displayName || "匿名ユーザー", user_icon: auth.currentUser.photoURL || "", likes: 0, post_id: newPostRef.id },
                ...posts,
            ]);
            setNewPost(""); // 投稿後に入力欄をリセット
        } catch (error) {
            console.error("投稿エラー:", error);
        }
    };

    const handlePostChange = (e) => {
        setNewPost(e.target.value);
    };

    if (loading) {
        return <p>コミュニティ情報を読み込んでいます...</p>;
    }

    return (
        <div>
            <h1>{community ? community.community_name : "コミュニティ情報を取得中"}</h1>
            <p>{community ? community.community_profile : ""}</p>

            {/* 投稿フォーム */}
            <div>
                <h3>新しい投稿を作成</h3>
                <form onSubmit={handlePostSubmit}>
                    <textarea
                        value={newPost}
                        onChange={handlePostChange}
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
                            <div>
                                <img
                                    src={post.user_icon || "/default-icon.png"} // ユーザーアイコンの表示、なければデフォルト画像
                                    alt={post.user_name}
                                    style={{ width: "40px", height: "40px", borderRadius: "50%" }}
                                />
                                <strong>{post.user_name}</strong>
                            </div>
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

export default CommunityPosts;
