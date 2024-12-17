'use client';
import { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { storage, db, auth } from '@/app/firebase';
import { useRouter } from 'next/navigation';
import '@/style/profileedit.css';
import Image from 'next/image';

const EditProfilePage = () => {
    const [customUid, setCustomUid] = useState(''); // ユーザーが設定する独自のID
    const [name, setName] = useState('');
    const [profileDescription, setProfileDescription] = useState('');
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    // 初期データの読み込み
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    setError("ログインしていません。");
                    return;
                }

                // ユーザードキュメントを確認
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    // 既存のデータがある場合は読み込む
                    setCustomUid(userData.uid || '');
                    setName(userData.name || '');
                    setProfileDescription(userData.profile_description || '');
                    setProfileImageUrl(userData.profile_image_url || '');
                }
            } catch (error) {
                console.error("データの読み込みに失敗しました:", error);
                setError("プロフィール情報の読み込みに失敗しました。");
            }
        };

        loadUserData();
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setProfileImageFile(e.target.files[0]);
            const fileUrl = URL.createObjectURL(e.target.files[0]);
            setProfileImageUrl(fileUrl);
        }
    };

    const handleFileUpload = async (file) => {
        const storageRef = ref(storage, `profile_images/${auth.currentUser.uid}/${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };

    // カスタムUIDの重複チェック
    const checkCustomUidExists = async (uidToCheck) => {
        if (!uidToCheck) return false;

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("uid", "==", uidToCheck));
        const querySnapshot = await getDocs(q);

        // 自分のドキュメント以外で重複がないかチェック
        return querySnapshot.docs.some(doc => doc.id !== auth.currentUser?.uid);
    };

    const handleSave = async () => {
        if (!customUid || !name) {
            setError("ユーザーIDと名前は必須項目です。");
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                setError("ログインしていません。");
                return;
            }

            // カスタムUIDの重複チェック
            const uidExists = await checkCustomUidExists(customUid);
            if (uidExists) {
                setError("このユーザーIDは既に使用されています。別のIDを入力してください。");
                return;
            }

            let newProfileImageUrl = profileImageUrl;
            if (profileImageFile) {
                newProfileImageUrl = await handleFileUpload(profileImageFile);
            }

            // ユーザードキュメントの参照を取得
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            // 保存するデータの準備
            const dataToSave = {
                uid: customUid,                // ユーザーが設定した独自のID
                gid: user.uid,                // GoogleのログインID
                email: user.email,
                name: name,
                profile_description: profileDescription || "よろしくお願いします",
                profile_image_url: newProfileImageUrl,
                lastLogin: serverTimestamp()
            };

            // 新規ユーザーの場合のみcreated_atを設定
            if (!userDocSnap.exists()) {
                dataToSave.created_at = serverTimestamp();
            }

            await setDoc(userDocRef, dataToSave, { merge: true });
            console.log("プロフィールを保存しました:", dataToSave);

            router.push("/profile");
        } catch (error) {
            console.error("保存に失敗しました:", error);
            setError("プロフィールの保存に失敗しました。");
        }
    };

    return (
        <div className="profile-edit-container">
            <h1>プロフィール設定</h1>
            <form onSubmit={(e) => e.preventDefault()}>
                <div>
                    <label>ユーザーID（必須）</label>
                    <input
                        type="text"
                        value={customUid}
                        onChange={(e) => setCustomUid(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>名前（必須）</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="あなたの名前を入力してください"
                        required
                    />
                </div>
                <div>
                    <label>自己紹介</label>
                    <textarea
                        value={profileDescription}
                        onChange={(e) => setProfileDescription(e.target.value)}
                        placeholder="自己紹介を入力してください"
                    />
                </div>
                <div>
                    <label>プロフィール画像</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    {profileImageUrl && (
                        <Image
                            src={profileImageUrl}
                            alt="プロフィール画像プレビュー"
                            width={100}  // 必須の幅を指定
                            height={100} // 必須の高さを指定
                            style={{ maxWidth: '100px', height: '100px', width: '100px', marginTop: '10px' }}
                        />
                    )}
                </div>
                {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}
                <button
                    type="button"
                    onClick={handleSave}
                    className="save-button"
                >
                    保存
                </button>
            </form>
        </div>
    );
};

export default EditProfilePage;