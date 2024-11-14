"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/app/firebase";
import { addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";

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

    // 投稿を保存する関数
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
            closeModal(); // 投稿後にモーダルを閉じる
        } catch (error) {
            console.error("投稿に失敗しました: ", error);
            alert("投稿に失敗しました。");
            return;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {/* 投稿ボタン */}
            <div 
            className="sidebar-button-container" 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0px', width: '100%' }}  // marginBottomを0に
        >
            {/* アイコン */}
            <svg 
                className="post-icon" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                style={{ width: '24px', height: '24px', fill: '#333', cursor: 'pointer' }}
            >
                <path d="M3 17.25V21h3.75L16.88 12.88l-3.75-3.75L3 17.25zm15.41-10.83L20.25 4l-2.58-2.59c-.39-.39-1.02-.39-1.41 0L14.41 3.17l3.75 3.75z" />
            </svg>

            {/* 投稿ボタン */}
            <button 
                onClick={openModal} 
                style={{ 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '16px',  
                    fontWeight: 'bold', 
                    cursor: 'pointer', 
                    color: '#333', 
                    padding: '10px',  // paddingを0に
                    width: '100%',  
                    textAlign: 'left', 
                    borderRadius: '20px',  
                    transition: 'background-color 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(29, 161, 242, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                投稿する
            </button>
        </div>

    
            {/* 投稿モーダル */}
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