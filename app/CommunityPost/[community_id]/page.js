"use client";

import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import '../../../style/CommunityPostPage.css';

import Sidebar from "../../Sidebar/page";
import Searchdummy from "../../Searchdummy/page";

const CommunityPostPage = ({ params }) => {
    const { community_id } = params;
    const [community, setCommunity] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState("");
    const [user, setUser] = useState(null);
    const [userIcons, setUserIcons] = useState({}); // ユーザーのアイコンを保持するオブジェクト
    const [userNames, setUserNames] = useState({}); // ユーザー名を保持するオブジェクト
    const [showPostPopup, setShowPostPopup] = useState(false); // ポップアップ表示用の状態

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged(setUser);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!community_id) return;

        const fetchCommunityData = async () => {
            try {
                const communityDocRef = doc(db, "communities", community_id);
                const communityDoc = await getDoc(communityDocRef);
                if (communityDoc.exists()) {
                    setCommunity(communityDoc.data());
                } else {
                    await setDoc(communityDocRef, {
                        community_name: "新しいコミュニティ",
                        community_profile: "このコミュニティについての説明",
                        created_at: serverTimestamp(),
                    });
                    setCommunity({
                        community_name: "新しいコミュニティ",
                        community_profile: "このコミュニティについての説明",
                    });
                }

                const postsDocRef = doc(db, "community_posts", community_id);
                const unsubscribe = onSnapshot(postsDocRef, (docSnapshot) => {
                    if (docSnapshot.exists()) {
                        const postsData = docSnapshot.data().posts || [];
                        setPosts(postsData.sort((a, b) => b.created_at.seconds - a.created_at.seconds));

                        // 投稿の user_id に基づいて userIcons と userNames を更新
                        postsData.forEach(async (post) => {
                            if (post.user_id && !userIcons[post.user_id]) {
                                const userDocRef = doc(db, "users", post.user_id);
                                const userDoc = await getDoc(userDocRef);
                                if (userDoc.exists()) {
                                    setUserIcons(prevIcons => ({
                                        ...prevIcons,
                                        [post.user_id]: userDoc.data().profile_image_url || "default_icon_url"
                                    }));
                                    setUserNames(prevNames => ({
                                        ...prevNames,
                                        [post.user_id]: userDoc.data().name || "名無し"  // `name` フィールドを使用
                                    }));
                                }
                            }
                        });
                    } else {
                        setDoc(postsDocRef, { posts: [] });
                    }
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error fetching data:", error);
                setLoading(false);
            }
        };

        fetchCommunityData();
    }, [community_id, userIcons]);

    const handleLikePost = async (postId) => {
        if (!user) {
            console.error("ユーザー情報が無効です");
            return;
        }

        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                console.error("ユーザー情報が見つかりません");
                return;
            }

            const userId = userDoc.data().gid;  // gid を userId として設定
            const postIndex = posts.findIndex(post => post.id === postId);
            if (postIndex === -1) {
                console.error("指定された投稿が見つかりません");
                return;
            }

            const post = posts[postIndex];
            const postsDocRef = doc(db, "community_posts", community_id);

            if (post.likedBy.includes(userId)) {
                const updatedLikedBy = post.likedBy.filter(gid => gid !== userId);
                const updatedLikes = post.likes - 1;

                await updateDoc(postsDocRef, {
                    posts: [
                        ...posts.filter(p => p.id !== postId),
                        {
                            ...post,
                            likes: updatedLikes,
                            likedBy: updatedLikedBy,
                        },
                    ],
                });
            } else {
                const updatedLikedBy = [...post.likedBy, userId];
                const updatedLikes = post.likes + 1;

                await updateDoc(postsDocRef, {
                    posts: [
                        ...posts.filter(p => p.id !== postId),
                        {
                            ...post,
                            likes: updatedLikes,
                            likedBy: updatedLikedBy,
                        },
                    ],
                });
            }
        } catch (error) {
            console.error("いいねの更新に失敗しました:", error);
        }
    };

    const handleNewPost = async (event) => {
        event.preventDefault();

        if (!newPostContent.trim()) return;

        try {
            const currentUser = user || { uid: "guest", displayName: "ゲストユーザー" };

            const newPost = {
                content: newPostContent,
                user_id: currentUser.uid,
                user_name: currentUser.displayName || currentUser.email,
                user_icon: currentUser.photoURL || "default_icon_url",
                likes: 0,
                likedBy: [],
                created_at: new Date(),
            };

            const postsDocRef = doc(db, "community_posts", community_id);
            const docSnap = await getDoc(postsDocRef);

            if (docSnap.exists()) {
                await updateDoc(postsDocRef, {
                    posts: [...docSnap.data().posts, newPost],
                });
            } else {
                await setDoc(postsDocRef, {
                    posts: [newPost],
                });
            }

            setNewPostContent("");
            setShowPostPopup(false); // 投稿後にポップアップを閉じる
        } catch (error) {
            console.error("投稿エラー:", error);
        }
    };

    const handleNewPostChange = (event) => {
        setNewPostContent(event.target.value);
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleString();
    };

    if (loading) {
        return <p>コミュニティ情報を読み込んでいます...</p>;
    }

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <div className="community-post-page">
                <h1 className="community-name">{community ? community.community_name : "コミュニティ情報を取得中"}</h1>
                <p className="community-pro">{community ? community.community_profile : ""}</p>

                <div className="posts-list">
                    {posts.length === 0 ? (
                        <p>投稿はまだありません。</p>
                    ) : (
                        posts.map((post) => (
                            <div key={post.id || post.created_at} className="post">
                                <div className="post-header">
                                    <div className="user-info" style={{display: "flex", alignItems: "center"}}>
                                        <img style={{width: "50px", borderRadius: "60px"}}
                                             src={userIcons[post.user_id] || "default_icon_url"}
                                             alt={`${post.user_name}のアイコン`}
                                             className="user-icon"
                                        />
                                        <span className="user-name">{userNames[post.user_id] || post.user_name}</span>
                                    </div>
                                </div>
                                <p className="post-content">{post.content}</p>
                                <div className="post-footer" style={{display: "flex", justifyContent: "space-between"}}>
                                    <div className="likes">
                                        <button onClick={() => handleLikePost(post.id)} className="like-button">
                                            {post.likedBy.includes(user?.uid) ? (
                                                <FaHeart className="heart-icon liked"/>
                                            ) : (
                                                <FaRegHeart className="heart-icon"/>
                                            )}
                                        </button>
                                        <span className="like-count">{post.likes} いいね</span>
                                    </div>
                                    <span className="created-at">{formatTime(post.created_at)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* 投稿ボタン */}
                <button onClick={() => setShowPostPopup(true)} className="new-post-button">コミュニティに投稿</button>

                {/* ポップアップ（モーダル） */}
                {showPostPopup && (
                    <div className="post-popup">
                        <div className="popup-content">
                            <button onClick={() => setShowPostPopup(false)} className="close-popup-button">✕</button>
                            <h2>新しい投稿</h2>
                            <textarea
                                value={newPostContent}
                                onChange={handleNewPostChange}
                                placeholder="投稿内容を入力..."
                                className="post-input"
                            />
                            <button onClick={handleNewPost} className="submit-post-button">投稿する</button>
                        </div>
                    </div>
                )}
            </div>
            <Searchdummy />
        </div>
    );
};

export default CommunityPostPage;
