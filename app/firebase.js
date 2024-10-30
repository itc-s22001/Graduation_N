// app/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // インポートを修正

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
const storage = getStorage(app); // ストレージの初期化

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

// ファイルアップロードの処理
const handleFileUpload = async (file) => {
    if (!file) return;

    // ファイル名をユニークにするために、ユーザーのUIDやタイムスタンプを使用
    const storageRef = ref(storage, `profile_images/${file.name}`);

    try {
        // Firebase Storageにファイルをアップロード
        const snapshot = await uploadBytes(storageRef, file);

        // アップロードしたファイルのダウンロードURLを取得
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log("File available at", downloadURL);

        return downloadURL; // ダウンロードURLを返す
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error; // エラーハンドリング
    }
};

// ユーザー情報をFirestoreに保存する関数
const saveUserData = async (userId, name, profileDescription, profileImageUrl) => {
    try {
        await setDoc(doc(db, "users", userId), {
            uid: userId,
            name: name,
            profile_description: profileDescription,
            profile_image_url: profileImageUrl,
            created_at: new Date(), // 作成日時を追加
        });
    } catch (error) {
        console.error("Error saving user data:", error);
    }
};

// エクスポート
export { auth, googleProvider, db, loginWithGoogle, handleFileUpload, saveUserData, storage };
