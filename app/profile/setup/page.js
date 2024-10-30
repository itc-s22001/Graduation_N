'use client'; // Client component marker

import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { storage, db, auth } from '@/app/firebase'; // Firebaseのインポート
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

    // ファイル選択の処理
    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setProfileImageFile(e.target.files[0]);
        }
    };

    // ファイルのアップロード処理
    const handleFileUpload = async (file) => {
        const storageRef = ref(storage, `profile_images/${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };

    // UIDの重複チェック
    const checkUidExists = async (uidToCheck) => {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("uid", "==", uidToCheck));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    };

    // プロフィールの保存処理
    const handleSave = async () => {
        if (!name || !uid) {
            setError("ユーザーIDと名前は必須項目です。");
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                setError("ユーザーがログインしていません。");
                return;
            }

            // UIDの重複チェック
            const uidExists = await checkUidExists(uid);
            if (uidExists) {
                setError("このUIDはすでに使用されています。");
                return;
            }

            let newProfileImageUrl = profileImageUrl;
            if (profileImageFile) {
                newProfileImageUrl = await handleFileUpload(profileImageFile);
            }

            // Firestore ドキュメント参照の取得
            const userDocRef = doc(db, "users", user.uid);

            // ドキュメントスナップショットの取得
            const userDocSnap = await getDoc(userDocRef);

            // 保存するデータの準備
            const dataToSave = {
                uid: uid,
                email: user.email,
                name: name,
                profile_description: profileDescription || "よろしくお願いします",
                profile_image_url: newProfileImageUrl,
                created_at: userDocSnap.exists() ? userDocSnap.data().created_at : serverTimestamp()
            };

            // Firestore にデータを保存
            await setDoc(userDocRef, dataToSave, { merge: true });
            console.log("ユーザープロファイルが正常に保存されました:", dataToSave);

            // プロファイルページにリダイレクト
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
                    <label>ユーザーID</label>
                    <input
                        type="text"
                        value={uid}
                        onChange={(e) => setUid(e.target.value)}
                        required
                    />
                </div>
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
                        <img src={profileImageUrl} alt="Preview" style={{ maxWidth: '100px', marginTop: '10px' }} />
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
