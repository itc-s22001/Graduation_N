'use client'; // この行を追加して、クライアントコンポーネントとしてマークします

import { GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Firebase設定ファイル
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // next/navigationをインポートします

const RegisterPage = () => {
    const [uid, setUid] = useState('');
    const [name, setName] = useState(''); // 名前の状態を追加
    const [profileDescription, setProfileDescription] = useState('');
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter(); // useRouterを使う

    // uidのバリデーション関数
    const validateUid = (uid) => {
        const regex = /^[a-zA-Z0-9@_]+$/; // アルファベット、数字、@、_のみ許可
        return regex.test(uid);
    };

    // uidが重複していないかチェック
    const checkUidUniqueness = async (uid) => {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        return !userDoc.exists(); // UIDが存在しない場合trueを返す
    };

    // 名前が空でないかをチェック
    const validateName = (name) => {
        return name.trim().length > 0; // 名前が空でないことを確認
    };

    const handleGoogleRegister = async () => {
        setLoading(true);
        const provider = new GoogleAuthProvider();

        // Googleのログインポップアップで、アカウント選択画面を強制
        provider.setCustomParameters({
            prompt: 'select_account', // 複数アカウントがある場合にアカウント選択を強制
        });

        // uidのバリデーションチェック
        if (!validateUid(uid)) {
            setError('uidはアルファベット、数字、@、_のみで構成されている必要があります。');
            setLoading(false);
            return;
        }

        // 名前のバリデーションチェック
        if (!validateName(name)) {
            setError('名前は必須です。');
            setLoading(false);
            return;
        }

        // UIDの一意性チェック
        const isUidUnique = await checkUidUniqueness(uid);
        if (!isUidUnique) {
            setError('このUIDはすでに使用されています。別のUIDを指定してください。');
            setLoading(false);
            return;
        }

        try {
            // Googleログインでユーザー認証
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // 同じメールアドレスで既にアカウントが存在するか確認
            const existingUser = await getDoc(doc(db, 'users', user.uid));
            if (existingUser.exists()) {
                setError('このメールアドレスはすでに別のアカウントで登録されています。');
                setLoading(false);
                return;
            }

            // ユーザーのプロフィール画像と名前を更新
            await updateProfile(user, {
                displayName: name, // ユーザーが指定した名前を表示名として設定
                photoURL: profileImageUrl || user.photoURL,
            });

            // Firestoreにユーザー情報を保存
            await setDoc(doc(db, "users", uid), { // UIDをユーザーが入力した値に設定
                uid: uid, // ユーザーが入力したuidを使用
                email: user.email,
                name: name, // ユーザーが指定した名前を使用
                profile_description: profileDescription || "よろしく",
                profile_image_url: profileImageUrl || user.photoURL || "",
                created_at: serverTimestamp(), // タイムスタンプを自動で生成
            });

            // 登録後、DM画面にリダイレクト
            router.push("/DM"); // DMページにリダイレクト

        } catch (err) {
            console.error("Error registering user with Google:", err);
            if (err.code === "auth/account-exists-with-different-credential") {
                setError("このメールアドレスはすでに別の認証方法で使用されています。");
            } else {
                setError("登録に失敗しました。もう一度お試しください。");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>Googleでユーザー登録</h1>
            <form onSubmit={(e) => e.preventDefault()}>
                <div>
                    <label>UID</label>
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
                    <label>プロフィール説明</label>
                    <input
                        type="text"
                        value={profileDescription}
                        onChange={(e) => setProfileDescription(e.target.value)}
                    />
                </div>
                <div>
                    <label>プロフィール画像URL</label>
                    <input
                        type="text"
                        value={profileImageUrl}
                        onChange={(e) => setProfileImageUrl(e.target.value)}
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button onClick={handleGoogleRegister} disabled={loading}>
                    Googleで登録
                </button>
            </form>
        </div>
    );
};

export default RegisterPage;
