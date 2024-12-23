"use client";
import React, { useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, storage } from "@/app/firebase";
import { addDoc, collection, doc, updateDoc, arrayUnion, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import '../../style/CommunityModal.css'

const CommunityModal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [communityName, setCommunityName] = useState("");
    const [description, setDescription] = useState("");
    const [communityIcon, setCommunityIcon] = useState(null);
    const [isPublic, setIsPublic] = useState(true);
    const [category, setCategory] = useState("おもしろ");
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
    const handleCreateCommunity = async (e) => {
        e.preventDefault();
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
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    const communityRef = await addDoc(collection(db, "communities"), {
                        community_NOP: 0,
                        community_name: communityName,
                        community_profile: description,
                        community_public_private: isPublic ? "公開" : "非公開",
                        community_image_url: downloadURL,
                        Cate: category,
                        created_at: new Date().toISOString(),
                        created_by: auth.currentUser.uid,
                    });
                    await updateDoc(communityRef, {
                        community_id: communityRef.id,
                    });
                    const userCommunityRef = doc(db, "users", auth.currentUser.uid);
                    await updateDoc(userCommunityRef, {
                        joined_communities: arrayUnion(communityRef.id),
                    });
                    const communityDocRef = doc(db, "community_members", communityRef.id);
                    await setDoc(communityDocRef, {
                        members: [auth.currentUser.uid],
                        community_NOP: 1,
                    });
                    router.push(`/CommunityPost/${communityRef.id}`);
                    setCommunityName("");
                    setDescription("");
                    setCommunityIcon(null);
                    setUploading(false);
                    closeModal();
                } catch (error) {
                    console.error("コミュニティ作成エラー:", error);
                    setUploading(false);
                }
            }
        );
    };
        return (
            <div className="community-container">
                <div className="create-button-container">
                    <button
                        onClick={openModal}
                        className="create-button"
                    >
                        コミュニティ作成
                    </button>
                </div>
                {isModalOpen && (
                    <>
                        <div className="modal-overlay" onClick={closeModal} />
                        <div className="modal-content">
                            <h2>新しいコミュニティを作成</h2>
                            <form onSubmit={handleCreateCommunity}>
                                <input
                                    type="text"
                                    value={communityName}
                                    onChange={(e) => setCommunityName(e.target.value)}
                                    placeholder="コミュニティ名"
                                    className="input-field"
                                />
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="コミュニティの説明"
                                    className="textarea-field"
                                />
                                <textarea
                                    value={category}
                                    onChange={(e) => {
                                        if (e.target.value.length <= 10) {
                                            setCategory(e.target.value);
                                        }
                                    }}
                                    placeholder="コミュニティのカテゴリー"
                                    className="textarea-category"
                                    maxLength={10}
                                />
                                <div className="checkbox-container">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={isPublic}
                                            onChange={(e) => setIsPublic(e.target.checked)}
                                        />
                                        公開
                                    </label>
                                </div>
                                <input
                                    type="file"
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="file-input"
                                />
                                <button
                                    type="submit"
                                    className={`submit-button ${uploading ? 'disabled' : ''}`}
                                    disabled={uploading}
                                >
                                    {uploading ? "アップロード中..." : "作成"}
                                </button>
                                <button
                                    onClick={closeModal}
                                    className="close-button"
                                >
                                    閉じる
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        );
    };
export default CommunityModal;