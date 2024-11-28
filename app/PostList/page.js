"use client";

import { useState, useEffect } from "react";
import { query, collection, orderBy, onSnapshot, where, getDocs, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../app/firebase";
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation'; // useRouterのインポート
import Sidebar from "../Sidebar/page";
import '@/styles/PostList.css';


const PostPage = () => {
    const router = useRouter(); // useRouterフックを使ってルーターを取得
    const [posts, setPosts] = useState([]); // 投稿データの状態管理
    const [user, setUser] = useState(null); // ログイン中のユーザー情報の状態管理
    const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState({}); // 削除メニューの状態管理
    const [isConfirmPopupOpen, setIsConfirmPopupOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);
    const [loading, setLoading] = useState(true); // Loading state
    //     const [content, setContent] = useState(""); // 投稿内容の状態
    //     const [image, setImage] = useState(null); // 画像の状態

    // ログイン中のユーザーを取得
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const q = query(collection(db, "users"), where("email", "==", currentUser.email));
                const userSnapshot = await getDocs(q);
                if (!userSnapshot.empty) {
                    const userData = userSnapshot.docs[0].data();
                    setUser({
                        id: userSnapshot.docs[0].id,
                        uid: userData.uid,
                        ...userData,
                    });
                }
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    // 時間に基づいた投稿表示のロジック
    useEffect(() => {
        if (!user) {
            setPosts([]); // ユーザーがログインしていない場合は空の配列
            return;
        }

        const q = query(
            collection(db, 'post'),
            orderBy('create_at', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const now = new Date().getTime(); // 現在時刻（ミリ秒）

            // 全ての投稿を取得し、フィルタリング
            const filteredPosts = await Promise.all(
                querySnapshot.docs.map(async (docSnapshot) => {
                    const post = docSnapshot.data();

                    // コメント数を取得
                    const commentsSnapshot = await getDocs(collection(docSnapshot.ref, "comments"));
                    const commentsCount = commentsSnapshot.size;

                    // 通常の投稿とテーマ投稿を区別
                    if (post.isTheme) {
                        // テーマ投稿は指定時間以降のみ表示
                        return post.scheduled_at && post.scheduled_at <= now
                            ? {
                                id: docSnapshot.id,
                                ...post,
                                likedByUser: (post.likedBy || []).includes(user?.uid),
                                comments_count: commentsCount,
                            }
                            : null;
                    } else {
                        // 通常の投稿は常に表示
                        return {
                            id: docSnapshot.id,
                            ...post,
                            likedByUser: (post.likedBy || []).includes(user?.uid),
                            comments_count: commentsCount,
                        };
                    }
                })
            );

            // nullを除外し、投稿日時の降順でソート
            const validPosts = filteredPosts
                .filter(post => post !== null);

            setPosts(validPosts);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, 'post'), orderBy('scheduled_at', 'asc')); // 投稿の表示順を指定時間でソート

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const now = new Date().getTime(); // 現在時刻
            const postData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                likedByUser: doc.data().likedBy && user?.uid && doc.data().likedBy.includes(user.uid)
            })).filter(post => {
                // scheduled_atが現在時刻より後なら非表示
                const scheduledTime = post.scheduled_at;
                return !post.isTheme || (scheduledTime && scheduledTime <= now);
            });

            setPosts(postData); // フィルタリングしたデータをセット
        });

        return () => unsubscribe(); // クリーンアップ
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
            await deleteDoc(doc(db, "post", postToDelete));
            closeConfirmPopup();
        }
    };

    // いいねボタンの処理
    const toggleLike = async (postId) => {
        if (!user) return; // ユーザーがログインしていない場合は終了

        const postRef = doc(db, "post", postId);

        try {
            // Firestore から最新の投稿データを取得
            const postSnapshot = await getDoc(postRef);

            if (!postSnapshot.exists()) {
                console.error("指定された投稿が見つかりません。");
                return;
            }

            const postData = postSnapshot.data();

            // Firestore から「いいね」の状態を確認
            const currentLikes = postData.likes || 0;
            const likedBy = postData.likedBy || [];
            const likedByUser = likedBy.includes(user.uid);

            // 「いいね」をトグル（追加または解除）
            const newLikes = likedByUser ? currentLikes - 1 : currentLikes + 1;
            const updatedLikedBy = likedByUser
                ? likedBy.filter(uid => uid !== user.uid) // 解除する場合
                : [...likedBy, user.uid]; // 追加する場合

            // Firestore を更新
            await updateDoc(postRef, {
                likes: newLikes,
                likedBy: updatedLikedBy,
            });

            console.log("いいねが更新されました！");
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
                {loading ? (
                    <div>読み込み中...</div>
                ) : posts.length === 0 ? (
                    <div>まだ投稿がありません。</div>
                ) : (
                    posts.map((post) => (
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
                                {/*投稿削除 */}
                                {user?.uid === post.uid && (
                                    <div className="post_name_distance">
                                        <button onClick={() => setIsDeleteMenuOpen(prev => ({ ...prev, [post.id]: !prev[post.id] }))}>
                                            ⋮
                                        </button>
                                        {isDeleteMenuOpen[post.id] && (
                                            <div className="post_delete"
                                                onClick={() => openConfirmPopup(post.id)}
                                            >
                                                削除
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

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

                            <div className="post_nice_comment">
                                <button
                                    onClick={() => toggleLike(post.id, post.likes, post.likedByUser)}
                                    className="post_like_icon"
                                >
                                    {post.likedByUser ? "❤️" : "🤍"} {post.likes} いいね
                                </button>
                                <p>コメント数: {post.comments_count}</p>
                            </div>
                        </div>
                    ))
                )}
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


// "use client";

// import { useState, useEffect } from "react";
// import { query, collection, orderBy, onSnapshot, where, getDocs, updateDoc, deleteDoc, doc, getDoc, writeBatch } from "firebase/firestore";
// import { db, auth } from "../firebase";
// import { onAuthStateChanged } from 'firebase/auth';
// import { useRouter } from 'next/navigation'; // useRouterのインポート
// import { FaHeart } from "react-icons/fa";  // ハートアイコンをインポート
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase Storageのインポート
// import { storage } from '../firebase'; // 追加: Firebase Storageの初期化をインポート
// import Searchdummy from "../Searchdummy/page";
// import Sidebar from "../Sidebar/page";
// import '@/styles/PostList.css';


// const PostPage = () => {
//     const router = useRouter(); // useRouterフックを使ってルーターを取得
//     const [posts, setPosts] = useState([]); // 投稿データの状態管理
//     const [user, setUser] = useState(null); // ログイン中のユーザー情報の状態管理
//     const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState({}); // 削除メニューの状態管理
//     const [isConfirmPopupOpen, setIsConfirmPopupOpen] = useState(false);
//     const [postToDelete, setPostToDelete] = useState(null);
//     const [loading, setLoading] = useState(true); // Loading state
//     //     const [content, setContent] = useState(""); // 投稿内容の状態
//     //     const [image, setImage] = useState(null); // 画像の状態

//     // ログイン中のユーザーを取得
//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//             if (currentUser) {
//                 const q = query(collection(db, "users"), where("email", "==", currentUser.email));
//                 const userSnapshot = await getDocs(q);
//                 if (!userSnapshot.empty) {
//                     const userData = userSnapshot.docs[0].data();
//                     setUser({
//                         id: userSnapshot.docs[0].id,
//                         uid: userData.uid,
//                         ...userData,
//                     });
//                 }
//             } else {
//                 setUser(null);
//             }
//         });

//         return () => unsubscribe();
//     }, []);
//     // useEffect(() => {
//     //     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//     //         if (currentUser) {
//     //             const q = query(collection(db, "users"), where("email", "==", currentUser.email));
//     //             const userSnapshot = await getDocs(q);
//     //             if (!userSnapshot.empty) {
//     //                 const userData = userSnapshot.docs[0].data();
//     //                 setUser({
//     //                     id: userSnapshot.docs[0].id,
//     //                     ...userData,
//     //                 });
//     //             }
//     //         } else {
//     //             setUser(null);
//     //         }
//     //     });

//     //     return () => unsubscribe();
//     // }, []);

//     // 投稿データをリアルタイムで取得
//     useEffect(() => {
//         const q = query(collection(db, "post"), orderBy("create_at", "desc"));
//         const unsubscribe = onSnapshot(q, async (snapshot) => {
//             try {
//                 // 全ての投稿データを非同期で処理
//                 const postData = await Promise.all(
//                     snapshot.docs.map(async (docSnapshot) => {
//                         const post = docSnapshot.data();

//                         // UIDが存在しない場合はログ出力してスキップ
//                         if (!post.email) {
//                             console.error("投稿に関連するユーザーUIDが見つかりません");
//                             return null;
//                         }

//                         // ユーザー情報を取得
//                         const userDocRef = doc(db, "users", post.uid);
//                         const userDoc = await getDoc(userDocRef);
//                         let userData = {};
//                         if (userDoc.exists()) {
//                             userData = userDoc.data();
//                         } else {
//                             console.warn(`ユーザーデータが見つかりません: UID=${post.email}`);
//                         }

//                         // コメント数を取得
//                         const commentsSnapshot = await getDocs(
//                             collection(docSnapshot.ref, "comments")
//                         );
//                         const commentsCount = commentsSnapshot.size;

//                         // データ構造を作成
//                         return {
//                             id: docSnapshot.id,
//                             ...post,
//                             user_name: userData.name || "名無し", // デフォルト名
//                             user_icon: userData.profile_image_url || "/default_icon.png", // デフォルトアイコン
//                             likedByUser: (post.likedBy || []).includes(user?.id), // いいね判定
//                             comments_count: commentsCount, // コメント数
//                         };
//                     })
//                 );

//                 // 無効データを除外して投稿データをセット
//                 setPosts(postData.filter((post) => post !== null));
//             } catch (error) {
//                 console.error("データの取得中にエラーが発生しました:", error);
//             }
//         });

//         return () => unsubscribe();
//     }, [user]);
//     // useEffect(() => {
//     //     const q = query(collection(db, "post"), orderBy("create_at", "desc"));
//     //     const unsubscribe = onSnapshot(q, async (snapshot) => {
//     //         const postData = await Promise.all(
//     //             snapshot.docs.map(async (docSnapshot) => {
//     //                 const post = docSnapshot.data();
//     //                 // console.log(post.uid); // 確認用ログ

//     //                 // post.uid が存在するかを確認
//     //                 if (!post.uid) {
//     //                     console.error("投稿に関連するユーザーUIDが見つかりません");
//     //                     return null; // UIDがない場合は処理をスキップ
//     //                 }

//     //                 // ユーザーデータを取得
//     //                 const userDocRef = doc(db, "users", post.uid); // user_id を uid に変更
//     //                 const userDoc = await getDoc(userDocRef);
//     //                 let userData = {};
//     //                 if (userDoc.exists()) {
//     //                     userData = userDoc.data();
//     //                 }

//     //                 // コメント数を取得
//     //                 const commentsSnapshot = await getDocs(collection(docSnapshot.ref, "comments"));
//     //                 const commentsCount = commentsSnapshot.size;

//     //                 return {
//     //                     id: docSnapshot.id,
//     //                     ...post,
//     //                     user_name: userData.name || "名無し", // デフォルトの名前を設定
//     //                     user_icon: userData.profile_image_url || "/default_icon.png", // デフォルトアイコンを設定
//     //                     likedByUser: (post.likedBy || []).includes(user?.id), // 現在のユーザーがいいねしたかどうか
//     //                     comments_count: commentsCount, // コメント数
//     //                 };
//     //             })
//     //         );

//     //         setPosts(postData.filter(post => post !== null)); // null を除外して投稿データをセット
//     //     });

//     //     return () => unsubscribe();
//     // }, [user]);

//     // useEffect(() => {
//     //     const q = query(collection(db, "post"), orderBy("create_at", "desc"));
//     //     const unsubscribe = onSnapshot(q, async (snapshot) => {
//     //         const postData = await Promise.all(
//     //             snapshot.docs.map(async (docSnapshot) => {
//     //                 const post = docSnapshot.data();

//     //                 // ユーザーデータを取得
//     //                 const userDocRef = doc(db, "users", post.user_id);
//     //                 const userDoc = await getDoc(userDocRef);
//     //                 let userData = {};
//     //                 if (userDoc.exists()) {
//     //                     userData = userDoc.data();
//     //                 }

//     //                 // コメント数を取得
//     //                 const commentsSnapshot = await getDocs(collection(docSnapshot.ref, "comments"));
//     //                 const commentsCount = commentsSnapshot.size;

//     //                 return {
//     //                     id: docSnapshot.id,
//     //                     ...post,
//     //                     user_name: userData.name || "名無し",
//     //                     user_icon: userData.profile_image_url || "/default_icon.png",
//     //                     likedByUser: (post.likedBy || []).includes(user?.id),
//     //                     comments_count: commentsCount, // コメント数を追加
//     //                 };
//     //             })
//     //         );

//     //         setPosts(postData); // 投稿データをセット    
//     //     });
//     //     return () => unsubscribe();
//     // }, [user]);

//     // 削除確認ポップアップを開く
//     const openConfirmPopup = (post) => {
//         setPostToDelete(post);
//         setDeleteError(""); // エラーをリセット
//         setIsConfirmPopupOpen(true);
//     };

//     // 削除確認ポップアップを閉じる
//     const closeConfirmPopup = () => {
//         setIsConfirmPopupOpen(false);
//         setPostToDelete(null);
//     };

//     // 投稿の削除処理
//     const handleDeletePost = async () => {
//         if (!postToDelete) return;

//         const postRef = doc(db, "post", postToDelete.id);
//         const batch = writeBatch(db);

//         try {
//             // 投稿を削除
//             batch.delete(postRef);

//             // 関連コメントを削除
//             const commentsSnapshot = await getDocs(collection(postRef, "comments"));
//             commentsSnapshot.forEach((commentDoc) => {
//                 batch.delete(commentDoc.ref);
//             });

//             await batch.commit(); // バッチを実行
//             closeConfirmPopup(); // ポップアップを閉じる
//         } catch (error) {
//             console.error("投稿の削除に失敗しました: ", error);
//             setDeleteError("削除に失敗しました。もう一度お試しください。");
//         }
//     };
//     // const openConfirmPopup = (postId) => {
//     //     setPostToDelete(postId);
//     //     setIsConfirmPopupOpen(true);
//     // };

//     // const closeConfirmPopup = () => {
//     //     setIsConfirmPopupOpen(false);
//     //     setPostToDelete(null);
//     // };


//     // const handleDeletePost = async () => {
//     //     if (!postToDelete) return;

//     //     // バッチ処理を開始
//     //     const batch = writeBatch(db);
//     //     const postRef = doc(db, "post", postToDelete);

//     //     // 1. 投稿ドキュメントの削除を追加
//     //     batch.delete(postRef);

//     //     // 2. 関連するコメントを取得して削除をバッチに追加
//     //     const commentsSnapshot = await getDocs(collection(postRef, "comments"));
//     //     commentsSnapshot.forEach((commentDoc) => {
//     //         batch.delete(commentDoc.ref);
//     //     });

//     //     // 3. バッチのコミット（全ての削除を実行）
//     //     try {
//     //         await batch.commit();
//     //         console.log("投稿および関連するコメントが削除されました");
//     //         closeConfirmPopup(); // 削除確認ポップアップを閉じる
//     //     } catch (error) {
//     //         console.error("投稿の削除に失敗しました: ", error);
//     //     }
//     // };

//     // いいねボタンの処理
//     const toggleLike = async (postId) => {
//         if (!user) return; // ユーザーがログインしていない場合は終了

//         const postRef = doc(db, "post", postId);

//         try {
//             // Firestore から最新の投稿データを取得
//             const postSnapshot = await getDoc(postRef);

//             if (!postSnapshot.exists()) {
//                 console.error("指定された投稿が見つかりません。");
//                 return;
//             }

//             const postData = postSnapshot.data();

//             // Firestore から「いいね」の状態を確認
//             const currentLikes = postData.likes || 0;
//             const likedBy = postData.likedBy || [];
//             const likedByUser = likedBy.includes(user.uid);

//             // 「いいね」をトグル（追加または解除）
//             const newLikes = likedByUser ? currentLikes - 1 : currentLikes + 1;
//             const updatedLikedBy = likedByUser
//                 ? likedBy.filter(uid => uid !== user.uid) // 解除する場合
//                 : [...likedBy, user.uid]; // 追加する場合

//             // Firestore を更新
//             await updateDoc(postRef, {
//                 likes: newLikes,
//                 likedBy: updatedLikedBy,
//             });

//             console.log("いいねが更新されました！");
//         } catch (error) {
//             console.error("いいねの更新に失敗しました: ", error);
//         }
//     };
//     // const toggleLike = async (postId, currentLikes, likedByUser) => {
//     //     if (!user) return;

//     //     const postRef = doc(db, "post", postId);
//     //     const post = posts.find(post => post.id === postId);
//     //     if (!post || !Array.isArray(post.likedBy)) return;

//     //     const newLikes = likedByUser ? currentLikes - 1 : currentLikes + 1;
//     //     const updatedLikedBy = likedByUser
//     //         ? post.likedBy.filter(uid => uid !== user.id)
//     //         : [...post.likedBy, user.id];

//     //     try {
//     //         await updateDoc(postRef, {
//     //             likes: newLikes,
//     //             likedBy: updatedLikedBy,
//     //         });
//     //     } catch (error) {
//     //         console.error("いいねの更新に失敗しました: ", error);
//     //     }
//     // };
//     // クリックされた投稿の詳細ページに遷移する関数
//     const handlePostClick = (postId) => {
//         router.push(`/PostDetailPage2/${postId}`); // 投稿詳細ページに遷移
//     };
//     return (
//         <div className="container">
//             <Sidebar />
//             <div className="post_all">
//                 {posts.map((post) => (
//                     <div key={post.id} className="single_post">
//                         <div className="post_icon_name">
//                             {/* アイコン表示 */}
//                             {post.user_icon && (
//                                 <img
//                                     src={post.user_icon}
//                                     alt="User Icon"
//                                     className="post_icon"
//                                 />
//                             )}
//                             {/* ユーザー名表示 */}
//                             <p className="post_name">{post.user_name}</p>
//                             {/* 削除ボタン（投稿者のみ表示） */}
//                             {user?.uid === post.user_id && (
//                                 <button
//                                     onClick={(e) => {
//                                         e.stopPropagation();
//                                         openConfirmPopup(post);
//                                     }}
//                                     className="delete_button"
//                                 >
//                                     🗑️
//                                 </button>
//                             )}
//                             {/* {user?.uid === post.user_id && (
//                                 <div className="post_name_distance button">
//                                     <button
//                                         onClick={(e) => {
//                                             e.stopPropagation(); // クリックが投稿内容に伝播しないように設定
//                                             setIsDeleteMenuOpen((prev) => ({
//                                                 ...prev,
//                                                 [post.id]: !prev[post.id],
//                                             }));
//                                         }}
//                                     >
//                                         d
//                                     </button>
//                                     {isDeleteMenuOpen[post.id] && (
//                                         <div
//                                             className="post_delete"
//                                             onClick={(e) => {
//                                                 e.stopPropagation(); // クリックが投稿内容に伝播しないように設定
//                                                 openConfirmPopup(post.id);
//                                             }}
//                                         >
//                                             削除
//                                         </div>
//                                     )}
//                                 </div>
//                             )} */}
//                         </div>

//                         {/* 投稿内容のみをクリック可能に設定 */}
//                         <div
//                             className="post_content_clickable"
//                             onClick={() => handlePostClick(post.id)}
//                         >
//                             <p>{post.content}</p>
//                             <p>
//                                 投稿日:{" "}
//                                 {post.create_at
//                                     ? new Date(post.create_at.seconds * 1000).toLocaleString()
//                                     : "不明"}
//                             </p>
//                         </div>

//                         {/* 修正後のいいねボタン */}
//                         <div className="post_nice_comment">
//                             <button
//                                 onClick={() => toggleLike(post.id, post.likes, post.likedByUser)}
//                                 className="post_like_icon"
//                             >
//                                 {post.likedByUser ? "❤️" : "🤍"} {post.likes} いいね
//                             </button>
//                             <p>コメント数: {post.comments_count}</p>
//                         </div>
//                     </div>
//                 ))}
//             </div>

//             {/* 削除確認ポップアップ */}

//             {isConfirmPopupOpen && (
//                 <div className="popup_overlay">
//                     <div className="popup_content">
//                         <p>以下の投稿を削除しますか？</p>
//                         <div className="post_preview">
//                             <p>{postToDelete?.content}</p>
//                         </div>
//                         {deleteError && <p className="error_message">{deleteError}</p>}
//                         <div className="popup_buttons">
//                             <button onClick={handleDeletePost} className="delete_confirm_button">
//                                 削除
//                             </button>
//                             <button onClick={closeConfirmPopup} className="cancel_button">
//                                 キャンセル
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//             {/* {isConfirmPopupOpen && (
//                 <div className="post_delete_confirmation">
//                     <p>本当にこの投稿を削除しますか？</p>
//                     <button onClick={handleDeletePost}>削除</button>
//                     <button onClick={closeConfirmPopup}>キャンセル</button>
//                 </div>
//             )} */}
//         </div>
//     );
// };
// export default PostPage;
