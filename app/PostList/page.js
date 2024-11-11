"use client";

import { useState, useEffect } from "react";
import { query, collection, orderBy, onSnapshot, where, getDocs, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from 'firebase/auth';
import Sidebar from "../Sidebar/page";
import '@/styles/PostList.css';


const PostPage = () => {
    const [posts, setPosts] = useState([]); // 投稿データの状態管理
    const [user, setUser] = useState(null); // ログイン中のユーザー情報の状態管理
    const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState({}); // 削除メニューの状態管理
    const [isConfirmPopupOpen, setIsConfirmPopupOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);

    // ログイン中のユーザーを取得
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // users コレクションからemailを基にユーザーデータを取得
                const q = query(collection(db, "users"), where("email", "==", currentUser.email));
                const userSnapshot = await getDocs(q);

                if (!userSnapshot.empty) {
                    // 取得したユーザーデータを状態にセット
                    const userData = userSnapshot.docs[0].data();
                    setUser({
                        id: userSnapshot.docs[0].id,
                        ...userData,
                    });
                }
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    // 投稿データをリアルタイムで取得
    useEffect(() => {
        const q = query(collection(db, "post"), orderBy("create_at", "desc"));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const postData = await Promise.all(
                snapshot.docs.map(async (docSnapshot) => {
                    const post = docSnapshot.data();

                    const userDocRef = doc(db, "users", post.user_id);
                    const userDoc = await getDoc(userDocRef);
                    let userData = {};
                    if (userDoc.exists()) {
                        userData = userDoc.data();
                    }

                    return {
                        id: docSnapshot.id,
                        ...post,
                        user_name: userData.name || "名無し",
                        user_icon: userData.profile_image_url || "/default_icon.png",
                        likedByUser: (post.likedBy || []).includes(user?.id), // likedByUserをチェック
                    };
                })
            );

            setPosts(postData); // 投稿データをセット
        });

        return () => unsubscribe();
    }, [user]);
    // useEffect(() => {
    //     const q = query(collection(db, "post"), orderBy("create_at", "desc"));
    //     const unsubscribe = onSnapshot(q, (snapshot) => {
    //         const postData = snapshot.docs.map((doc) => ({
    //             id: doc.id,
    //             ...doc.data(),
    //             likedByUser: doc.data().likedBy && doc.data().likedBy.includes(user?.id), // いいね済みか判定
    //         }));
    //         setPosts(postData); // 投稿データをセット
    //     });
    //     return () => unsubscribe();
    // }, [user]);

    const openConfirmPopup = (postId) => {
        setPostToDelete(postId);
        setIsConfirmPopupOpen(true);
    };

    const closeConfirmPopup = () => {
        setIsConfirmPopupOpen(false);
        setPostToDelete(null);
    };

    const handleDeletePost = async () => {
        if (postToDelete) {
            await deleteDoc(doc(db, "post", postToDelete));
            closeConfirmPopup();
        }
    };

    // いいねボタンの処理
    const toggleLike = async (postId, currentLikes, likedByUser) => {
        if (!user) return;

        const postRef = doc(db, "post", postId);
        const post = posts.find(post => post.id === postId); // 該当の投稿を取得

        // 投稿が見つからない場合、もしくはlikedByプロパティが存在しない場合は処理を中止
        if (!post || !Array.isArray(post.likedBy)) return;

        const newLikes = likedByUser ? currentLikes - 1 : currentLikes + 1;
        const updatedLikedBy = likedByUser
            ? post.likedBy.filter(uid => uid !== user.id) // ユーザーIDを削除
            : [...post.likedBy, user.id]; // ユーザーIDを追加

        try {
            await updateDoc(postRef, {
                likes: newLikes,
                likedBy: updatedLikedBy,
            });
        } catch (error) {
            console.error("いいねの更新に失敗しました: ", error);
        }
    };
    return (
        <div className="continer">
            <Sidebar />
            <div className="post_all">
                {posts.map((post) => (
                    <div key={post.id} className="single_post">
                        <div className="post_icon_name">
                            {/* アイコン表示 */}
                            {post.user_icon && (
                                <img
                                    src={post.user_icon} // 投稿データから取得したユーザーのアイコンを表示
                                    alt="User Icon"
                                    className="post_icon"
                                />
                            )}
                            {/* ユーザー名表示 */}
                            <p className="post_name">{post.user_name}</p>
                            {user?.uid === post.user_id && (
                                <div className="post_name_distance">
                                    <button onClick={() => setIsDeleteMenuOpen(prev => ({ ...prev, [post.id]: !prev[post.id] }))}>
                                        ⋮
                                    </button>
                                    {isDeleteMenuOpen[post.id] && (
                                        <div className="post_delete" onClick={() => openConfirmPopup(post.id)}> 削除</div>
                                    )}
                                </div>
                            )}
                        </div>
                        <p>{post.content}</p> {/* 内容 */}
                        <p>投稿日: {post.create_at ? new Date(post.create_at.seconds * 1000).toLocaleString() : "不明"}</p>
                        <div className="post_nice_comment">
                            <button onClick={() => toggleLike(post.id, post.likes, post.likedByUser)}>
                                {post.likedByUser ? "いいねを取り消す" : "いいね"}
                            </button>
                            <p>いいね: {post.likes}</p>
                            <p>コメント数: {post.comments_count}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 削除確認ポップアップ */}
            {isConfirmPopupOpen && (
                <div className="post_delete_confirmation">
                    <p>本当にこの投稿を削除しますか？</p>
                    <button onClick={handleDeletePost}>削除</button>
                    <button onClick={closeConfirmPopup}>キャンセル</button>
                </div>
            )}
        </div>
    );
};


export default PostPage;