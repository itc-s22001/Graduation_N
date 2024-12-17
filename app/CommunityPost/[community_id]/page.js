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
    const [isAdmin, setIsAdmin] = useState(false); // 管理者判定
    const [showAdminPanel, setShowAdminPanel] = useState(false);  // 管理者パネルの表示
    const [adminActions, setAdminActions] = useState({ deleteMember: "", deletePost: "" });  // 管理者操作

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
                                        [post.user_id]: userDoc.data().profile_image_url || "default_icon_url",
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

    const handleDeletePost = async (postId) => {
        if (!isAdmin) {
            console.log("管理者以外は削除できません");
            return;
        }

        try {
            const postsDocRef = doc(db, "community_posts", community_id);
            const docSnap = await getDoc(postsDocRef);

            if (docSnap.exists()) {
                const updatedPosts = docSnap.data().posts.filter(post => post.post_id !== postId);
                await updateDoc(postsDocRef, { posts: updatedPosts });
                setPosts(updatedPosts);
            }
        } catch (error) {
            console.error("投稿削除エラー:", error);
        }
    };

    const handleDeleteMember = async (memberId) => {
        if (!isAdmin) {
            console.log("管理者以外はメンバーを削除できません");
            return;
        }

        try {
            // メンバー削除のロジック（ここでは例として、特定メンバーを削除するものとします）
            const membersDocRef = doc(db, "community_members", community_id);
            const docSnap = await getDoc(membersDocRef);
            if (docSnap.exists()) {
                const updatedMembers = docSnap.data().members.filter(member => member.id !== memberId);
                await updateDoc(membersDocRef, { members: updatedMembers });
            }

            console.log("メンバーが削除されました");
        } catch (error) {
            console.error("メンバー削除エラー:", error);
        }
    };

    const handleCommunityInfoUpdate = async () => {
        if (!isAdmin) {
            console.log("管理者のみが情報を更新できます");
            return;
        }

        try {
            const communityDocRef = doc(db, "communities", community_id);
            await updateDoc(communityDocRef, {
                community_name: adminActions.communityName || community.community_name,
                community_profile: adminActions.communityProfile || community.community_profile,
            });

            console.log("コミュニティ情報が更新されました");
        } catch (error) {
            console.error("コミュニティ情報更新エラー:", error);
        }
    };
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
                user_icon: currentUser.photoURL || "default_icon_url",
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
        return <p>コミュニティ情報を読み込んでいます...</p>;
    }

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <div className="community-post-page">
                <div style={{ width: "auto"}}>
                    <button onClick={GoBack}
                    style={{ left: 0}}>
                        ⬅
                    </button>
                </div>
                <h1 className="community-name">{community ? community.community_name : "コミュニティ情報を取得中"}</h1>
                <p className="community-pro">{community ? community.community_profile : ""}</p>
                {isAdmin && (
                    <div className="settings-icon">
                        <button onClick={() => setShowAdminPanel(true)}>
                            <FaCog />
                        </button>
                    </div>
                )}

                {showAdminPanel && (
                    <div className="admin-panel">
                        <h3>管理者メニュー</h3>
                        <div>
                            <label>
                                コミュニティ名:
                                <input
                                    type="text"
                                    value={adminActions.communityName || community.community_name}
                                    onChange={(e) => setAdminActions({ ...adminActions, communityName: e.target.value })}
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                コミュニティ説明:
                                <textarea
                                    value={adminActions.communityProfile || community.community_profile}
                                    onChange={(e) => setAdminActions({ ...adminActions, communityProfile: e.target.value })}
                                />
                            </label>
                        </div>
                        <button onClick={handleCommunityInfoUpdate}>更新する</button>

                        <div>
                            <h4>メンバー削除</h4>
                            <button onClick={() => handleDeleteMember("memberId")}>メンバー削除</button>
                        </div>

                        <div>
                            <h4>不適切なコメント削除</h4>
                            <button onClick={() => handleDeletePost("postId")}>投稿を削除</button>
                        </div>

                        <button onClick={() => setShowAdminPanel(false)}>閉じる</button>
                    </div>
                    )}

                <div className="posts-list">
                    {posts.length === 0 ? (
                        <p>投稿はまだありません。</p>
                    ) : (
                        posts.map((post) => (
                            <div key={post.post_id || post.created_at} className="post">  {/* post_idを使用 */}
                                <div className="post-header">
                                    <div className="user-info" style={{display: "flex", alignItems: "center"}}>
                                        <Image
                                            style={{width: "50px", height: "50px", borderRadius: "60px"}}
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
            <Searchdummy/>
        </div>
    );
    };

    export default CommunityPostPage;
