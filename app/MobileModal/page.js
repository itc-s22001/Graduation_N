"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db, auth, storage } from "@/app/firebase"; // storageもインポート
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// 投稿モーダルを管理するコンポーネント
const Modal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [content, setContent] = useState("");
    const [user, setUser] = useState(null);
    const [image, setImage] = useState(null);

    // 投稿モーダルを開く
    const openModal = () => setIsModalOpen(true);


    // 投稿モーダルを閉じる
    const closeModal = () => {
        setIsModalOpen(false);
        setContent("");
        setImage(null);
    };


    // ログイン中のユーザーを取得
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const q = query(collection(db, "users"), where("email", "==", currentUser.email));
                    const userSnapshot = await getDocs(q);
                    if (!userSnapshot.empty) {
                        const userData = userSnapshot.docs[0].data();
                        setUser({
                            id: userSnapshot.docs[0].id,
                            ...userData,
                            uid: userData.uid, // Firebase Authのuidを直接利用
                        });
                    }
                } catch (error) {
                    console.error("ユーザー情報の取得に失敗しました:", error);
                }
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // 画像変更時の処理
    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImage(e.target.files[0]);
        }
    };

    // 投稿の送信処理
    const handlePostSubmit = async (e) => {
        e.preventDefault();

        if (content.trim() === "" || !user || !user.uid) {
            console.error("投稿内容またはユーザー情報が不足しています");
            alert("投稿内容とユーザー情報を確認してください");
            return;
        }

        try {
            // Firestoreに投稿を追加
            const postRef = await addDoc(collection(db, "post"), {
                content: content,
                create_at: serverTimestamp(),
                likes: 0,
                likedBy: [],
                user_id: user.id,
                uid: user.uid,
                user_name: user.name || "名無しのユーザー",
                user_icon: user.profile_image_url || "",
                comments_count: 0,
                email: user.email || "unknown@example.com",
            });

            // 追加した投稿にドキュメントIDを設定
            // await updateDoc(doc(db, "post", postRef.id), {
            //     post_id: postRef.id,
            // });
            await updateDoc(postRef, { post_id: postRef.id });

            setContent("");
            closeModal();
            // 削除確認ポップアップを開く
            closeModal();
        } catch (error) {
            console.error("投稿に失敗しました:", error);
            alert("投稿に失敗しました。");
        }
    };

    return (
        <div>
            {/* 投稿ボタン */}
            <div className="Msidebar-button-container" style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                <button
                    onClick={openModal}
                    style={{
                        background: "none",
                        border: "none",
                        fontSize: "16px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        color: "#333",
                        // padding: "10px",
                        paddingTop: "5px",
                        width: "100%",
                        textAlign: "left",
                        borderRadius: "20px",
                        transition: "background-color 0.3s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(29, 161, 242, 0.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                    <svg
                        className="Mpost-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                    >
                        <path
                            d="M3 17.25V21h3.75L16.88 12.88l-3.75-3.75L3 17.25zm15.41-10.83L20.25 4l-2.58-2.59c-.39-.39-1.02-.39-1.41 0L14.41 3.17l3.75 3.75z"/>
                    </svg>
                </button>
            </div>
            {isModalOpen && (
                <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "400px", padding: "20px", backgroundColor: "white", borderRadius: "8px", zIndex: 1000 }}>
                    <h2>新しい投稿</h2>
                    <form onSubmit={handlePostSubmit}>
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="今何してる？" style={{ width: "100%", padding: "10px", marginBottom: "10px", resize: "none" }} />
                        <input type="file" onChange={handleImageChange} accept="image/*" style={{ marginTop: "10px" }} />
                        <button type="submit" style={{ padding: "10px", width: "100%", backgroundColor: "#1d9bf0", color: "white", border: "none", borderRadius: "5px", marginTop: "10px" }}>投稿</button>
                        <button onClick={closeModal} style={{ marginTop: "10px", color: "#555" }}>閉じる</button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Modal;