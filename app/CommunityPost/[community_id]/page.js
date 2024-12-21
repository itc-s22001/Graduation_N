"use client";

import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { FaHeart, FaRegHeart, FaCog } from "react-icons/fa";
import '../../../style/CommunityPostPage.css';
import Image from "next/image";

import Sidebar from "../../Sidebar/page";
import Searchdummy from "../../Searchdummy/page";
import {useRouter} from "next/navigation";
import CommunitySearchBar from "@/app/CommunitySearchBar/page";

const CommunityPostPage = ({ params }) => {
    const { community_id } = params;
    const [community, setCommunity] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState("");
    const [user, setUser] = useState(null);
    const [userIcons, setUserIcons] = useState({});
    const [userNames, setUserNames] = useState({});
    const [showPostPopup, setShowPostPopup] = useState(false);

    const generatePostId = () => {
        return Math.floor(10000 + Math.random() * 90000).toString();  // 10000〜99999の範囲でランダムな整数
    };

    const router = useRouter();  // useRouterをコンポーネント内で呼び出し

    const GoBack = () => {
        router.push('/Community');  // ここで '/home' を遷移先のパスに変更
    };

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

                        postsData.forEach(async (post) => {
                            if (post.user_id && !userIcons[post.user_id]) {
                                const userDocRef = doc(db, "users", post.user_id);
                                const userDoc = await getDoc(userDocRef);
                                if (userDoc.exists()) {
                                    setUserIcons((prevIcons) => ({
                                        ...prevIcons,
                                        [post.user_id]: userDoc.data().profile_image_url,
                                    }));
                                    setUserNames((prevNames) => ({
                                        ...prevNames,
                                        [post.user_id]: userDoc.data().name || "名無し",
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

            const userGid = userDoc.data().gid;

            // 投稿をpost_idで取得
            const post = posts.find((p) => p.post_id === postId);
            if (!post) {
                console.error("指定された投稿が見つかりません");
                return;
            }

            // いいねの状態を更新
            const updatedLikedBy = post.likedBy.includes(userGid)
                ? post.likedBy.filter((gid) => gid !== userGid)  // いいねを取り消す
                : [...post.likedBy, userGid];  // いいねを追加

            const updatedLikes = updatedLikedBy.length;

            // Firestoreでの投稿更新
            const postsDocRef = doc(db, "community_posts", community_id);
            await updateDoc(postsDocRef, {
                posts: posts.map((p) =>
                    p.post_id === postId  // post_idで特定の投稿を更新
                        ? { ...p, likes: updatedLikes, likedBy: updatedLikedBy }
                        : p
                ),
            });

            // ローカルステートで更新
            setPosts((prevPosts) =>
                prevPosts.map((p) =>
                    p.post_id === postId  // post_idで特定の投稿を更新
                        ? { ...p, likes: updatedLikes, likedBy: updatedLikedBy }
                        : p
                )
            );
        } catch (error) {
            console.error("いいねの更新に失敗しました:", error);
        }
    };



        const handleNewPost = async (event) => {
        event.preventDefault();
        if (!newPostContent.trim()) return;

        try {
            const currentUser = user || { uid: "guest", displayName: "ゲストユーザー" };

            // 5桁のランダムなpost_idを生成
            const postId = generatePostId();

            // 新しい投稿オブジェクト
            const newPost = {
                post_id: postId,  // post_idを追加
                content: newPostContent,
                user_id: currentUser.uid,
                user_name: currentUser.displayName || currentUser.email,
                user_icon: currentUser.photoURL,
                likes: 0,
                likedBy: [],
                created_at: new Date(),
            };

            const postsDocRef = doc(db, "community_posts", community_id);
            const docSnap = await getDoc(postsDocRef);

            if (docSnap.exists()) {
                await updateDoc(postsDocRef, {
                    posts: [...docSnap.data().posts, newPost],  // 新しい投稿を追加
                });
            } else {
                await setDoc(postsDocRef, {
                    posts: [newPost],  // 新しい投稿を初めて保存
                });
            }

            // 投稿内容をリセット
            setNewPostContent("");
            setShowPostPopup(false);
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
        return (
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
            }}>
                <p>コミュニティ情報を読み込んでいます...</p>
            </div>
        );
    }

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <div className="community-post-page">
                <div style={{position: "fixed", top: "50px", left: "30%", zIndex: 1000}}>
                    <button
                        onClick={GoBack}
                        style={{
                            backgroundColor: "#1d9bf0", // ボタン背景色
                            color: "white", // ボタンの文字色
                            border: "none", // ボーダーを削除
                            borderRadius: "50%", // 丸いボタン
                            width: "50px", // ボタンの幅
                            height: "50px", // ボタンの高さ
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            cursor: "pointer", // ホバー時にポインターを表示
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", // 軽い影
                        }}
                    >
                        ⬅
                    </button>
                </div>

                <div style={{ display: "flex"}}>
                    <Image
                        style={{borderRadius: "60px"}}
                        src={community.community_image_url}
                        width={80}
                        height={80}
                    />
                    <h1 className="community-name"
                    style={{
                        marginRight: '50px', marginLeft: '10px',
                    }}>{community ? community.community_name : "コミュニティ情報を取得中"}</h1>

                </div>
                <p className="community-pro">{community ? community.community_profile : ""}</p>


                <div className="posts-list">
                    {posts.length === 0 ? (
                        <p>投稿はまだありません。</p>
                    ) : (
                        posts.map((post) => (
                            <div key={post.post_id || post.created_at} className="post">  {/* post_idを使用 */}
                                <div className="post-header">
                                    <div className="user-info" style={{display: "flex", alignItems: "center"}}>
                                        <Image
                                            style={{borderRadius: "60px"}}
                                            src={userIcons[post.user_id]}
                                            alt={`${post.user_name}のアイコン`}
                                            className="user-icon"
                                            width={50}
                                            height={50}
                                        />
                                        <span className="user-name"
                                        style={{
                                            marginLeft: '20px',
                                            fontSize: '20px',
                                        }}>{userNames[post.user_id] || post.user_name}</span>
                                    </div>
                                </div>
                                <p className="post-content">{post.content}</p>
                                <div className="post-footer" style={{display: "flex", justifyContent: "space-between"}}>
                                    <div className="likes">
                                        <button onClick={() => handleLikePost(post.post_id)}
                                                className="like-button">  {/* post_idを使用 */}
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

                <button onClick={() => setShowPostPopup(true)} className="new-post-button">コミュニティに投稿</button>

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
            {/*<Searchdummy/>*/}
            <CommunitySearchBar />

        </div>
    );
};

export default CommunityPostPage;
