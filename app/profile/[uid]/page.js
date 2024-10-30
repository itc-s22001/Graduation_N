'use client';

import { useEffect, useState } from 'react';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc, 
    getDoc, 
    arrayUnion, 
    arrayRemove,
    onSnapshot 
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import '@/style/otherprofile.css';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Sidebar from '@/app/Sidebar/page';
import { useRouter } from 'next/navigation';

// カスタムモーダルコンポーネント
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

const UserProfilePage = ({ params }) => {
    const router = useRouter();
    const { uid } = params;
    const decodedUid = decodeURIComponent(uid);
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [followersList, setFollowersList] = useState([]);
    const [followingList, setFollowingList] = useState([]);

    // Auth状態の監視
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                try {
                    const userQuery = query(
                        collection(db, 'users'),
                        where('email', '==', user.email)
                    );
                    const querySnapshot = await getDocs(userQuery);
                    if (!querySnapshot.empty) {
                        const userData = querySnapshot.docs[0].data();
                        setCurrentUserData(userData);
                    }
                } catch (error) {
                    console.error('Error fetching current user data:', error);
                }
            } else {
                setCurrentUser(null);
                setCurrentUserData(null);
            }
        });

        return () => unsubscribe();
    }, []);

    // プロフィールデータとフォロー情報の取得
    useEffect(() => {
        if (!decodedUid) return;

        const userQuery = query(
            collection(db, 'users'),
            where('uid', '==', decodedUid)
        );

        const unsubscribe = onSnapshot(userQuery, (snapshot) => {
            if (!snapshot.empty) {
                const user = snapshot.docs[0].data();
                setUserData(user);
                const followers = user.followers || [];
                const following = user.following || [];
                setFollowerCount(followers.length);
                setFollowingCount(following.length);
                setLoading(false);

                // フォロワーとフォロー中のユーザー情報を取得
                fetchUsersList(followers, setFollowersList);
                fetchUsersList(following, setFollowingList);
            } else {
                setError('ユーザー情報が見つかりません。');
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [decodedUid]);

    // フォロー状態の確認
    useEffect(() => {
        if (!currentUserData || !decodedUid) return;

        const userQuery = query(
            collection(db, 'users'),
            where('uid', '==', currentUserData.uid)
        );

        const unsubscribe = onSnapshot(userQuery, (snapshot) => {
            if (!snapshot.empty) {
                const user = snapshot.docs[0].data();
                const following = user.following || [];
                setIsFollowing(following.includes(decodedUid));
            }
        });

        return () => unsubscribe();
    }, [currentUserData, decodedUid]);

    const fetchUsersList = async (userIds, setList) => {
        try {
            const usersData = [];
            for (const uid of userIds) {
                const userQuery = query(collection(db, 'users'), where('uid', '==', uid));
                const querySnapshot = await getDocs(userQuery);
                if (!querySnapshot.empty) {
                    const userData = querySnapshot.docs[0].data();
                    usersData.push(userData);
                }
            }
            setList(usersData);
        } catch (error) {
            console.error('Error fetching users list:', error);
        }
    };
    

    const handleFollow = async () => {
        if (!currentUser) {
            alert('フォローするにはログインが必要です。');
            return;
        }

        try {
            const currentUserQuery = query(
                collection(db, 'users'),
                where('uid', '==', currentUserData.uid)
            );
            const currentUserSnapshot = await getDocs(currentUserQuery);
            
            const targetUserQuery = query(
                collection(db, 'users'),
                where('uid', '==', decodedUid)
            );
            const targetUserSnapshot = await getDocs(targetUserQuery);

            if (!currentUserSnapshot.empty && !targetUserSnapshot.empty) {
                const currentUserDoc = currentUserSnapshot.docs[0].ref;
                const targetUserDoc = targetUserSnapshot.docs[0].ref;

                if (isFollowing) {
                    await updateDoc(currentUserDoc, {
                        following: arrayRemove(decodedUid)
                    });
                    await updateDoc(targetUserDoc, {
                        followers: arrayRemove(currentUserData.uid)
                    });
                } else {
                    await updateDoc(currentUserDoc, {
                        following: arrayUnion(decodedUid)
                    });
                    await updateDoc(targetUserDoc, {
                        followers: arrayUnion(currentUserData.uid)
                    });
                }
            }
        } catch (error) {
            console.error('フォロー操作に失敗しました:', error);
            alert('フォロー操作に失敗しました。');
        }
    };

    const handleUserClick = (userId) => {
        setShowFollowersModal(false);
        setShowFollowingModal(false);
        // 自分のプロフィールページに戻る場合
        if (userId === currentUserData.uid) {
            router.push('/profile/');
        } else {
            // 他のユーザーのプロフィールページに遷移
            router.push(`/profile/${encodeURIComponent(userId)}`);
        }
    };
    

    const renderUserList = (users) => {
        return users.map((user) => (
            <div key={user.uid} className="user-list-item">
                <img 
                    src={user.profile_image_url} 
                    alt={`${user.name}'s profile`} 
                    className="user-list-avatar"
                    onClick={() => handleUserClick(user.uid)}
                    style={{ cursor: 'pointer' }}
                />
                <div 
                    className="user-list-info"
                    onClick={() => handleUserClick(user.uid)}
                    style={{ cursor: 'pointer' }}
                >
                    <p className="user-list-name">{user.name}</p>
                    <p className="user-list-id">{user.uid}</p>
                </div>
            </div>
        ));
    };

    if (loading) {
        return <p>読み込み中...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    if (!userData) {
        return <p>ユーザー情報が見つかりません。</p>;
    }

    return (
        <div className="profile-layout">
            <Sidebar />
            <div className="profile-container">
                <div className="profile-header">
                    <img 
                        src={userData.profile_image_url} 
                        alt="Profile Image" 
                        className="profile-image"
                    />
                    {currentUserData && currentUserData.uid !== userData.uid && (
                        <button 
                            onClick={handleFollow}
                            className={`follow-button ${isFollowing ? 'following' : ''}`}
                        >
                            {isFollowing ? 'フォロー中' : 'フォロー'}
                        </button>
                    )}
                </div>
                <div className="profile-info">
                    <h1 className="username">{userData.name}</h1>
                    <p className="user-id">{userData.uid}</p>
                    <p className="self-introduction">{userData.profile_description}</p>
                    <div className="follow-info">
                        <button 
                            className="following-button"
                            onClick={() => setShowFollowingModal(true)}
                        >
                            <span className="follow-count">{followingCount}</span>
                            <span className="follow-text">フォロー中</span>
                        </button>
                        <button 
                            className="followers-button"
                            onClick={() => setShowFollowersModal(true)}
                        >
                            <span className="follow-count">{followerCount}</span>
                            <span className="follow-text">フォロワー</span>
                        </button>
                    </div>
                </div>
                
                <div className="user-posts">
                    {/* ユーザーポストコンテンツ */}
                </div>
            </div>

            {/* フォロワーモーダル */}
            <Modal
                isOpen={showFollowersModal}
                onClose={() => setShowFollowersModal(false)}
                title="フォロワー"
            >
                <div className="user-list">
                    {renderUserList(followersList)}
                </div>
            </Modal>

            {/* フォロー中モーダル */}
            <Modal
                isOpen={showFollowingModal}
                onClose={() => setShowFollowingModal(false)}
                title="フォロー中"
            >
                <div className="user-list">
                    {renderUserList(followingList)}
                </div>
            </Modal>
        </div>
    );
};

export default UserProfilePage;