'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { db, auth } from "../firebase";
import { collection, doc, setDoc, serverTimestamp, getDoc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import '../../style/SuperDM.css';
import Sou from '../Images/Sousin.png';
import Image from "next/image";
import Sidebar from "@/app/Sidebar/page";
import Searchdummy from "@/app/Searchdummy/page";
import Yaji from '../Images/Yajirusi.png';

const DM = () => {
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [unreadCounts, setUnreadCounts] = useState({});

    const messagesEndRef = useRef(null);
    const router = useRouter();

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
                        uid: userData.uid,
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

    // Subscribe to unread messages for all conversations
    useEffect(() => {
        if (!user) return;

        const unsubscribes = users
            .filter(otherUser => user?.followers?.includes(otherUser.uid))
            .map(otherUser => {
                const docId = [user.uid, otherUser.uid].sort().join('-');
                return onSnapshot(doc(db, "direct_messages", docId), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const messages = data.messages || [];
                        const unreadCount = messages.filter(msg =>
                            msg.receiver_id === user.uid &&
                            !msg.read &&
                            msg.sender_id === otherUser.uid
                        ).length;

                        setUnreadCounts(prev => ({
                            ...prev,
                            [otherUser.uid]: unreadCount
                        }));
                    }
                });
            });

        return () => unsubscribes.forEach(unsub => unsub());
    }, [user, users]);

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
            async (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const loadedMessages = data.messages || [];

                    // Mark messages as read when user opens the conversation
                    const updatedMessages = loadedMessages.map(msg => {
                        if (msg.receiver_id === user.uid && !msg.read) {
                            return { ...msg, read: true };
                        }
                        return msg;
                    });

                    if (JSON.stringify(loadedMessages) !== JSON.stringify(updatedMessages)) {
                        await updateDoc(doc(db, "direct_messages", docId), {
                            messages: updatedMessages,
                            updated_at: serverTimestamp(),
                        });
                    }

                    updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
                    setMessages(updatedMessages);
                } else {
                    setMessages([]);
                }
            }
        );

        return () => unsubscribe();
    }, [selectedUser, user]);

    const sendMessage = async (e) => {
        e.preventDefault();

        if (!newMessage.trim() || !selectedUser || !selectedUser.uid) return;

        if (!user.followers.includes(selectedUser.uid) || !selectedUser.followers.includes(user.uid)) {
            alert("相互フォローが成立していないため、DMを送信できません。");
            return;
        }

        const docId = [user.uid, selectedUser.uid].sort().join('-');
        const docRef = doc(db, "direct_messages", docId);
        const messageData = {
            sender_id: user.uid,
            receiver_id: selectedUser.uid,
            message_content: newMessage,
            timestamp: new Date().getTime(),
            read: false
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

    return (
        <div className="container">
            <Sidebar />
            <div>
                <div className="user-status">
                    {user ? (
                        <div>
                            <p>ログイン中: {user.name || user.email}</p>
                        </div>
                    ) : (
                        <p>ログインしていません。</p>
                    )}
                </div>

                {!selectedUser ? (
                    <div>
                        <ul className="DMList">
                            <h2>DM</h2>
                            {users
                                .filter((otherUser) => {
                                    return user?.followers?.includes(otherUser.uid) && otherUser.uid !== user.uid;
                                })
                                .map((otherUser) => (
                                    <li key={otherUser.uid} className="dm-list-item">
                                        <button onClick={() => setSelectedUser(otherUser)}>
                                            <div style={{display: 'flex', marginTop: '15px', alignItems: 'center'}}>
                                                <img
                                                    src={otherUser.profile_image_url}
                                                    alt={`${otherUser.name}'s profile`}
                                                    className="dm-user-icon"
                                                />
                                                <p className="DMusername">{otherUser.name}</p>
                                                {unreadCounts[otherUser.uid] > 0 && (
                                                    <span className="unread-count">
                                                        {unreadCounts[otherUser.uid]}
                                                    </span>
                                                )}
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
                                            <div style={{ marginTop: "5px", margin: "auto" }}>
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
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={sendMessage} style={{ display: "flex", alignItems: "center", marginTop: "10px", width: "400px" }}>
                            <textarea
                                style={{ textAlign: "center", padding: "20px", height: "65px", overflow: "hidden" }}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                rows="4"
                                placeholder="メッセージを入力..."
                                onKeyDown={handleKeyDown}
                            />
                            <button type="submit" style={{ marginLeft: "10px" }}>
                                <Image src={Sou} alt="send icon" width={30} height={30} />
                            </button>
                        </form>
                    </div>
                )}
            </div>
            <Searchdummy/>
        </div>
    );
};

export default DM;