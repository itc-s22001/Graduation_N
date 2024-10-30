'use client';

// 'use client' は省略
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { db, auth } from "../firebase";
import { collection, doc, setDoc, serverTimestamp, getDoc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import '../../style/SuperDM.css';
import Sou from '../Images/Sousin.png';
import Image from "next/image";
import Sidebar from "@/app/Sidebar/page";

import Yaji from '../Images/Yajirusi.png'

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
                const userDocRef = doc(db, "users", currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                let userName = currentUser.email; // デフォルトはメールアドレス

                if (userDocSnap.exists()) {
                    userName = userDocSnap.data().name || userName; // 名前がある場合は取得
                    await setDoc(userDocRef, {
                        uid: currentUser.uid,
                        email: currentUser.email,
                        name: userName,
                        lastLogin: serverTimestamp()
                    }, { merge: true });
                }
                setUser({ ...currentUser, name: userName });
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
            scrollToBottom();
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
                    message_content: `${user.name || user.email}がメッセージを取り消しました。`,
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

    const handleKeyDown = (e) => {
        if (e.shiftKey && e.key === 'Enter') {
            e.preventDefault();
            sendMessage(e);
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div>
            <Sidebar />
            <div className="container">
                <div className="user-status">
                    {user ? (
                        <div>
                            <p>ログイン中: {user.name || user.email}</p>
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
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <button
                                onClick={() => setSelectedUser(null)}
                                style={{
                                    fontSize: "24px",
                                    marginRight: "10px",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    cursor: "pointer"
                                }}
                            >
                                <Image
                                    src={Yaji} // 画像のパス
                                    alt="back arrow"
                                    width={30}
                                    height={30}
                                    margin="auto"
                                />
                            </button>
                            <h1 style={{ margin: 0 }}>{selectedUser.name}</h1>
                        </div>

                        <div className="messageContainer">
                            {messages.length === 0 ? (
                                <p>メッセージはまだありません。</p>
                            ) : (
                                messages.map((message, index) => (
                                    <div key={index} className={`message ${message.sender_id === user?.uid ? 'self' : 'other'}`}>
                                        <div style={{ display: "flex", alignItems: "flex-start" }}>
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
                                                {!message.canceled && (
                                                    <div style={{ fontSize: "12px", color: "gray" }}>
                                                        {formatTimestamp(message.timestamp)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef}/>
                        </div>

                        <form onSubmit={sendMessage} style={{ display: "flex", alignItems: "center", marginTop: "10px", width: "400px" }}>
                        <textarea
                            style={{
                                textAlign: "center",
                                padding: "20px",
                                height: "30px",
                                overflow: "hidden"
                            }}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows="4"
                            placeholder="メッセージを入力..."
                            maxLength={100}
                            onKeyDown={handleKeyDown}
                        />

                            <button type="submit" className="send-button" style={{
                                width: "50px",
                                height: "50px",
                                padding: 0,
                                border: "none",
                                background: "transparent",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center"
                            }}>
                                <Image
                                    src={Sou}
                                    alt="send"
                                    width={50}
                                    height={50}
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