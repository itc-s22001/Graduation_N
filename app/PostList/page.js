"use client";

import { useState, useEffect } from "react";
import { query, collection, orderBy, onSnapshot, where, getDocs, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase Storageのインポート
import { storage } from '../firebase'; // 追加: Firebase Storageの初期化をインポート
import Sidebar from "../Sidebar/page";
import Searchdummy from "../Searchdummy/page";

const PostPage = () => {
    const [posts, setPosts] = useState([]);
    const [user, setUser] = useState(null);
    const [isConfirmPopupOpen, setIsConfirmPopupOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);
    const [loading, setLoading] = useState(true); // Loading state
    const [content, setContent] = useState(""); // 投稿内容の状態
    const [image, setImage] = useState(null); // 画像の状態

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const q = query(collection(db, "users"), where("email", "==", currentUser.email));
                const userSnapshot = await getDocs(q);
                if (!userSnapshot.empty) {
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

    useEffect(() => {
        const q = query(collection(db, "post"), orderBy("create_at", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                likedByUser: doc.data().likedBy && doc.data().likedBy.includes(user?.id),
            }));
            setPosts(postData);
            setLoading(false); // Stop loading when data is fetched
        });
        return () => unsubscribe();
    }, [user]);

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
            try {
                await deleteDoc(doc(db, "post", postToDelete));
                closeConfirmPopup();
                alert("投稿が削除されました"); // User feedback after deletion
            } catch (error) {
                console.error("削除に失敗しました: ", error);
                alert("投稿の削除に失敗しました");
            }
        }
    };

    const toggleLike = async (postId, currentLikes, likedByUser) => {
        if (!user) return;

        const postRef = doc(db, "post", postId);
        const post = posts.find(post => post.id === postId);
        if (!post || !Array.isArray(post.likedBy)) return;

        const newLikes = likedByUser ? currentLikes - 1 : currentLikes + 1;
        const updatedLikedBy = likedByUser
            ? post.likedBy.filter(uid => uid !== user.id)
            : [...post.likedBy, user.id];

        try {
            await updateDoc(postRef, {
                likes: newLikes,
                likedBy: updatedLikedBy,
            });
        } catch (error) {
            console.error("いいねの更新に失敗しました: ", error);
            alert("いいねの更新に失敗しました");
        }
    };

    const handleImageChange = (event) => {
        setImage(event.target.files[0]);
    };

    const handlePostSubmit = async () => {
        if (!content) {
            alert("投稿内容を入力してください");
            return;
        }

        let imageUrl = null;
        if (image) {
            const storageRef = ref(storage, `images/${image.name}`);
            await uploadBytes(storageRef, image);
            imageUrl = await getDownloadURL(storageRef);
        }

        // 投稿データの追加
        const newPost = {
            content,
            user_id: user.id,
            user_name: user.name,
            user_icon: user.user_icon || "", // user_iconがundefinedの場合は空文字列を設定
            create_at: new Date(),
            likes: 0,
            likedBy: [],
            comments_count: 0,
            imageUrl, // 画像URLを追加
        };

        await addDoc(collection(db, "post"), newPost);
        setContent("");
        setImage(null);
    };



    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh' }}>
            <Sidebar />
            <div style={{ width: '100%', maxWidth: '600px' }}>


                {loading ? (
                    <p>Loading...</p>
                ) : (
                    posts.map((post) => (
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
                                {post.user_icon && (
                                    <img
                                        src={post.user_icon}
                                        alt="User Icon"
                                        style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
                                    />
                                )}
                                <p style={{ fontWeight: 'bold' }}>{post.user_name}</p>
                                {user?.uid === post.user_id && (
                                    <div style={{ marginLeft: 'auto', position: 'relative' }}>
                                        <button onClick={() => openConfirmPopup(post.id)}>
                                            ⋮
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p>内容: {post.content}</p>
                            {post.imageUrl && <img src={post.imageUrl} alt="Post" style={{ maxWidth: '100%', borderRadius: '10px', marginTop: '10px' }} />}
                            <p>投稿日: {post.create_at ? new Date(post.create_at.seconds * 1000).toLocaleString() : "不明"}</p>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button onClick={() => toggleLike(post.id, post.likes, post.likedByUser)}>
                                    {post.likedByUser ? "いいねを取り消す" : "いいね"}
                                </button>
                                <p>いいね: {post.likes}</p>
                                <p>コメント数: {post.comments_count}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

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
            <Searchdummy />
        </div>
    );
};

export default PostPage;
