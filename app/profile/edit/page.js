'use client'; // Client component marker
import { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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

    // プロフィールの初期データを取得する処理
    useEffect(() => {
        const fetchProfileData = async () => {
            const user = auth.currentUser; // 現在のユーザー情報を取得
            if (!user) {
                setError("ユーザーがログインしていません。");
                return;
            }

            try {
                // Firebaseからユーザー情報を取得
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    setUid(userData.uid || '');
                    setName(userData.name || '');
                    setProfileDescription(userData.profile_description || '');
                    setProfileImageUrl(userData.profile_image_url || '');
                } else {
                    setError("ユーザー情報が見つかりません。");
                }
            } catch (error) {
                console.error("ユーザー情報の取得に失敗しました:", error);
                setError("ユーザー情報の取得に失敗しました。");
            }
        };

        fetchProfileData();
    }, []);

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
                console.error("User is not logged in.");
                return;
            }
    
            let newProfileImageUrl = profileImageUrl;
            if (profileImageFile) {
                newProfileImageUrl = await handleFileUpload(profileImageFile);
                console.log("Profile image uploaded successfully:", newProfileImageUrl);
            } else {
                console.log("No new profile image selected.");
            }
    
            // Firestoreのドキュメント参照を取得
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
    
            // 保存するデータの準備
            const dataToSave = {
                uid: uid,
                email: user.email,
                name: name,
                profile_description: profileDescription || "よろしく",
                profile_image_url: newProfileImageUrl,
            };
    
            // ユーザーデータをFirestoreに保存
            await setDoc(userDocRef, dataToSave, { merge: true });
            console.log("User profile data saved successfully:", dataToSave);
    
            // プロフィールページにリダイレクト
            // router.push(`/profile/@${uid}`);
            router.push('/profile');
        } catch (error) {
            console.error("ユーザー情報の更新に失敗しました:", error);
            setError("ユーザー情報の更新に失敗しました。");
        }
    };
    
    

    // キャンセルボタンの処理
    const handleCancel = () => {
        router.push("/profile");
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
                <div className="button-container">
                    <button type="button" onClick={handleCancel}>
                        キャンセル
                    </button>
                    <button onClick={handleSave}>
                        保存
                    </button>
                </div>

            </form>
        </div>
    );
};

export default EditProfilePage;
