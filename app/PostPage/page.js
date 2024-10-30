"use client";

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, doc, getDocs, where, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Modal from '../Modal/page'; // モーダルコンポーネントをインポート
import { onAuthStateChanged } from 'firebase/auth';

const PostPage = () => {
    const [posts, setPosts] = useState([]); // 投稿データの状態管理
    const [isModalOpen, setIsModalOpen] = useState(false); // モーダルの状態管理
    const [user, setUser] = useState(null); // ログイン中のユーザー情報の状態管理
    const [content, setContent] = useState(""); // 投稿内容の状態管理


    // useEffect(() => {
    //     // ログイン中のユーザー情報を取得
    //     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    //         if (currentUser) {
    //             const q = query(collection(db, "users"), where("email", "==", currentUser.email));
    //             const userSnapshot = await getDocs(q);
    //             if (!userSnapshot.empty) {
    //                 const userData = userSnapshot.docs[0].data();
    //                 setUser({
    //                     id: userSnapshot.docs[0].id,
    //                     ...userData,
    //                 });
    //             }
    //         } else {
    //             setUser(null);
    //         }
    //     });
    //     return () => unsubscribe();
    // }, []);

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
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                likedByUser: doc.data().likedBy && doc.data().likedBy.includes(user?.id), // いいね済みか判定
            }));
            setPosts(postData); // 投稿データをセット
        });
        return () => unsubscribe();
    }, [user]);

    // 投稿をFirestoreに保存する関数
    const handlePostSubmit = async (e) => {
        e.preventDefault();
        if (content.trim() === "" || !user) {
            alert("投稿内容を入力してください");
            return;
        }
        try {
            await addDoc(collection(db, "post"), {
                content: content,
                create_at: serverTimestamp(), // サーバー側のタイムスタンプを使用
                likes: 0, // 初期のいいね数
                likedBy: [], // いいねしたユーザーのIDリスト
                user_id: user.id, // ログインしているユーザーID
                user_name: user.name || "名無しのユーザー", // ログインしているユーザー名
                user_icon: user.profile_image_url || "", // ログインしているユーザーのアイコン
                comments_count: 0, // 初期のコメント数
            });
            setContent(""); // 投稿後、フォームをリセット
        } catch (error) {
            console.error("投稿に失敗しました: ", error);
            alert("投稿に失敗しました。");
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
    // const toggleLike = async (postId, currentLikes, likedByUser) => {
    //     if (!user) return;

    //     const postRef = doc(db, "post", postId);
    //     const newLikes = likedByUser ? currentLikes - 1 : currentLikes + 1;
    //     const updatedLikedBy = likedByUser
    //         ? posts.find(post => post.id === postId).likedBy.filter(uid => uid !== user.id)
    //         : [...posts.find(post => post.id === postId).likedBy, user.id];

    //     try {
    //         await updateDoc(postRef, {
    //             likes: newLikes,
    //             likedBy: updatedLikedBy,
    //         });
    //     } catch (error) {
    //         console.error("いいねの更新に失敗しました: ", error);
    //     }
    // };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            {/* 投稿フォーム */}
            <form onSubmit={handlePostSubmit} style={{ width: '100%', maxWidth: '600px', marginBottom: '20px' }}>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="今何してる？"
                    style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #ccc',
                        marginBottom: '10px',
                        fontSize: '16px',
                        resize: 'none'
                    }}
                />
                <button type="submit" style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#1d9bf0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '16px',
                    cursor: 'pointer'
                }}>
                    投稿
                </button>
            </form>

            {/* 投稿の表示 */}
            <div style={{ width: '100%', maxWidth: '600px' }}>
                {posts.map((post) => (
                    <div key={post.id} style={{
                        border: '1px solid #ccc',
                        borderRadius: '10px',
                        padding: '10px',
                        marginBottom: '10px',
                        backgroundColor: 'white',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
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
                        </div>
                        <p>内容: {post.content}</p>
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
        </div>
    );
};

export default PostPage;


// return (
//     <div>
//         {/* 投稿フォーム */}
//         <form onSubmit={handlePostSubmit}>
//             <textarea
//                 value={content}
//                 onChange={(e) => setContent(e.target.value)}
//                 placeholder="今何してる？"
//             />
//             <button type="submit">投稿</button>
//         </form>

//         {/* 投稿の表示 */}
//         <div>
//             {posts.map((post) => (
//                 <div key={post.id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
//                     <div style={{ display: "flex", alignItems: "center" }}>
//                         {/* アイコン表示 */}
//                         {post.user_icon && (
//                             <img
//                                 src={post.user_icon} // 投稿データから取得したユーザーのアイコンを表示
//                                 alt="User Icon"
//                                 style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px" }}
//                             />
//                         )}
//                         {/* ユーザー名表示 */}
//                         <p>{post.user_name}</p>
//                     </div>
//                     <p>内容: {post.content}</p>
//                     <p>投稿日: {post.create_at ? new Date(post.create_at.seconds * 1000).toLocaleString() : "不明"}</p>
//                     <p>いいね: {post.likes}</p>
//                     <p>コメント数: {post.comments_count}</p>
//                 </div>
//             ))}
//         </div>
//     </div>
// );


// const PostPage = () => {
//     const [posts, setPosts] = useState([]); // 投稿データの状態管理
//     const [isModalOpen, setIsModalOpen] = useState(false); // モーダルの状態管理
//     const [user, setUser] = useState(null); // ログイン中のユーザー情報の状態管理
//     const [content, setContent] = useState(""); // 投稿内容の状態管理

//     // ログイン中のユーザーを取得
//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//             if (currentUser) {
//                 // users コレクションから現在のユーザーのデータを取得
//                 const userDocRef = doc(db, "users", currentUser.uid);
//                 const userSnapshot = await getDoc(userDocRef);

//                 if (userSnapshot.exists()) {
//                     setUser({
//                         id: currentUser.uid,
//                         ...userSnapshot.data(),
//                     });
//                 }
//             } else {
//                 setUser(null);
//             }
//         });

//         return () => unsubscribe();
//     }, []);

//     // 投稿データをリアルタイムで取得
//     useEffect(() => {
//         const q = query(collection(db, "post"), orderBy("create_at", "desc"));
//         const unsubscribe = onSnapshot(q, (snapshot) => {
//             const postData = snapshot.docs.map((doc) => ({
//                 id: doc.id,
//                 ...doc.data(),
//             }));
//             setPosts(postData); // 投稿データをセット
//         });

//         return () => unsubscribe();
//     }, []);

//     // 投稿をFirestoreに保存する関数
//     const handlePostSubmit = async (e) => {
//         e.preventDefault();
//         if (content.trim() === "" || !user) {
//             alert("投稿内容を入力してください");
//             return;
//         }

//         try {
//             await addDoc(collection(db, "post"), {
//                 content: content,
//                 create_at: serverTimestamp(), // サーバー側のタイムスタンプを使用
//                 likes: 0, // 初期のいいね数
//                 user_id: user.id, // ログインしているユーザーID
//                 user_name: user.name || "名無しのユーザー", // ログインしているユーザー名
//                 user_icon: user.profile_image_url || "", // ログインしているユーザーのアイコン
//                 comments_count: 0, // 初期のコメント数
//             });
//             setContent(""); // 投稿後、フォームをリセット
//         } catch (error) {
//             console.error("投稿に失敗しました: ", error);
//             alert("投稿に失敗しました。");
//         }
//     };

//     return (
//         <div>
//             {/* 投稿フォーム */}
//             <form onSubmit={handlePostSubmit}>
//                 <textarea
//                     value={content}
//                     onChange={(e) => setContent(e.target.value)}
//                     placeholder="今何してる？"
//                 />
//                 <button type="submit">投稿</button>
//             </form>

//             {/* 投稿の表示 */}
//             <div>
//                 {posts.map((post) => (
//                     <div key={post.id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
//                         <div style={{ display: "flex", alignItems: "center" }}>
//                             {/* アイコン表示 */}
//                             {post.user_icon && (
//                                 <img
//                                     src={post.user_icon} // 投稿データから取得したユーザーのアイコンを表示
//                                     alt="User Icon"
//                                     style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px" }}
//                                 />
//                             )}
//                             {/* ユーザー名表示 */}
//                             <p>{post.user_name}</p>
//                         </div>
//                         <p>内容: {post.content}</p>
//                         <p>投稿日: {post.create_at ? new Date(post.create_at.seconds * 1000).toLocaleString() : "不明"}</p>
//                         <p>いいね: {post.likes}</p>
//                         <p>コメント数: {post.comments_count}</p>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };

// export default PostPage;
// const PostPage = () => {
//     const [posts, setPosts] = useState([]); // 投稿データの状態管理
//     const [isModalOpen, setIsModalOpen] = useState(false); // モーダルの状態管理
//     const [user, setUsers] = useState({}); // ユーザー情報の状態管理
//     const [content, setContent] = useState(""); // 投稿内容の状態管理



//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//             if (currentUser) {
//                 // Firestoreでユーザー情報を取得（別のusersコレクションがあると仮定）
//                 const userRef = collection(db, "users");
//                 onSnapshot(userRef, (snapshot) => {
//                     const userData = snapshot.docs.map(doc => ({
//                         id: doc.id,
//                         ...doc.data(),
//                     })).find(user => user.id === currentUser.uid);

//                     setUsers(userData); // ログインユーザーの情報をセット
//                 });
//             } else {
//                 setUsers(null);
//             }
//         });

//         return () => unsubscribe();
//     }, []);

//     // 投稿データをリアルタイムで取得
//     useEffect(() => {
//         const q = query(collection(db, "post"), orderBy("create_at", "desc"));
//         const unsubscribe = onSnapshot(q, (snapshot) => {
//             const postData = snapshot.docs.map(doc => ({
//                 id: doc.id,
//                 ...doc.data(),
//             }));
//             setPosts(postData); // 投稿データをセット
//         });

//         return () => unsubscribe();
//     }, []);

//     // 投稿をFirestoreに保存する関数
//     const handlePostSubmit = async (e) => {
//         e.preventDefault();
//         if (content.trim() === "" || !user) {
//             alert("投稿内容を入力してください");
//             return;
//         }

//         try {
//             await addDoc(collection(db, 'post'), {
//                 content: content,
//                 create_at: serverTimestamp(), // サーバー側のタイムスタンプを使用
//                 likes: 0, // 初期のいいね数
//                 user_id: user.id, // ログインしているユーザーID
//                 user_name: user.name || "名無しのユーザー",// ログインしているユーザー名
//                 user_icon: user.profile_image_url || "", // ログインしているユーザーのアイコン
//                 comments_count: 0 // 初期のコメント数
//             });
//             setContent(""); // 投稿後、フォームをリセット
//             // alert("投稿が成功しました！");
//         } catch (error) {
//             console.error("投稿に失敗しました: ", error);
//             alert("投稿に失敗しました。");
//         }
//     };
//     return (
//         <div>
//             {/* 投稿フォーム */}
//             <form onSubmit={handlePostSubmit}>
//                 <textarea
//                     value={content}
//                     onChange={(e) => setContent(e.target.value)}
//                     placeholder="今何してる？"
//                 />
//                 <button type="submit">投稿</button>
//             </form>

//             {/* 投稿の表示 */}
//             <div>
//                 {posts.map(post => (
//                     <div key={post.id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
//                         <div style={{ display: "flex", alignItems: "center" }}>
//                             {/* アイコン表示 */}
//                             {post.user_icon && (
//                                 <img
//                                     src={post.user_icon} // 投稿データから取得したユーザーのアイコンを表示
//                                     alt="User Icon"
//                                     style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px" }}
//                                 />
//                             )}
//                             {/* {post.user_icon && (
//                                 <img
//                                     src={auth.currentUser.photoURL}
//                                     alt="User Icon"
//                                     style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px" }}
//                                 />
//                             )} */}
//                             {/* ユーザー名表示 */}
//                             <p>{post.user_name}</p>
//                         </div>
//                         <p>内容: {post.content}</p>
//                         <p>投稿日: {post.create_at ? new Date(post.create_at.seconds * 1000).toLocaleString() : "不明"}</p>
//                         {/* <p>投稿日: {new Date(post.create_at.seconds * 1000).toLocaleString()}</p> */}
//                         <p>いいね: {post.likes}</p>
//                         <p>コメント数: {post.comments_count}</p>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };


// export default PostPage;