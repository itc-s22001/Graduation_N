'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { db, auth } from "../firebase";
import { collection, doc, setDoc, serverTimestamp, getDoc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import '../../style/SuperDM.css';
import Sou from '../Images/Sousin.png';
import Image from "next/image";
import Sidebar from "@/app/Sidebar/page"; // Sidebarをインポート
import Yaji from '../Images/Yajirusi.png';

const DM = () => {
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);

    const messagesEndRef = useRef(null);
    const router = useRouter();

    // useEffect(() => {
    //     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    //         if (currentUser) {
    //             const userDocRef = doc(db, "users", currentUser.uid);
    //             const userDocSnap = await getDoc(userDocRef);
    //             let userName = currentUser.email;

    //             if (userDocSnap.exists()) {
    //                 userName = userDocSnap.data().name || userName;
    //                 await setDoc(userDocRef, {
    //                     uid: currentUser.uid,
    //                     email: currentUser.email,
    //                     name: userName,
    //                     followers: userDocSnap.data().followers || [],
    //                     lastLogin: serverTimestamp()
    //                 }, { merge: true });
    //             }
    //             setUser({ ...currentUser, name: userName, followers: userDocSnap.data().followers || [] });
    //         } else {
    //             setUser(null);
    //         }
    //     });
    //     return () => unsubscribe();
    // }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const gid = currentUser.uid;
                const userDocRef = doc(db, "users", gid);
                const userDocSnap = await getDoc(userDocRef);
    
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setUser({
                        ...currentUser,
                        gid: gid,
                        uid: userData.uid,  // カスタムUIDをセット
                        name: userData.name || currentUser.email,
                        followers: userData.followers || []
                    });
                } else {
                    setUser({ ...currentUser, gid: gid, uid: null });
                }
            } else {
                setUser(null);
            }
        });
    
        return () => unsubscribe();
    }, []);
    

    useEffect(() => {
        const q = collection(db, "users");
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedUsers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setUsers(loadedUsers);
            setLoading(false);
        });
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

        if (!newMessage.trim() || !selectedUser || !selectedUser.uid) return;

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
        <div className="container">
            <Sidebar />
            <div >

                <div className="user-status">
                    {user ? (
                        <div>
                            <p>ログイン中: {user.name || user.email}</p>
                            {/*<button onClick={handleLogout}>ログアウト</button>*/}
                        </div>
                    ) : (
                        <p>ログインしていません。</p>
                    )}
                </div>

                {!selectedUser ? (
                    <div>
                        <h2>DM</h2>
                        <ul className="DMList">
                            {users
                                .filter((otherUser) => {
                                    return user?.followers?.includes(otherUser.uid) && otherUser.uid !== user.uid;
                                })
                                .map((otherUser) => (
                                    <li key={otherUser.uid} className="dm-list-item">
                                        <button onClick={() => setSelectedUser(otherUser)}>

                                            <div style={{ display: 'flex', marginTop: '15px' }}>
                                                <img
                                                    src={otherUser.profile_image_url}
                                                    alt={`${otherUser.name}'s profile`}
                                                    className="dm-user-icon"
                                                />
                                                <p className="DMusername">{otherUser.name}</p>
                                            </div>

                                        </button>
                                    </li>
                                ))}
                        </ul>

                    </div>
                ) : (
                    <div className="DMmain">
                        <div style={{display: "flex", alignItems: "center"}}>
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
                                <Image src={Yaji} alt="back arrow" width={30} height={30} />
                            </button>
                            <h1 style={{ margin: 0 }}>{selectedUser.name}</h1>
                        </div>

                        <div className="messageContainer">
                            {messages.length === 0 ? (
                                <p className="DMfirstmessage">メッセージはまだありません。</p>
                            ) : (
                                messages.map((message, index) => (
                                    <div key={index} className={`message ${message.sender_id === user.uid ? "sent" : "received"}`}>
                                        <p>{message.message_content}</p>
                                        <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
                                        {message.sender_id === user.uid && (
                                            <button onClick={() => cancelMessage(message)}>取り消す</button>
                                        )}
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={sendMessage} className="messageInputContainer">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="メッセージを入力..."
                                required
                                style={{ resize: 'none' }}
                            />
                            <button type="submit">送信</button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DM;