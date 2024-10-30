'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/app/firebase';
import { 
    doc, 
    getDoc,
    onSnapshot,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from "@/app/Sidebar/page";
import '@/style/profile.css';
import Search from "@/app/searchbar/page";

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

const ProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [error, setError] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);
    const router = useRouter();
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [followersList, setFollowersList] = useState([]);
    const [followingList, setFollowingList] = useState([]);

    // ユーザープロフィールへの遷移を処理する関数
    const handleUserClick = (userId) => {
        // モーダルを閉じる
        setShowFollowersModal(false);
        setShowFollowingModal(false);
        // ユーザープロフィールページへ遷移
        router.push(`/profile/${userId}`);
    };

    // フォロワー・フォロー中のユーザー情報を取得する関数
    const fetchUsersList = async (userIds) => {
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
            return usersData;
        } catch (error) {
            console.error('Error fetching users list:', error);
            return [];
        }
    };

    // フォロワーモーダルを開く
    const handleFollowersClick = async () => {
        if (userData && userData.followers) {
            const followers = await fetchUsersList(userData.followers);
            setFollowersList(followers);
            setShowFollowersModal(true);
        }
    };

    // フォロー中モーダルを開く
    const handleFollowingClick = async () => {
        if (userData && userData.following) {
            const following = await fetchUsersList(userData.following);
            setFollowingList(following);
            setShowFollowingModal(true);
        }
    };

    // Auth状態の監視
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                setError('ユーザーがログインしていません');
                router.push('/login');
                return;
            }

            setCurrentUserId(user.uid);

            try {
                // ユーザーデータのリアルタイム監視を設定
                const userDocRef = doc(db, "users", user.uid);
                const unsubscribeUser = onSnapshot(userDocRef, (docSnapshot) => {
                    if (docSnapshot.exists()) {
                        const data = docSnapshot.data();
                        setUserData(data);
                        const followers = data.followers || [];
                        const following = data.following || [];
                        setFollowerCount(followers.length);
                        setFollowingCount(following.length);
                    } else {
                        setError('ユーザー情報が見つかりません');
                    }
                });

                return () => unsubscribeUser();
            } catch (err) {
                console.error('Error setting up user listener:', err);
                setError('データの取得に失敗しました');
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            setError('ログアウトに失敗しました');
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '日付不明';
        const date = new Date(timestamp.seconds * 1000);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return `${year}年の${month}月から利用しています。`;
    };

    const renderUserList = (users) => {
        return users.map((user) => (
            <div 
                key={user.uid} 
                className="user-list-item hover:bg-gray-100 cursor-pointer"
                onClick={() => handleUserClick(user.uid)}
            >
                <img 
                    src={user.profile_image_url} 
                    alt={`${user.name}'s profile`} 
                    className="user-list-avatar"
                />
                <div className="user-list-info">
                    <p className="user-list-name">{user.name}</p>
                    <p className="user-list-id">{user.uid}</p>
                </div>
            </div>
        ));
    };

    if (error) {
        return <p style={{ color: 'red' }}>{error}</p>;
    }

    if (!userData) {
        return <div className="profile-layout"><Sidebar /><div className="profile-container">Loading...</div></div>;
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
                    <Link href="/profile/edit">
                        <button className="edit-profile-button">プロフィール編集</button>
                    </Link>
                </div>
                <div className="profile-info">
                    <h1 className="username">{userData.name}</h1>
                    <p className="user-id">{userData.uid}</p>
                    <p className="self-introduction">{userData.profile_description}</p>
                    <p className="user-create">{formatDate(userData.created_at)}</p>
                    <div className="follow-info">
                        <button 
                            className="following-button"
                            onClick={handleFollowingClick}
                        >
                            <span className="follow-count">{followingCount}</span>
                            <span className="follow-text">フォロー中</span>
                        </button>
                        <button 
                            className="followers-button"
                            onClick={handleFollowersClick}
                        >
                            <span className="follow-count">{followerCount}</span>
                            <span className="follow-text">フォロワー</span>
                        </button>
                    </div>
                </div>
                
                <button className="logout-button" onClick={handleLogout}>ログアウト</button>
                <div className="logout-divider"></div>
                
                <div className="user-posts">
                    {/* ユーザーポストコンテンツ */}
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
            {/* <Search /> */}
        </div>
    );
};

export default ProfilePage;
