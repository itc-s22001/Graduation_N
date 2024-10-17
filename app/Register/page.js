'use client'; // この行を追加して、クライアントコンポーネントとしてマークします

import { GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Firebase設定ファイル
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // next/navigationをインポートします

const RegisterPage = () => {
    const [profileDescription, setProfileDescription] = useState('');
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter(); // useRouterを使う

    const handleGoogleRegister = async () => {
        setLoading(true);
        const provider = new GoogleAuthProvider();

        try {
            // Googleログインでユーザー認証
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // ユーザーのプロフィール画像と説明を任意で更新
            if (profileImageUrl || profileDescription) {
                await updateProfile(user, {
                    photoURL: profileImageUrl || user.photoURL,
                    displayName: user.displayName,
                });
            }

            // Firestoreにユーザー情報を保存
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                name: user.displayName,
                profile_description: profileDescription || "よろしく",
                profile_image_url: profileImageUrl || user.photoURL || "",
                created_at: serverTimestamp(), // タイムスタンプを自動で生成
            });

            // 登録後、ログイン画面やDM画面にリダイレクト
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
