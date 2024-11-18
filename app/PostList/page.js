"use client";

import { useState, useEffect } from "react";
import { query, collection, orderBy, onSnapshot, where, getDocs, updateDoc, deleteDoc, doc, getDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation'; // useRouterのインポート
import { FaHeart } from "react-icons/fa";  // ハートアイコンをインポート
import Sidebar from "../Sidebar/page";
import '@/styles/PostList.css';


const PostPage = () => {
    const router = useRouter(); // useRouterフックを使ってルーターを取得
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
    // 投稿データをリアルタイムで取得
    useEffect(() => {
        const q = query(collection(db, "post"), orderBy("create_at", "desc"));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const postData = await Promise.all(
                snapshot.docs.map(async (docSnapshot) => {
                    const post = docSnapshot.data();

                    // ユーザーデータを取得
                    const userDocRef = doc(db, "users", post.user_id);
                    const userDoc = await getDoc(userDocRef);
                    let userData = {};
                    if (userDoc.exists()) {
                        userData = userDoc.data();
                    }

                    // コメント数を取得
                    const commentsSnapshot = await getDocs(collection(docSnapshot.ref, "comments"));
                    const commentsCount = commentsSnapshot.size;

                    return {
                        id: docSnapshot.id,
                        ...post,
                        user_name: userData.name || "名無し",
                        user_icon: userData.profile_image_url || "/default_icon.png",
                        likedByUser: (post.likedBy || []).includes(user?.id),
                        comments_count: commentsCount, // コメント数を追加
                    };
                })
            );

            setPosts(postData); // 投稿データをセット
        });

        return () => unsubscribe();
    }, [user]);
    // useEffect(() => {
    //     const q = query(collection(db, "post"), orderBy("create_at", "desc"));
    //     const unsubscribe = onSnapshot(q, async (snapshot) => {
    //         const postData = await Promise.all(
    //             snapshot.docs.map(async (docSnapshot) => {
    //                 const post = docSnapshot.data();

    //                 const userDocRef = doc(db, "users", post.user_id);
    //                 const userDoc = await getDoc(userDocRef);
    //                 let userData = {};
    //                 if (userDoc.exists()) {
    //                     userData = userDoc.data();
    //                 }

    //                 return {
    //                     id: docSnapshot.id,
    //                     ...post,
    //                     user_name: userData.name || "名無し",
    //                     user_icon: userData.profile_image_url || "/default_icon.png",
    //                     likedByUser: (post.likedBy || []).includes(user?.id), // likedByUserをチェック
    //                 };
    //             })
    //         );

    //         setPosts(postData); // 投稿データをセット
    //     });

    //     return () => unsubscribe();
    // }, [user]);
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
        if (!postToDelete) return;

        // バッチ処理を開始
        const batch = writeBatch(db);
        const postRef = doc(db, "post", postToDelete);

        // 1. 投稿ドキュメントの削除を追加
        batch.delete(postRef);

        // 2. 関連するコメントを取得して削除をバッチに追加
        const commentsSnapshot = await getDocs(collection(postRef, "comments"));
        commentsSnapshot.forEach((commentDoc) => {
            batch.delete(commentDoc.ref);
        });

        // 3. バッチのコミット（全ての削除を実行）
        try {
            await batch.commit();
            console.log("投稿および関連するコメントが削除されました");
            closeConfirmPopup(); // 削除確認ポップアップを閉じる
        } catch (error) {
            console.error("投稿の削除に失敗しました: ", error);
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
    // クリックされた投稿の詳細ページに遷移する関数
    const handlePostClick = (postId) => {
        router.push(`/PostDetailPage2/${postId}`); // 投稿詳細ページに遷移
    };
    return (
        <div className="container">
            <Sidebar />
            <div className="post_all">
                {posts.map((post) => (
                    <div key={post.id} className="single_post">
                        <div className="post_icon_name">
                            {/* アイコン表示 */}
                            {post.user_icon && (
                                <img
                                    src={post.user_icon}
                                    alt="User Icon"
                                    className="post_icon"
                                />
                            )}
                            {/* ユーザー名表示 */}
                            <p className="post_name">{post.user_name}</p>
                            {user?.uid === post.user_id && (
                                <div className="post_name_distance">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // クリックが投稿内容に伝播しないように設定
                                            setIsDeleteMenuOpen((prev) => ({
                                                ...prev,
                                                [post.id]: !prev[post.id],
                                            }));
                                        }}
                                    >
                                        ⋮
                                    </button>
                                    {isDeleteMenuOpen[post.id] && (
                                        <div
                                            className="post_delete"
                                            onClick={(e) => {
                                                e.stopPropagation(); // クリックが投稿内容に伝播しないように設定
                                                openConfirmPopup(post.id);
                                            }}
                                        >
                                            削除
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 投稿内容のみをクリック可能に設定 */}
                        <div
                            className="post_content_clickable"
                            onClick={() => handlePostClick(post.id)}
                        >
                            <p>{post.content}</p>
                            <p>
                                投稿日:{" "}
                                {post.create_at
                                    ? new Date(post.create_at.seconds * 1000).toLocaleString()
                                    : "不明"}
                            </p>
                        </div>

                        {/* 修正後のいいねボタン */}
                        <div className="post_nice_comment">
                            <button
                                onClick={() =>toggleLike(post.id, post.likes, post.likedByUser)}
                                className="post_like_icon"
                            >
                                {post.likedByUser ? "❤️" : "🤍"} {post.likes} いいね
                            </button>
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
    // return (
    //     <div className="container">
    //         <Sidebar />
    //         <div className="post_all">
    //             {posts.map((post) => (
    //                 <div key={post.id} className="single_post">
    //                     <div className="post_icon_name">
    //                         {/* アイコン表示 */}
    //                         {post.user_icon && (
    //                             <img
    //                                 src={post.user_icon}
    //                                 alt="User Icon"
    //                                 className="post_icon"
    //                             />
    //                         )}
    //                         {/* ユーザー名表示 */}
    //                         <p className="post_name">{post.user_name}</p>
    //                         {user?.uid === post.user_id && (
    //                             <div className="post_name_distance">
    //                                 <button
    //                                     onClick={(e) => {
    //                                         e.stopPropagation(); // クリックが投稿内容に伝播しないように設定
    //                                         setIsDeleteMenuOpen((prev) => ({
    //                                             ...prev,
    //                                             [post.id]: !prev[post.id],
    //                                         }));
    //                                     }}
    //                                 >
    //                                     ⋮
    //                                 </button>
    //                                 {isDeleteMenuOpen[post.id] && (
    //                                     <div
    //                                         className="post_delete"
    //                                         onClick={(e) => {
    //                                             e.stopPropagation(); // クリックが投稿内容に伝播しないように設定
    //                                             openConfirmPopup(post.id);
    //                                         }}
    //                                     >
    //                                         削除
    //                                     </div>
    //                                 )}
    //                             </div>
    //                         )}
    //                     </div>

    //                     {/* 投稿内容のみをクリック可能に設定 */}
    //                     <div
    //                         className="post_content_clickable"
    //                         onClick={() => handlePostClick(post.id)}
    //                     >
    //                         <p>{post.content}</p>
    //                         <p>
    //                             投稿日:{" "}
    //                             {post.create_at
    //                                 ? new Date(post.create_at.seconds * 1000).toLocaleString()
    //                                 : "不明"}
    //                         </p>
    //                     </div>

    //                     <div className="post_nice_comment">
    //                         <button
    //                             className="like-button"
    //                             onClick={() => toggleLike(post.id, post.likes, post.likedByUser)}
    //                         >
    //                             <FaHeart
    //                                 style={{
    //                                     color: post.likedByUser ? "red" : "gray", // いいね済みの場合は赤色、そうでない場合はグレー
    //                                     fontSize: "20px",
    //                                 }}
    //                             />
    //                         </button>
    //                         <p>いいね: {post.likes}</p>
    //                         <p>コメント数: {post.comments_count}</p>
    //                     </div>
    //                     {/* <div className="post_nice_comment">
    //                         <button onClick={() => toggleLike(post.id, post.likes, post.likedByUser)}>
    //                             {post.likedByUser ? "いいねを取り消す" : "ボタン"}
    //                         </button>
    //                         <p>いいね: {post.likes}</p>
    //                         <p>コメント数: {post.comments_count}</p>
    //                     </div> */}
    //                 </div>
    //             ))}
    //         </div>

    //         {/* 削除確認ポップアップ */}
    //         {isConfirmPopupOpen && (
    //             <div className="post_delete_confirmation">
    //                 <p>本当にこの投稿を削除しますか？</p>
    //                 <button onClick={handleDeletePost}>削除</button>
    //                 <button onClick={closeConfirmPopup}>キャンセル</button>
    //             </div>
    //         )}
    //     </div>

    // );
}
//     <div className="continer">
//         <Sidebar />
//         <div className="post_all">
//             {posts.map((post) => (
//                 <div
//                     key={post.id}
//                     className="single_post"
//                     onClick={() => handlePostClick(post.id)} // 投稿がクリックされたときに遷移
//                     // onClick={() => handlePostClick()} // 投稿がクリックされたときに遷移

//                 >
//                     <div className="post_icon_name">
//                         {/* アイコン表示 */}
//                         {post.user_icon && (
//                             <img
//                                 src={post.user_icon} // 投稿データから取得したユーザーのアイコンを表示
//                                 alt="User Icon"
//                                 className="post_icon"
//                             />
//                         )}
//                         {/* ユーザー名表示 */}
//                         <p className="post_name">{post.user_name}</p>
//                         {user?.uid === post.user_id && (
//                             <div className="post_name_distance">
//                                 <button onClick={() => setIsDeleteMenuOpen(prev => ({ ...prev, [post.id]: !prev[post.id] }))}>
//                                     ⋮
//                                 </button>
//                                 {isDeleteMenuOpen[post.id] && (
//                                     <div className="post_delete" onClick={() => openConfirmPopup(post.id)}> 削除</div>
//                                 )}
//                             </div>
//                         )}
//                     </div>
//                     <p>{post.content}</p> {/* 内容 */}
//                     <p>投稿日: {post.create_at ? new Date(post.create_at.seconds * 1000).toLocaleString() : "不明"}</p>
//                     <div className="post_nice_comment">
//                         <button onClick={() => toggleLike(post.id, post.likes, post.likedByUser)}>
//                             {post.likedByUser ? "いいねを取り消す" : "いいね"}
//                         </button>
//                         <p>いいね: {post.likes}</p>
//                         <p>コメント数: {post.comments_count}</p>
//                     </div>
//                 </div>
//             ))}
//         </div>

//         {/* 削除確認ポップアップ */}
//         {isConfirmPopupOpen && (
//             <div className="post_delete_confirmation">
//                 <p>本当にこの投稿を削除しますか？</p>
//                 <button onClick={handleDeletePost}>削除</button>
//                 <button onClick={closeConfirmPopup}>キャンセル</button>
//             </div>
//         )}
//     </div>
// );
// return (
//     <div className="continer">
//         <Sidebar />
//         <div className="post_all">
//             {posts.map((post) => (
//                 <div
//                     key={post.id}
//                     className="single_post"
//                     onClick={() => handlePostClick(post.id)} // 投稿がクリックされたときに遷移
//                 >
//                     <div className="post_icon_name">
//                         {/* アイコン表示 */}
//                         {post.user_icon && (
//                             <img
//                                 src={post.user_icon} // 投稿データから取得したユーザーのアイコンを表示
//                                 alt="User Icon"
//                                 className="post_icon"
//                             />
//                         )}
//                         {/* ユーザー名表示 */}
//                         <p className="post_name">{post.user_name}</p>
//                         {user?.uid === post.user_id && (
//                             <div className="post_name_distance">
//                                 <button onClick={() => setIsDeleteMenuOpen(prev => ({ ...prev, [post.id]: !prev[post.id] }))}>
//                                     ⋮
//                                 </button>
//                                 {isDeleteMenuOpen[post.id] && (
//                                     <div className="post_delete" onClick={() => openConfirmPopup(post.id)}> 削除</div>
//                                 )}
//                             </div>
//                         )}
//                     </div>
//                     <p>{post.content}</p> {/* 内容 */}
//                     <p>投稿日: {post.create_at ? new Date(post.create_at.seconds * 1000).toLocaleString() : "不明"}</p>
//                     <div className="post_nice_comment">
//                         <button onClick={() => toggleLike(post.id, post.likes, post.likedByUser)}>
//                             {post.likedByUser ? "いいねを取り消す" : "いいね"}
//                         </button>
//                         <p>いいね: {post.likes}</p>
//                         <p>コメント数: {post.comments_count}</p>
//                     </div>
//                 </div>
//             ))}
//         </div>

//         {/* 削除確認ポップアップ */}
//         {isConfirmPopupOpen && (
//             <div className="post_delete_confirmation">
//                 <p>本当にこの投稿を削除しますか？</p>
//                 <button onClick={handleDeletePost}>削除</button>
//                 <button onClick={closeConfirmPopup}>キャンセル</button>
//             </div>
//         )}
//     </div>


// const handleDeletePost = async () => {
//     if (postToDelete) {
//         await deleteDoc(doc(db, "post", postToDelete));
//         closeConfirmPopup();
//     }
// };


export default PostPage;