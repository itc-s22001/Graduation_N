"use client";

import { initializeApp } from 'firebase/app';
// import { getAuth } from "firebase/auth"; //ログイン機能実装後にやる
import { getFirestore } from 'firebase/firestore';

// .envから環境変数を取得
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// Firestoreを取得
const db = getFirestore(app);

// dbをエクスポート
export { db };