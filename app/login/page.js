'use client'; // This line marks the component as a client component

import { useState, useEffect } from 'react'; // useStateをインポート
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/app/firebase';
import { useRouter } from 'next/navigation';
import '@/style/login.css'; // CSSファイルをインポート

const LoginPage = () => {
    const router = useRouter();
    const [uid, setUid] = useState(''); // uidの初期値を設定

    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
    
            // Firestoreでユーザーデータを確認
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                // ユーザーデータが存在しない場合、プロフィール編集画面へ
                router.push("/profile/setup");
            } else {
                // ユーザーデータが存在する場合、uidを取得して遷移
                const fetchedUser = await getDoc(doc(db, "users", user.uid));
                const userData = fetchedUser.data();
                const userUid = userData.uid; // Firestoreから取得したuidを使う
                router.push(`/profile/`); // @をつけて遷移
            }
        } catch (error) {
            console.error("Login error:", error);
        }
    };
    
    

    useEffect(() => {
        const fetchUserData = async () => {
            const user = auth.currentUser;
            if (user) {
                setUid(`@${user.uid}`); // uidに@付きで設定
            }
        };
        fetchUserData();
    }, []);
    

    return (
        <div className="login-container"> {/* クラスを追加 */}
            <h1>Googleアカウントでログイン</h1>
            <button onClick={handleLogin}>Login with Google</button>
        </div>
    );
};

export default LoginPage;