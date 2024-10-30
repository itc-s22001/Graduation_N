'use client';

import { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { storage, db, auth } from '@/app/firebase';
import { useRouter } from 'next/navigation';
import '@/style/profileedit.css';

const EditProfilePage = () => {
    const [uid, setUid] = useState('');
    const [name, setName] = useState('');
    const [profileDescription, setProfileDescription] = useState('');
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    // 既存のユーザーデータを取得
    useEffect(() => {
        const fetchUserData = async () => {
            const user = auth.currentUser;
            if (!user) {
                setError("ユーザーがログインしていません。");
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUid(userData.uid || '');
                    setName(userData.name || '');
                    setProfileDescription(userData.profile_description || '');
                    setProfileImageUrl(userData.profile_image_url || '');
                }
            } catch (error) {
                console.error("ユーザーデータの取得に失敗しました:", error);
                setError("ユーザーデータの取得に失敗しました。");
            }
        };

        fetchUserData();
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setProfileImageFile(e.target.files[0]);
            const fileUrl = URL.createObjectURL(e.target.files[0]);
            setProfileImageUrl(fileUrl);
        }
    };

    const handleFileUpload = async (file) => {
        const storageRef = ref(storage, `profile_images/${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };

    const handleSave = async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                setError("ユーザーがログインしていません。");
                return;
            }

            // 既存のユーザーデータを取得
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const existingData = userDoc.exists() ? userDoc.data() : {};

            // 新しい画像URLを取得（アップロードされた場合のみ）
            let newProfileImageUrl = profileImageUrl;
            if (profileImageFile) {
                newProfileImageUrl = await handleFileUpload(profileImageFile);
            }

            // 既存のデータと新しいデータをマージ
            await setDoc(doc(db, "users", user.uid), {
                ...existingData,  // 既存のデータを展開（created_at, followers, following などを保持）
                uid: existingData.uid || uid, // 既存のUIDを優先
                email: user.email,
                name: name,
                profile_description: profileDescription || existingData.profile_description,
                profile_image_url: newProfileImageUrl || existingData.profile_image_url,
            });

            router.push("/profile");
        } catch (error) {
            console.error("ユーザー情報の更新に失敗しました:", error);
            setError("ユーザー情報の更新に失敗しました。");
        }
    };

    return (
        <div className="profile-edit-container">
            <h1>プロフィール編集</h1>
            <form onSubmit={(e) => e.preventDefault()}>
                <div>
                    <label>名前</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>自己紹介</label>
                    <input
                        type="text"
                        value={profileDescription}
                        onChange={(e) => setProfileDescription(e.target.value)}
                    />
                </div>
                <div>
                    <label>アイコン</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    {profileImageUrl && (
                        <img 
                            src={profileImageUrl} 
                            alt="Preview" 
                            style={{ maxWidth: '100px', marginTop: '10px' }} 
                        />
                    )}
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button onClick={handleSave}>
                    保存
                </button>
            </form>
        </div>
    );
};

export default EditProfilePage;