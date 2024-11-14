"use client";

import { useState, useEffect } from "react";
import { query, collection, orderBy, onSnapshot, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from 'firebase/auth';
import Sidebar from "../Sidebar/page";
import Searchdummy from "../Searchdummy/page";
import "../../styles/PostList.css"

const PostPage = () => {
    const [posts, setPosts] = useState([]);
    const [surveys, setSurveys] = useState([]);
    const [combinedContent, setCombinedContent] = useState([]);
    const [user, setUser] = useState(null);
    const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState({});
    const [isConfirmPopupOpen, setIsConfirmPopupOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const q = query(collection(db, "users"), where("email", "==", currentUser.email));
                const userSnapshot = await getDocs(q);

                if (!userSnapshot.empty) {
                    const userData = userSnapshot.docs[0].data();
                    setUser({
                        id: userSnapshot.docs[0].id,
                        ...userData,
                    });
                }
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const postsQuery = query(collection(db, "post"), orderBy("create_at", "desc"));
        const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
            const postData = snapshot.docs.map((doc) => ({
                id: doc.id,
                type: 'post',
                ...doc.data(),
                likedByUser: doc.data().likedBy && doc.data().likedBy.includes(user?.id),
            }));
            setPosts(postData);
        });

        const surveysQuery = query(collection(db, "PostList"), orderBy("create_at", "desc"));
        const unsubscribeSurveys = onSnapshot(surveysQuery, (snapshot) => {
            const surveyData = snapshot.docs.map((doc) => ({
                id: doc.id,
                type: 'survey',
                ...doc.data(),
                hasVoted: doc.data().respondents?.includes(user?.id) || false,
            }));
            setSurveys(surveyData);
        });

        return () => {
            unsubscribePosts();
            unsubscribeSurveys();
        };
    }, [user]);

    useEffect(() => {
        const combined = [...posts, ...surveys].sort((a, b) => {
            const timeA = a.create_at?.seconds || 0;
            const timeB = b.create_at?.seconds || 0;
            return timeB - timeA;
        });
        setCombinedContent(combined);
    }, [posts, surveys]);

    const openConfirmPopup = (postId) => {
        setPostToDelete(postId);
        setIsConfirmPopupOpen(true);
    };

    const closeConfirmPopup = () => {
        setIsConfirmPopupOpen(false);
        setPostToDelete(null);
    };

    const handleDeletePost = async () => {
        if (postToDelete) {
            await deleteDoc(doc(db, "post", postToDelete));
            closeConfirmPopup();
        }
    };

    const toggleLike = async (postId, currentLikes, likedByUser) => {
        if (!user) return;

        const postRef = doc(db, "post", postId);
        const post = posts.find(post => post.id === postId);

        if (!post || !Array.isArray(post.likedBy)) return;

        const newLikes = likedByUser ? currentLikes - 1 : currentLikes + 1;
        const updatedLikedBy = likedByUser
            ? post.likedBy.filter(uid => uid !== user.id)
            : [...post.likedBy, user.id];

        try {
            await updateDoc(postRef, {
                likes: newLikes,
                likedBy: updatedLikedBy,
            });
        } catch (error) {
            console.error("いいねの更新に失敗しました: ", error);
        }
    };

    const handleVote = async (surveyId, optionIndex) => {
        if (!user) return;

        const surveyRef = doc(db, "PostList", surveyId);
        const survey = surveys.find(s => s.id === surveyId);

        // ユーザーが既に投票済みの場合は処理を中断
        if (!survey || survey.hasVoted) {
            console.log("既に投票済みです");
            return;
        }

        const currentVotes = survey.votes || Array(survey.options.length).fill(0);
        const newVotes = [...currentVotes];
        newVotes[optionIndex] = (newVotes[optionIndex] || 0) + 1;

        const currentRespondents = survey.respondents || [];
        const updatedRespondents = [...currentRespondents, user.id];

        try {
            await updateDoc(surveyRef, {
                votes: newVotes,
                respondents: updatedRespondents,
            });
        } catch (error) {
            console.error("投票の更新に失敗しました: ", error);
        }
    };

    // 投票率を計算する関数
    const calculateVotePercentage = (votes, index) => {
        if (!votes || votes.length === 0) return 0;
        const totalVotes = votes.reduce((sum, count) => sum + count, 0);
        return totalVotes === 0 ? 0 : Math.round((votes[index] / totalVotes) * 100);
    };

    // 投票の進捗アニメーションを追加するためのスタイル設定
    const getVoteProgressStyle = (votePercentage) => {
        return {
            width: `${votePercentage}%`,
            backgroundColor: '#007bff',
            transition: 'width 1s ease-out', // アニメーションの追加
        };
    };
    
    return (
        <div className="post-list-container">
            <Sidebar />
            <div className="post-container">
                {combinedContent.map((item) => (
                    <div key={item.id}>
                        {item.type === 'survey' ? (
                            <div className="post-item">
                                <div className="post-item-header">
                                    {item.user_icon && (
                                        <img
                                            src={item.user_icon}
                                            alt="User Icon"
                                            className="user-icon"
                                        />
                                    )}
                                    <p>{item.user_name}</p>
                                </div>
                                <h3 className="post-item-question">{item.question}</h3>
                                <div className="vote-options">
                                    {item.options.map((option, index) => {
                                        const votePercentage = calculateVotePercentage(item.votes, index);
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => handleVote(item.id, index)}
                                                disabled={item.hasVoted || !user}
                                                className="vote-button"
                                            >
                                                <div
                                                    className="vote-progress-bar"
                                                    style={{
                                                        width: `${votePercentage}%`,
                                                        backgroundColor: item.hasVoted
                                                            ? 'rgba(0, 123, 255, 0.2)'
                                                            : 'transparent',
                                                    }}
                                                />
                                                <div className="vote-button-content">
                                                    <span>{option}</span>
                                                    {item.hasVoted && <span>{votePercentage}%</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {!user && <p className="no-login-message">投票するにはログインが必要です</p>}
                                {item.hasVoted && <p className="vote-done-message">投票済み</p>}
                                <p className="post-item-footer">
                                    投稿日: {item.create_at ? new Date(item.create_at.seconds * 1000).toLocaleString() : "不明"}
                                </p>
                            </div>
                        ) : (
                            <div className="post-item">
                                <div className="post-item-header">
                                    {item.user_icon && (
                                        <img
                                            src={item.user_icon}
                                            alt="User Icon"
                                            className="user-icon"
                                        />
                                    )}
                                    <p>{item.user_name}</p>
                                    {user?.uid === item.user_id && (
                                        <div className="delete-menu-container">
                                            <button onClick={() => setIsDeleteMenuOpen(prev => ({ ...prev, [item.id]: !prev[item.id] }))}>
                                                ⋮
                                            </button>
                                            {isDeleteMenuOpen[item.id] && (
                                                <div
                                                    className="delete-menu"
                                                    onClick={() => openConfirmPopup(item.id)}
                                                >
                                                    削除
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p>{item.content}</p>
                                <div className="like-button-container">
                                    <button onClick={() => toggleLike(item.id, item.likes, item.likedByUser)} className="like-button">
                                        {item.likedByUser ? 'いいねを取り消す' : 'いいね'}
                                    </button>
                                    <span>{item.likes || 0} いいね</span>
                                </div>
                                <p className="post-item-footer">
                                    投稿日: {item.create_at ? new Date(item.create_at.seconds * 1000).toLocaleString() : "不明"}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
    
            {isConfirmPopupOpen && (
                <div className="confirm-popup">
                    <div className="confirm-popup-content">
                        <p>本当にこの投稿を削除しますか？</p>
                        <div className="confirm-popup-buttons">
                            <button onClick={handleDeletePost} className="confirm-button">はい</button>
                            <button onClick={closeConfirmPopup} className="cancel-button">いいえ</button>
                        </div>
                    </div>
                </div>
            )}
            <Searchdummy />
        </div>
    );
};

export default PostPage;