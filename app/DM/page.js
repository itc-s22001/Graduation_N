'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { db, auth } from "../firebase";
import { collection, doc, setDoc, serverTimestamp, getDoc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import '../../style/SuperDM.css';

import Sou from '../Images/Sousin.png'
import Image from "next/image";

const DM = () => {
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);

    const messagesEndRef = useRef(null); // スクロールのための参照

    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

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

    useEffect(() => {
        if (!selectedUser || !user) return;

        const docId = [user.uid, selectedUser.uid].sort().join('-');
        const unsubscribe = onSnapshot(
            doc(db, "direct_messages", docId),
            (docSnap) => {
                if (docSnap.exists()) {
                    const loadedMessages = docSnap.data().messages || [];
                    loadedMessages.sort((a, b) => a.timestamp - b.timestamp);
                    setMessages(loadedMessages);
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

        const docId = [user.uid, selectedUser.uid].sort().join('-');
        const docRef = doc(db, "direct_messages", docId);

        const messageData = {
            sender_id: user.uid,
            receiver_id: selectedUser.uid,
            message_content: newMessage,
            timestamp: new Date().getTime(),
        };

        try {
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                await updateDoc(docRef, {
                    messages: arrayUnion(messageData),
                    updated_at: serverTimestamp(),
                });
            } else {
                await setDoc(docRef, {
                    messages: [messageData],
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp(),
                });
            }

            setNewMessage("");
            scrollToBottom(); // メッセージ送信後にスクロール
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const cancelMessage = async (message) => {
        const docId = [user.uid, selectedUser.uid].sort().join('-');
        const docRef = doc(db, "direct_messages", docId);

        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const currentMessages = docSnap.data().messages;
                const updatedMessages = currentMessages.filter((msg) => msg.timestamp !== message.timestamp);

                const cancelMessageData = {
                    sender_id: user.uid,
                    receiver_id: selectedUser.uid,
                    message_content: `${user.email}がメッセージを取り消しました。`,
                    canceled: true,
                    original_message: message.message_content,
                    timestamp: message.timestamp,
                };

                updatedMessages.push(cancelMessageData);
                await updateDoc(docRef, {
                    messages: updatedMessages,
                    updated_at: serverTimestamp(),
                });
            }
        } catch (error) {
            console.error("Error canceling message:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            router.push('/');
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    useEffect(() => {
        scrollToBottom(); // メッセージが更新されたときにスクロール
    }, [messages]);

    return (
        <div>
            <div className="container">
                <div className="user-status">
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
                                otherUser.uid !== user?.uid && (
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
                    <div className="DMmain">
                        <h1>{selectedUser.name}とのDM</h1>
                        <button onClick={() => setSelectedUser(null)}>戻る</button>
                        <div className="messageContainer">
                            {messages.length === 0 ? (
                                <p>メッセージはまだありません。</p>
                            ) : (
                                messages.map((message, index) => (
                                    <div key={index}
                                         className={`message ${message.sender_id === user?.uid ? 'self' : 'other'}`}>
                                        <div style={{display: "flex", alignItems: "flex-start"}}>
                                            {user && message.sender_id === user.uid && !message.canceled && (
                                                <button onClick={() => cancelMessage(message)} style={{
                                                    marginRight: "10px",
                                                    fontSize: "12px",
                                                    padding: "1px 1px"
                                                }}>
                                                    ︙
                                                </button>
                                            )}
                                            <div style={{
                                                marginTop: "5px",
                                                margin: "auto",
                                            }}>
                                                {message.message_content}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef}/>
                            {/* スクロールのための参照を追加 */}
                        </div>

                        <form onSubmit={sendMessage}
                              style={{display: "flex", alignItems: "center", marginTop: "10px", width: "400px"}}>
                            <textarea
                                style={{
                                    textAlign: "center",
                                    padding: "20px",
                                    height: "30px"
                                }}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                rows="4"
                                placeholder="メッセージを入力..."
                                maxLength={100} // 文字数制限を追加
                            />

                            <button type="submit" className="send-button" style={{
                                width: "50px",
                                height: "50px",
                                padding: 0, // ボタン内の余白を取り除く
                                border: "none", // ボタンの枠線を消す（必要なら）
                                background: "transparent", // 背景を透明に
                                display: "flex", // 中央揃え
                                justifyContent: "center",
                                alignItems: "center"
                            }}>
                                <Image
                                    src={Sou}
                                    alt="送信"
                                    width={50}
                                    height={50}
                                    style={{objectFit: "contain"}} // 画像をボタン内に収める
                                />
                            </button>

                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DM;
