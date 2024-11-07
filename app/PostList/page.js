"use client";

import { useState, useEffect } from "react";
import { query, collection, orderBy, onSnapshot, where, getDocs, updateDoc, deleteDoc, doc,getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from 'firebase/auth';
import Sidebar from "../Sidebar/page";


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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh' }}>
            <Sidebar />
            <div style={{ width: '100%', maxWidth: '600px' }}>
                {posts.map((post) => (
                    <div key={post.id} style={{
                        border: '1px solid #ccc',
                        borderRadius: '10px',
                        padding: '10px',
                        marginBottom: '10px',
                        backgroundColor: 'white',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            {/* アイコン表示 */}
                            {post.user_icon && (
                                <img
                                    src={post.user_icon} // 投稿データから取得したユーザーのアイコンを表示
                                    alt="User Icon"
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
                                />
                            )}
                            {/* ユーザー名表示 */}
                            <p style={{ fontWeight: 'bold' }}>{post.user_name}</p>
                            {user?.uid === post.user_id && (
                                <div style={{ marginLeft: 'auto', position: 'relative' }}>
                                    <button onClick={() => setIsDeleteMenuOpen(prev => ({ ...prev, [post.id]: !prev[post.id] }))}>
                                        ⋮
                                    </button>
                                    {isDeleteMenuOpen[post.id] && (
                                        <div style={{
                                            position: 'absolute',
                                            right: 0,
                                            backgroundColor: 'white',
                                            border: '1px solid #ccc',
                                            borderRadius: '5px',
                                            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
                                            padding: '5px',
                                            cursor: 'pointer'
                                        }}
                                            onClick={() => openConfirmPopup(post.id)}
                                        >
                                            削除
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <p>{post.content}</p> {/* 内容 */}
                        <p>投稿日: {post.create_at ? new Date(post.create_at.seconds * 1000).toLocaleString() : "不明"}</p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
                    zIndex: 1000
                }}>
                    <p>本当にこの投稿を削除しますか？</p>
                    <button onClick={handleDeletePost}>削除</button>
                    <button onClick={closeConfirmPopup}>キャンセル</button>
                </div>
            )}
        </div>
    );
};


export default PostPage;