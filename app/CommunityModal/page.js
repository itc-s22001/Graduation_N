"use client";

import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, storage } from "@/app/firebase";
import { addDoc, collection, doc, updateDoc, arrayUnion, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";

const CommunityModal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [communityName, setCommunityName] = useState("");
    const [description, setDescription] = useState("");
    const [communityIcon, setCommunityIcon] = useState(null);
    const [isPublic, setIsPublic] = useState(true); // 公開・非公開設定
    const [uploading, setUploading] = useState(false);
    const router = useRouter();

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => {
        setCommunityName("");
        setDescription("");
        setCommunityIcon(null);
        setIsModalOpen(false);
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setCommunityIcon(e.target.files[0]);
        }
    };

    const handleCreateCommunity = async () => {
        if (!communityName || !description) {
            alert("コミュニティ名と説明文は必須です");
            return;
        }

        if (!communityIcon) {
            alert("アイコン画像をアップロードしてください");
            return;
        }

        const imageRef = ref(storage, `community_images/${communityIcon.name}`);
        const uploadTask = uploadBytesResumable(imageRef, communityIcon);

        setUploading(true);

        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload is ${progress}% done`);
            },
            (error) => {
                console.error("画像のアップロードエラー:", error);
                setUploading(false);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                try {
                    const communityRef = await addDoc(collection(db, "communities"), {
                        community_NOP: 0,
                        community_name: communityName,
                        community_profile: description,
                        community_public_private: isPublic ? "公開" : "非公開",
                        community_image_url: downloadURL,
                        created_at: new Date().toISOString(),
                        created_by: auth.currentUser.uid,
                    });

                    await updateDoc(communityRef, {
                        community_id: communityRef.id,
                    });

                    // 作成者を自動的に参加させる
                    const userCommunityRef = doc(db, "users", auth.currentUser.uid);
                    await updateDoc(userCommunityRef, {
                        joined_communities: arrayUnion(communityRef.id),
                    });

                    const communityDocRef = doc(db, "community_members", communityRef.id);
                    await setDoc(communityDocRef, {
                        members: [auth.currentUser.uid],
                        community_NOP: 1,
                    });

                    setCommunityName("");
                    setDescription("");
                    setCommunityIcon(null);
                    setUploading(false);
                    closeModal();

                    router.push(`/CommunityPost/${communityRef.id}`);
                } catch (error) {
                    console.error("コミュニティ作成エラー:", error);
                    setUploading(false);
                }
            }
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={openModal} style={{ padding: '10px 20px', marginBottom: '20px' }}>コミュニティ作成</button>

            {isModalOpen && (
                <>
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        zIndex: 1000,
                    }} onClick={closeModal}/>

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
                        zIndex: 100000,
                    }}>
                        <h2>新しいコミュニティを作成</h2>
                        <form onSubmit={(e) => { e.preventDefault(); handleCreateCommunity(); }}>
                            <input
                                type="text"
                                value={communityName}
                                onChange={(e) => setCommunityName(e.target.value)}
                                placeholder="コミュニティ名"
                                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                            />
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="コミュニティの説明"
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
                            }}>作成</button>
                            <button onClick={closeModal} style={{ marginTop: '10px', color: '#555' }}>閉じる</button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default CommunityModal;
