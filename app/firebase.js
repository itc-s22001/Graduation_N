// app/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 環境変数からFirebaseの設定を取得
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// AuthとFirestoreを取得
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

// Googleアカウントでログインする関数
const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // ユーザー情報
        const userId = user.uid; // GoogleアカウントのID
        const email = user.email; // Googleアカウントのメールアドレス

        return { userId, email }; // ユーザーIDとメールアドレスを返す
    } catch (error) {
        console.error("ログインエラー:", error);
        throw error; // エラーをスロー
    }
};

// エクスポート
export { auth, googleProvider, db, loginWithGoogle };
