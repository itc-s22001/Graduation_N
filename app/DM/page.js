"use client"; // クライアントサイドで動作することを指定

import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase"; // Firebase設定ファイルをインポート
import { collection, addDoc, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const DM = ({ chatPartnerId }) => {
    const [user, setUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");

    // ログインしているユーザーを取得
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Firestoreからメッセージを読み込む
    useEffect(() => {
        if (user && chatPartnerId) {
            const q = query(
                collection(db, "messages"),
                where("from", "in", [user.uid, chatPartnerId]),
                where("to", "in", [user.uid, chatPartnerId]),
                orderBy("timestamp", "asc")
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const loadedMessages = snapshot.docs.map((doc) => doc.data());
                setMessages(loadedMessages);
            });

            return () => unsubscribe();
        }
    }, [user, chatPartnerId]);

    // メッセージ送信ハンドラー
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (inputMessage.trim() !== "" && user) {
            await addDoc(collection(db, "messages"), {
                from: user.uid,
                to: chatPartnerId,
                text: inputMessage,
                timestamp: new Date(),
            });
            setInputMessage(""); // 送信後に入力フィールドをクリア
        }
    };

    return (
        <div>
            <h1>DM機能</h1>
            <div style={{ border: "1px solid #ccc", padding: "10px", height: "300px", overflowY: "scroll" }}>
                {/* メッセージ表示部分 */}
                {messages.map((message, index) => (
                    <div key={index} style={{ marginBottom: "10px" }}>
                        <strong>{message.from === user.uid ? "自分" : "相手"}:</strong> {message.text}
                    </div>
                ))}
            </div>

            {/* メッセージ入力フォーム */}
            <form onSubmit={handleSendMessage}>
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="メッセージを入力..."
                    style={{ width: "80%", padding: "10px" }}
                />
                <button type="submit" style={{ padding: "10px" }}>
                    送信
                </button>
            </form>
        </div>
    );
};

export default DM;
