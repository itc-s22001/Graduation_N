'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const ALLOWED_EMAILS = ['s22026@std.it-college.ac.jp', 's22022@std.it-college.ac.jp','s22028@std.it-college.ac.jp','s22001@std.it-college.ac.jp'];

const Theme = () => {
    const [themeText, setThemeText] = useState('');
    const [postTime, setPostTime] = useState(new Date());
    const [user, setUser] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const router = useRouter();
    const auth = getAuth();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthorized(currentUser && ALLOWED_EMAILS.includes(currentUser.email));
        });

        return () => unsubscribe();
    }, []);

    const handlePost = async () => {
        if (!isAuthorized) {
            alert('お題の投稿権限がありません。');
            return;
        }

        if (!themeText.trim()) {
            alert('お題を入力してください。');
            return;
        }

        if (postTime < new Date()) {
            alert('現在時刻より後の時間を選択してください。');
            return;
        }

        try {
            // Firestoreのタイムスタンプ形式で保存
            const postData = {
                content: themeText,
                postTime: serverTimestamp(), // 投稿時間
                scheduled_at: postTime.getTime(), // 表示予定時間
                user_id: user.uid,
                user_name: '管理者',
                user_icon: user.photoURL || '',
                likes: 0,
                likedBy: [],
                comments_count: 0,
                isTheme: true,
                isVisible: false,
                create_at: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'post'), postData);
            
            if (docRef.id) {
                alert('お題を投稿しました！指定した時間に表示されます。');
                router.push('/PostList');
            }
        } catch (error) {
            console.error("Error adding theme: ", error);
            alert(`投稿中にエラーが発生しました。エラー: ${error.message}`);
        }
    };

    const handleGoBack = () => {
        router.push('/PostList');  // '/PostList'へ遷移
    };

    if (!user) {
        return <div className="p-4">ログインしてください。</div>;
    }

    if (!isAuthorized) {
        return <div className="p-4">お題の投稿権限がありません。</div>;
    }

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">お題投稿</h1>
            
            <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    お題を入力してください
                </label>
                <input 
                    type="text" 
                    value={themeText} 
                    onChange={(e) => setThemeText(e.target.value)} 
                    placeholder="今日の夕飯は何を食べる？" 
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={100}
                />
            </div>

            <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    表示開始時間
                </label>
                <DatePicker
                    selected={postTime}
                    onChange={(date) => setPostTime(date)}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={5}
                    minDate={new Date()}
                    dateFormat="yyyy/MM/dd HH:mm"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <button 
                onClick={handlePost}
                className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            >
                投稿する
            </button>
            <button
                onClick={handleGoBack}
                className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            >
                戻る
            </button>
        </div>
    );
};

export default Theme;