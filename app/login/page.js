"use client"; // この行を追加

import { useEffect } from 'react';
import { auth, googleProvider } from '../firebase'; // firebase.jsからauthとgoogleProviderをインポート
import { useRouter } from 'next/navigation'; // こちらを使用
import { signInWithPopup } from 'firebase/auth'; // signInWithPopupをインポート

const LoginPage = () => {
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider); // authとgoogleProviderを渡す
      console.log('User:', result.user);
      // ログイン成功後にホームページにリダイレクト
      router.push('/profile/setup');
    } catch (error) {
      console.error('Login Error:', error);
    }
  };

  return (
    <div>
      <h1>Login Page</h1>
      <button onClick={handleLogin}>Login with Google</button>
    </div>
  );
};

export default LoginPage;
