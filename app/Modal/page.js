"use client";


import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db, auth, storage } from "@/app/firebase"; // storageもインポート
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


// 投稿モーダルを管理するコンポーネント
const Modal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [content, setContent] = useState("");
    const [user, setUser] = useState(null);
    const [image, setImage] = useState(null);
    const [uploading, setUploading] = useState(false);


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


    // 画像をFirebase Storageにアップロードする関数
    const uploadImage = async () => {
        if (!image) return null;


        try {
            const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${image.name}`);
            await uploadBytes(imageRef, image);
            const imageUrl = await getDownloadURL(imageRef);
            return imageUrl;
        } catch (error) {
            console.error("画像アップロードエラー:", error);
            return null;
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


        setUploading(true);


        try {
            // 画像をアップロードしてURLを取得
            const imageUrl = await uploadImage();


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
                image_url: imageUrl || null, // 画像URLを保存
            });


            setContent("");
            closeModal();
        } catch (error) {
            console.error("投稿に失敗しました:", error);
            alert("投稿に失敗しました。");
        } finally {
            setUploading(false);
        }
    };


    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            {/* 投稿ボタン */}
            <div className="sidebar-button-container" style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                {/*<svg*/}
                {/*    className="post-icon"*/}
                {/*    xmlns="http://www.w3.org/2000/svg"*/}
                {/*    viewBox="0 0 24 24"*/}
                {/*    style={{ width: "24px", height: "24px", fill: "#333", cursor: "pointer" }}*/}
                {/*>*/}
                {/*    <path d="M3 17.25V21h3.75L16.88 12.88l-3.75-3.75L3 17.25zm15.41-10.83L20.25 4l-2.58-2.59c-.39-.39-1.02-.39-1.41 0L14.41 3.17l3.75 3.75z" />*/}
                {/*</svg>*/}
                <button
                    onClick={openModal}
                    style={{
                        backgroundColor: "#1d9bf0",   // Twitterの青色
                        border: "none",
                        color: "white",               // プラス記号を白に
                        fontSize: "32px",             // プラス記号を大きくする
                        width: "60px",                // ボタンの幅
                        height: "60px",               // ボタンの高さ
                        borderRadius: "50%",          // 丸型にする
                        display: "flex",              // フレックスボックスで中央に配置
                        justifyContent: "center",     // プラス記号を中央に
                        alignItems: "center",         // プラス記号を中央に
                        cursor: "pointer",           // カーソルをポインターに
                        transition: "background-color 0.3s ease, transform 0.2s ease", // ホバー時の背景色と縮小効果
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(29, 161, 242, 0.7)"; // ホバー時に背景色を変える
                        e.currentTarget.style.transform = "scale(1.1)"; // ホバー時に少し大きくなる
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#1d9bf0"; // 元の色に戻す
                        e.currentTarget.style.transform = "scale(1)"; // 元のサイズに戻す
                    }}
                >
                    +
                </button>
            </div>
            {isModalOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: "0",
                        left: "0",
                        right: "0",
                        bottom: "0",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",  // 背景を暗くする
                        zIndex: 999,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center"
                    }}
                    onClick={closeModal}  // モーダル外をクリックしたら閉じる
                >
                    <div
                        style={{
                            position: "relative",
                            width: "400px",
                            padding: "20px",
                            backgroundColor: "white",
                            borderRadius: "8px",
                            zIndex: 1000,
                            boxSizing: "border-box"
                        }}
                        onClick={(e) => e.stopPropagation()}  // モーダル内のクリックイベントが親に伝わらないようにする
                    >
                        <h2>新しい投稿</h2>
                        <form onSubmit={handlePostSubmit}>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="今何してる？"
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    marginBottom: "10px",
                                    resize: "none",
                                    borderRadius: "5px",
                                    boxSizing: "border-box"
                                }}
                            />
                            <input
                                type="file"
                                onChange={handleImageChange}
                                accept="image/*"
                                style={{
                                    marginTop: "10px",
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "5px",
                                    boxSizing: "border-box"
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    padding: "10px",
                                    width: "100%",
                                    backgroundColor: "#1d9bf0",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "5px",
                                    marginTop: "10px"
                                }}
                            >
                                投稿
                            </button>
                            <button
                                type="button"
                                onClick={closeModal}
                                style={{
                                    marginTop: "10px",
                                    color: "#555",
                                    background: "none",
                                    border: "none",
                                    fontSize: "16px"
                                }}
                            >
                                閉じる
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Modal;