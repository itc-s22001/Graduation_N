"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/app/firebase";
import { addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

const Modal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false); // モーダルの状態管理
    const [content, setContent] = useState("");
    const [user, setUser] = useState(null); // ログイン中のユーザー情報の状態管理

    // 投稿モーダルを開く
    const openModal = () => setIsModalOpen(true);

    // 投稿モーダルを閉じる
    const closeModal = () => setIsModalOpen(false);

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
                        ...userData,
                    });
                }
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // 投稿を保存する関数
    const handlePostSubmit = async (e) => {
        e.preventDefault();
        if (content.trim() === "" || !user) {
            alert("投稿内容を入力してください");
            return;
        }
        try {
            // 新しい投稿を作成し、Firestoreに追加
            const postRef = await addDoc(collection(db, "post"), {
                content: content,
                create_at: serverTimestamp(),
                likes: 0,
                likedBy: [],
                user_id: user.id,
                user_name: user.name || "名無しのユーザー",
                user_icon: user.profile_image_url || "",
                comments_count: 0,
            });

            // 追加した投稿にドキュメントIDを設定する
            await updateDoc(doc(db, "post", postRef.id), {
                post_id: postRef.id
            });

            setContent("");
            closeModal();
        } catch (error) {
            console.error("投稿に失敗しました: ", error);
            alert("投稿に失敗しました。");
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={openModal} style={{ padding: '10px 20px', marginBottom: '20px' }}>投稿する</button>

            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '400px',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                }}>
                    <h2>新しい投稿</h2>
                    <form onSubmit={handlePostSubmit}>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="今何してる？"
                            style={{ width: '100%', padding: '10px', marginBottom: '10px', resize: 'none' }}
                        />
                        <button type="submit" style={{ padding: '10px', width: '100%', backgroundColor: '#1d9bf0', color: 'white', border: 'none', borderRadius: '5px' }}>投稿</button>
                    </form>
                    <button onClick={closeModal} style={{ marginTop: '10px', color: '#555' }}>閉じる</button>
                </div>
            )}
        </div>
    );
};

export default Modal;
// const Modal = () => {
//     const [isModalOpen, setIsModalOpen] = useState(false); // モーダルの状態管理
//     const [content, setContent] = useState("");
//     const [user, setUser] = useState(null); // ログイン中のユーザー情報の状態管理


//     // 投稿モーダルを開く
//     const openModal = () => setIsModalOpen(true);

//     // 投稿モーダルを閉じる
//     const closeModal = () => setIsModalOpen(false);


//     // ログイン中のユーザーを取得
//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//             if (currentUser) {
//                 // users コレクションからemailを基にユーザーデータを取得
//                 const q = query(collection(db, "users"), where("email", "==", currentUser.email));
//                 const userSnapshot = await getDocs(q);

//                 if (!userSnapshot.empty) {
//                     // 取得したユーザーデータを状態にセット
//                     const userData = userSnapshot.docs[0].data();
//                     setUser({
//                         id: userSnapshot.docs[0].id,
//                         ...userData,
//                     });
//                 }
//             } else {
//                 setUser(null);
//             }
//         });

//         return () => unsubscribe();
//     }, []);

//     // 投稿を保存する関数
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
//                 likedBy: [], // いいねしたユーザーのIDリスト
//                 user_id: user.id, // ログインしているユーザーID
//                 user_name: user.name || "名無しのユーザー", // ログインしているユーザー名
//                 user_icon: user.profile_image_url || "", // ログインしているユーザーのアイコン
//                 comments_count: 0, // 初期のコメント数
//             });
//             setContent(""); // 投稿後、フォームをリセット
//             closeModal(); // 投稿後にモーダルを閉じる
//         } catch (error) {
//             console.error("投稿に失敗しました: ", error);
//             alert("投稿に失敗しました。");
//             return;
//         }
//     };
//     return (
//         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
//             {/* 投稿ボタン */}
//             <button onClick={openModal} style={{ padding: '10px 20px', marginBottom: '20px' }}>投稿する</button>

//             {/* 投稿モーダル */}
//             {isModalOpen && (
//                 <div style={{
//                     position: 'fixed',
//                     top: '50%',
//                     left: '50%',
//                     transform: 'translate(-50%, -50%)',
//                     width: '400px',
//                     padding: '20px',
//                     backgroundColor: 'white',
//                     borderRadius: '8px',
//                     boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
//                     zIndex: 1000,
//                 }}>
//                     <h2>新しい投稿</h2>
//                     <form onSubmit={handlePostSubmit}>
//                         <textarea
//                             value={content}
//                             onChange={(e) => setContent(e.target.value)}
//                             placeholder="今何してる？"
//                             style={{ width: '100%', padding: '10px', marginBottom: '10px', resize: 'none' }}
//                         />
//                         <button type="submit" style={{ padding: '10px', width: '100%', backgroundColor: '#1d9bf0', color: 'white', border: 'none', borderRadius: '5px' }}>投稿</button>
//                     </form>
//                     <button onClick={closeModal} style={{ marginTop: '10px', color: '#555' }}>閉じる</button>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Modal;