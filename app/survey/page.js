'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, addDoc, collection } from "firebase/firestore"; // addDoc, collectionをインポート
import { auth, db } from "../firebase";
import Sidebar from "../Sidebar/page";
import '../../style/survey.css'; // CSSファイルをインポート
import Image from "next/image";

const SurveyPage = () => {
    const [user, setUser] = useState(null); // ログイン中のユーザー情報
    const [question, setQuestion] = useState(""); // アンケートの質問内容
    const [options, setOptions] = useState(["", "", "", ""]); // 4択の選択肢
    const [answered, setAnswered] = useState(false); // 回答済みフラグ
    const router = useRouter(); // Next.jsのルーター

    // ログイン中のユーザー情報を取得
    useEffect(() => {
        const fetchUserData = async () => {
            const user = auth.currentUser;
            if (user) {
                // Firestoreからユーザー情報を取得
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUser({
                        uid: userData.uid,
                        name: userData.name,
                        profileImageUrl: userData.profile_image_url
                    });
                }
            }
        };
        fetchUserData();
    }, []);

    // アンケートを投稿する関数
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user || !question || options.some(option => option === "")) {
            alert("すべての項目を入力してください");
            return;
        }

        console.log("User data:", user);
        console.log("Question:", question);
        console.log("Options:", options);

        // Firestoreの "PostList" コレクションに新しいアンケートを追加
        try {
            await addDoc(collection(db, "PostList"), {
                user_id: user.uid,
                user_name: user.name,
                user_icon: user.profileImageUrl,
                question: question,
                options: options,
                create_at: new Date(),
            });

            // 投稿後にPostListページへリダイレクト
            router.push("/PostList");

        } catch (error) {
            console.error("アンケートの投稿に失敗しました: ", error);
        }
    };

    return (
        <div className="survey-container">
            <Sidebar />
            <h2 className="survey-header">アンケートを作成する</h2>
            
            {user && (
                <div className="survey-user-info">
                    {/* アイコン表示 */}
                    <Image
                        src={user.profileImageUrl || '/default-avatar.png'} 
                        alt="User Icon" 
                        width={50}
                        height={50}
                        className="survey-user-icon"
                    />
                    {/* ユーザー名表示 */}
                    <span className="survey-username">{user.name}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="survey-form">
                <textarea
                    placeholder="アンケートの質問内容を入力してください"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="survey-textarea"
                    required
                />
                {options.map((option, index) => (
                    <input
                        key={index}
                        type="text"
                        placeholder={`選択肢 ${index + 1}`}
                        value={option}
                        onChange={(e) => {
                            const newOptions = [...options];
                            newOptions[index] = e.target.value;
                            setOptions(newOptions);
                        }}
                        className="survey-input"
                        required
                    />
                ))}
                <button type="submit" className="survey-button">
                    投稿する
                </button>
            </form>
        </div>
    );
};

export default SurveyPage;
