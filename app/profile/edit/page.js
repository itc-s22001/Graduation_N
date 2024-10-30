'use client'; // Client component marker
import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { storage, db, auth } from '@/app/firebase'; // Firebaseのインポート
import { useRouter } from 'next/navigation';
import '@/style/profileedit.css';

const EditProfilePage = () => {
    const [uid, setUid] = useState('');
    const [name, setName] = useState('');
    const [profileDescription, setProfileDescription] = useState('');
    const [profileImageFile, setProfileImageFile] = useState(null); // ファイル用
    const [profileImageUrl, setProfileImageUrl] = useState(''); // プレビュー用
    const [error, setError] = useState('');
    const router = useRouter();

    // ファイル選択の処理
    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setProfileImageFile(e.target.files[0]);
            const fileUrl = URL.createObjectURL(e.target.files[0]);
            setProfileImageUrl(fileUrl); // プレビュー表示
        }
    };

    // ファイルのアップロード処理
    const handleFileUpload = async (file) => {
        const storageRef = ref(storage, `profile_images/${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };

    // プロフィールの保存処理
    const handleSave = async () => {
        try {
            const user = auth.currentUser; // 現在のユーザー情報を取得
            if (!user) {
                setError("ユーザーがログインしていません。");
                return;
            }

            let profileImageUrl = "";
            if (profileImageFile) {
                profileImageUrl = await handleFileUpload(profileImageFile);
            }

            // Firebaseにユーザー情報を保存
            await setDoc(doc(db, "users", user.uid), {
                uid: uid, // 新しいユーザーID
                email: user.email,
                name: name, // 入力された名前
                profile_description: profileDescription || "よろしく",
                profile_image_url: profileImageUrl,
            });

            // プロフィール表示ページにリダイレクト
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

