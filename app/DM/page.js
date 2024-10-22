'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { db, auth } from "../firebase";
import { collection, doc, setDoc, serverTimestamp, getDoc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const DM = () => {
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);

    const router = useRouter();

    // ログインユーザー情報を取得し、Firestoreに保存
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser); // ログインしたユーザー情報をセット

                const userDocRef = doc(db, "users", currentUser.uid);
                await setDoc(userDocRef, {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    lastLogin: serverTimestamp()
                }, { merge: true });
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // Firestoreからユーザー情報を取得
    useEffect(() => {
        const q = collection(db, "users");
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const loadedUsers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setUsers(loadedUsers);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching users:", error);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    // メッセージをFirestoreから取得
    useEffect(() => {
        if (!selectedUser || !user) return;

        // ドキュメントIDを「ユーザーIDのソート」によって作成
        const docId = [user.uid, selectedUser.uid].sort().join('-');
        const unsubscribe = onSnapshot(
            doc(db, "direct_messages", docId),
            (docSnap) => {
                if (docSnap.exists()) {
                    setMessages(docSnap.data().messages || []);
                } else {
                    setMessages([]);
                }
            },
            (error) => {
                console.error("Error fetching messages:", error);
            }
        );

        return () => unsubscribe();
    }, [selectedUser, user]);

    const sendMessage = async (e) => {
        e.preventDefault();

        if (!newMessage.trim()) return;
        if (!selectedUser || !selectedUser.uid) {
            console.error("Error: receiver_uid is undefined");
            return;
        }

        // ユーザーのUIDを基にドキュメントIDを作成
        const docId = [user.uid, selectedUser.uid].sort().join('-');
        const docRef = doc(db, "direct_messages", docId);

        try {
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // ドキュメントが存在する場合、メッセージを追加
                await updateDoc(docRef, {
                    messages: arrayUnion({
                        sender_id: user.uid,
                        receiver_id: selectedUser.uid,
                        message_content: newMessage,
                        // timestampはここでは設定しない
                    }),
                    updated_at: serverTimestamp(), // メッセージが送信された後にupdated_atを更新
                });
            } else {
                // ドキュメントが存在しない場合、新規作成
                await setDoc(docRef, {
                    messages: [
                        {
                            sender_id: user.uid,
                            receiver_id: selectedUser.uid,
                            message_content: newMessage,
                            // timestampはここでは設定しない
                        }
                    ],
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp(), // 新規作成時のupdated_at
                });
            }

            setNewMessage(""); // メッセージ入力をクリア
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const cancelMessage = async (message) => {
        const docId = [user.uid, selectedUser.uid].sort().join('-');
        const docRef = doc(db, "direct_messages", docId);

        try {
            // まず、メッセージを取得
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const currentMessages = docSnap.data().messages;

                // 取り消したいメッセージをフィルタリングして削除
                const updatedMessages = currentMessages.filter((msg) => msg.message_content !== message.message_content);

                // 取り消しメッセージを追加
                updatedMessages.push({
                    sender_id: user.uid,
                    receiver_id: selectedUser.uid,
                    message_content: `${user.email}がメッセージを取り消しました。`,
                    canceled: true, // メッセージが取り消されたことを示すフラグ
                    original_message: message.message_content, // 取り消された元のメッセージ内容
                });

                // Firestoreを更新
                await updateDoc(docRef, {
                    messages: updatedMessages,
                    updated_at: serverTimestamp(),
                });
            }
        } catch (error) {
            console.error("Error canceling message:", error);
        }
    };


    const handleLogout = () => {
        signOut(auth).then(() => {
            router.push('/');
        }).catch((error) => {
            console.error("Error logging out:", error);
        });
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div style={{ marginBottom: "20px" }}>
                {user ? (
                    <div>
                        <p>ログイン中: {user.email}</p>
                        <button onClick={handleLogout}>ログアウト</button>
                    </div>
                ) : (
                    <p>ログインしていません。</p>
                )}
            </div>

            {!selectedUser ? (
                <div>
                    <h2>DMを送る相手を選択してください</h2>
                    <ul>
                        {users.map((otherUser) => (
                            otherUser.uid !== user.uid && (
                                <li key={otherUser.uid}>
                                    <button onClick={() => setSelectedUser(otherUser)}>
                                        {otherUser.name}
                                    </button>
                                </li>
                            )
                        ))}
                    </ul>
                </div>
            ) : (
                <div>
                    <h1>{selectedUser.name}とのDM</h1>
                    <button onClick={() => setSelectedUser(null)}>戻る</button>
                    <div style={{ border: "1px solid #ccc", padding: "10px", height: "300px", overflowY: "scroll" }}>
                        {messages.length === 0 ? (
                            <p>メッセージはまだありません。</p>
                        ) : (
                            messages.map((message, index) => (
                                <div key={index} style={{ marginBottom: "10px", textAlign: message.sender_id === user.uid ? "right" : "left" }}>
                                    <strong>{message.sender_id === user.uid ? "自分" : selectedUser.name}:</strong> {message.message_content}
                                    {message.sender_id === user.uid && (
                                        <button onClick={() => cancelMessage(message)} style={{ marginLeft: "10px" }}>
                                            取り消す
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <form onSubmit={sendMessage} style={{ marginTop: "10px" }}>
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows="4"
                            placeholder="メッセージを入力..."
                            style={{ width: "100%", padding: "10px" }}
                        />
                        <button type="submit" style={{ marginTop: "10px" }}>
                            送信
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default DM;
