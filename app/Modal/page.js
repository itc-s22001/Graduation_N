"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, storage } from "@/app/firebase"; // storageもインポート
import { addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const Modal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [content, setContent] = useState("");
    const [user, setUser] = useState(null);
    const [image, setImage] = useState(null);
    const [imageUrl, setImageUrl] = useState(null);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => {
        setContent("");
        setImage(null);
        setImageUrl(null);
        setIsModalOpen(false);
    };

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

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImage(e.target.files[0]);
        }
    };

    const handlePostSubmit = async (e) => {
        e.preventDefault();
        if (content.trim() === "" || !user) {
            alert("投稿内容を入力してください");
            return;
        }
        try {
            let uploadedImageUrl = null;
            if (image) {
                const storageRef = ref(storage, `images/${image.name}`);
                await uploadBytes(storageRef, image);
                uploadedImageUrl = await getDownloadURL(storageRef);
            }

            await addDoc(collection(db, "post"), {
                content: content,
                create_at: serverTimestamp(),
                likes: 0,
                likedBy: [],
                user_id: user.id,
                user_name: user.name || "名無しのユーザー",
                user_icon: user.profile_image_url || "",
                comments_count: 0,
                imageUrl: uploadedImageUrl || "",
            });
            setContent("");
            closeModal();
        } catch (error) {
            console.error("投稿に失敗しました: ", error);
            alert(`投稿に失敗しました: ${error.message}`);
            return;
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
                        <input type="file" onChange={handleImageChange} accept="image/*" style={{ marginTop: '10px' }} />
                        <button type="submit" style={{
                            padding: '10px',
                            width: '100%',
                            backgroundColor: '#1d9bf0',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            marginTop: '10px'
                        }}>投稿
                        </button>
                        <button onClick={closeModal} style={{ marginTop: '10px', color: '#555' }}>閉じる</button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Modal;
