"use client";

import { useEffect, useState } from 'react';
import { auth, db } from '../../app/firebase';
import {
    doc,
    getDoc,
    onSnapshot,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    updateDoc,
    deleteField
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import Sidebar from "@/app/Sidebar/page";
import '../../style/profile.css';

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
    const [userPosts, setUserPosts] = useState([]);
    const [likedPosts, setLikedPosts] = useState([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);
    const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState({});
    const [activeTab, setActiveTab] = useState('posts'); // 'posts' or 'likes'

    // ユーザープロフィールへの遷移を処理する関数
    const handleUserClick = (userId) => {
        setShowFollowersModal(false);
        setShowFollowingModal(false);
        router.push(`/profile/${userId}`);
    };

    // フォロワー・フォロー中のユーザー情報を取得する関数
    const fetchUsersList = async (userIds) => {
        try {
            const usersData = [];
            const nonExistingUsers = [];

            // 各ユーザーIDについてチェック
            for (const uid of userIds) {
                const userQuery = query(collection(db, 'users'), where('uid', '==', uid));
                const querySnapshot = await getDocs(userQuery);

                if (!querySnapshot.empty) {
                    const userData = querySnapshot.docs[0].data();
                    usersData.push(userData);
                } else {
                    // 存在しないユーザーを記録
                    nonExistingUsers.push(uid);
                }
            }

            // 存在しないユーザーがいる場合、クリーンアップを実行
            if (nonExistingUsers.length > 0) {
                await cleanupDeletedUsers(nonExistingUsers);
            }

            return usersData;
        } catch (error) {
            console.error('Error fetching users list:', error);
            return [];
        }
    };

    // いいねの管理とクリーンアップのための関数を追加
    const cleanupLikes = async (postId) => {
        try {
            const postRef = doc(db, 'post', postId);
            const postDoc = await getDoc(postRef);

            if (!postDoc.exists()) return;

            const postData = postDoc.data();
            const likedBy = postData.likedBy || [];
            const likeDates = postData.likeDates || {};

            // 存在するユーザーをチェック
            const validLikes = [];
            const validLikeDates = {};

            for (const userId of likedBy) {
                const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                    validLikes.push(userId);
                    if (likeDates[userId]) {
                        validLikeDates[userId] = likeDates[userId];
                    }
                }
            }

            // データが変更された場合のみ更新
            if (validLikes.length !== likedBy.length) {
                await updateDoc(postRef, {
                    likedBy: validLikes,
                    likeDates: validLikeDates,
                    likes: validLikes.length
                });
                console.log(`Cleaned up likes for post ${postId}`);
            }
        } catch (error) {
            console.error('Error cleaning up likes:', error);
        }
    };

    const cleanupDeletedUsers = async (deletedUserIds) => {
        try {
            // 全ユーザーを取得
            const usersSnapshot = await getDocs(collection(db, 'users'));

            // 各ユーザーのフォロー/フォロワーリストをクリーンアップ
            const cleanupPromises = usersSnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                let needsUpdate = false;
                const updates = {};

                // フォローリストをチェック
                if (userData.following) {
                    const newFollowing = userData.following.filter(uid => !deletedUserIds.includes(uid));
                    if (newFollowing.length !== userData.following.length) {
                        updates.following = newFollowing;
                        needsUpdate = true;
                    }
                }

                // フォロワーリストをチェック
                if (userData.followers) {
                    const newFollowers = userData.followers.filter(uid => !deletedUserIds.includes(uid));
                    if (newFollowers.length !== userData.followers.length) {
                        updates.followers = newFollowers;
                        needsUpdate = true;
                    }
                }

                // 更新が必要な場合のみ更新を実行
                if (needsUpdate) {
                    return updateDoc(doc(db, 'users', userDoc.id), updates);
                }
            });

            await Promise.all(cleanupPromises.filter(Boolean));
            console.log('Cleanup completed for deleted users:', deletedUserIds);
        } catch (error) {
            console.error('Error cleaning up deleted users:', error);
        }
    };


    const fetchLikedPosts = (currentUserUid) => {
        const postsQuery = query(
            collection(db, 'post'),
            where('likedBy', 'array-contains', currentUserUid)
        );

        return onSnapshot(postsQuery, (querySnapshot) => {
            const posts = querySnapshot.docs.map(doc => ({
                id: doc.id,
                comments_count: doc.data().comments_count || 0,
                content: doc.data().content || "",
                create_at: doc.data().create_at,
                likedBy: doc.data().likedBy || [],
                likes: doc.data().likes || 0,
                uid: doc.data().uid,
                user_icon: doc.data().user_icon || "",
                user_name: doc.data().user_name || "",
                likeDate: doc.data().likeDates?.[currentUserUid] || null // いいねした日付を取得
            }));

            // いいねした日付でソート
            const sortedPosts = posts.sort((a, b) => {
                if (!a.likeDate && !b.likeDate) return 0;
                if (!a.likeDate) return 1;
                if (!b.likeDate) return -1;
                return b.likeDate.seconds - a.likeDate.seconds;
            });

            setLikedPosts(sortedPosts);
        });
    };


    // いいね機能の実装
    const toggleLike = async (postId) => {
        if (!userData?.uid) return;

        const postRef = doc(db, "post", postId);
        const postDoc = await getDoc(postRef);

        if (!postDoc.exists()) return;

        const post = postDoc.data();
        const likedBy = post.likedBy || [];

        try {
            const likedByUser = likedBy.includes(userData.uid);

            if (likedByUser) {
                // いいねを解除する場合
                const updatedLikedBy = likedBy.filter(id => id !== userData.uid);
                await updateDoc(postRef, {
                    likes: Math.max(0, post.likes - 1), // 負の数にならないように
                    likedBy: updatedLikedBy,
                    [`likeDates.${userData.uid}`]: deleteField() // フィールドを完全に削除
                });
            } else {
                // いいねする場合
                await updateDoc(postRef, {
                    likes: post.likes + 1,
                    likedBy: [...likedBy, userData.uid],
                    [`likeDates.${userData.uid}`]: new Date()
                });
            }
        } catch (error) {
            console.error("いいねの更新に失敗しました: ", error);
        }
    };

    const runPeriodicCleanup = async () => {
        try {
            const postsQuery = query(collection(db, 'post'));
            const querySnapshot = await getDocs(postsQuery);

            for (const doc of querySnapshot.docs) {
                await cleanupLikes(doc.id);
            }
        } catch (error) {
            console.error('Periodic cleanup failed:', error);
        }
    };

    useEffect(() => {
        // コンポーネントマウント時にクリーンアップを実行
        runPeriodicCleanup();

        // 24時間ごとにクリーンアップを実行（必要に応じて間隔を調整）
        const cleanupInterval = setInterval(runPeriodicCleanup, 24 * 60 * 60 * 1000);

        return () => {
            clearInterval(cleanupInterval);
        };
    }, []);

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

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                setError('ユーザーがログインしていません');
                router.push('/login');
                return;
            }

            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUserData(userData);
                    setFollowerCount((userData.followers || []).length);
                    setFollowingCount((userData.following || []).length);

                    // 自分の投稿を取得
                    const postsQuery = query(
                        collection(db, 'post'),
                        where('uid', '==', userData.uid),
                        orderBy('create_at', 'desc')
                    );

                    const unsubscribePosts = onSnapshot(postsQuery, (querySnapshot) => {
                        const posts = querySnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data(),
                            comments_count: doc.data().comments_count || 0,
                            likedBy: doc.data().likedBy || [],
                            likes: doc.data().likes || 0
                        }));
                        setUserPosts(posts);
                        setIsLoadingPosts(false);
                    });

                    // いいねした投稿を取得
                    const unsubscribeLikedPosts = fetchLikedPosts(userData.uid);

                    return () => {
                        unsubscribePosts();
                        unsubscribeLikedPosts();
                    };
                }
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

    const renderUserPosts = () => {
        if (isLoadingPosts) {
            return <div>投稿を読み込み中...</div>;
        }

        if (userPosts.length === 0) {
            return <div>まだ投稿はありません。</div>;
        }

        return (
            <div className="posts-container">
                {userPosts.map((post) => (
                    <div key={post.id} className="post-card">
                        <div className="post-header">
                            <div className="user-info">
                                {post.user_icon ? (
                                    <img
                                        src={post.user_icon}
                                        alt="User Icon"
                                        className="user-icon"
                                    />
                                ) : (
                                    <div className="default-icon"></div>
                                )}
                                <span className="user-name">{post.user_name}</span>
                                <span className="user-id">{post.uid}</span>
                            </div>
                            {userData?.uid === post.uid && (
                                <div className="post-menu">
                                    <button
                                        onClick={() => setIsDeleteMenuOpen(prev => ({
                                            ...prev,
                                            [post.id]: !prev[post.id]
                                        }))}
                                    >
                                        ⋮
                                    </button>
                                    {isDeleteMenuOpen[post.id] && (
                                        <div className="delete-menu">
                                            削除
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="post-content">
                            {post.content}
                        </div>
                        <div className="post-footer">
                            <span className="post-date">
                                {post.create_at ? new Date(post.create_at.seconds * 1000).toLocaleString('ja-JP') : "日時不明"}
                            </span>
                            <div className="post-actions">
                                <button
                                    onClick={() => toggleLike(post.id)}
                                    className="like-button"
                                    aria-label={post.likedByUser ? "いいねを取り消す" : "いいね"}
                                >
                                </button>
                                <button>
                                    <Heart
                                        className={post.likedByUser ? "liked" : "not-liked"}
                                    />
                                    <span>{post.likes}</span>
                                    <span className="comment-count">コメント数: {post.comments_count}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    /* いいね画面 */
    const renderPosts = () => {
        const posts = activeTab === 'posts' ? userPosts : likedPosts;

        if (isLoadingPosts) {
            return <div>投稿を読み込み中...</div>;
        }

        if (posts.length === 0) {
            return <div>
                {activeTab === 'posts' ? 'まだ投稿はありません。' : 'いいねした投稿はありません。'}
            </div>;
        }

        // ユーザープロフィールへの遷移を処理する関数
        const handleUserProfileClick = (userId, e) => {
            e.preventDefault();
            router.push(`/profile/${encodeURIComponent(userId)}`);
        };

        return (
            <div className="posts-container">
                {posts.map((post) => (
                    <div key={post.id} className="post-card">
                        <div className="post-header">
                            <div className="user-info">
                                <div
                                    className="user-profile-link"
                                    onClick={(e) => handleUserProfileClick(post.uid, e)}
                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                    {post.user_icon ? (
                                        <img
                                            src={post.user_icon}
                                            alt={`${post.user_name}のアイコン`}
                                            className="user-icon"
                                        />
                                    ) : (
                                        <div className="default-icon"></div>
                                    )}
                                    <div className="user-text-info">
                                        <span className="user-name">{post.user_name}</span>
                                        <span className="user-id">{post.uid}</span>
                                    </div>
                                </div>
                            </div>
                            {userData?.uid === post.uid && (
                                <div className="post-menu">
                                    <button
                                        onClick={() => setIsDeleteMenuOpen(prev => ({
                                            ...prev,
                                            [post.id]: !prev[post.id]
                                        }))}
                                    >
                                        ⋮
                                    </button>
                                    {isDeleteMenuOpen[post.id] && (
                                        <div className="delete-menu">
                                            削除
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="post-content">
                            {post.content}
                        </div>
                        <div className="post-footer">
                            <span className="post-date">
                                {post.create_at
                                    ? new Date(post.create_at.seconds * 1000).toLocaleString('ja-JP')
                                    : "日時不明"
                                }
                            </span>
                            <div className="post-actions">
                                <button
                                    onClick={() => toggleLike(post.id)}
                                    className="like-button"
                                    aria-label={post.likedBy?.includes(userData?.uid) ? "いいねを取り消す" : "いいね"}
                                >
                                    <Heart
                                        className={post.likedBy?.includes(userData?.uid) ? "liked" : "not-liked"}
                                    />
                                    <span>{post.likes}</span>
                                    <span className="comment-count">コメント数: {post.comments_count}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
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
                {/* Profile header and info sections remain the same... */}
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

                <div className="tabs-container">
                    <div className="tabs">
                        <button
                            className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
                            onClick={() => setActiveTab('posts')}
                        >
                            投稿
                        </button>
                        <button
                            className={`tab ${activeTab === 'likes' ? 'active' : ''}`}
                            onClick={() => setActiveTab('likes')}
                        >
                            いいね
                        </button>
                    </div>
                    <div className="tab-content">
                        {renderPosts()}
                    </div>
                </div>


                <Modal
                    isOpen={showFollowersModal}
                    onClose={() => setShowFollowersModal(false)}
                    title="フォロワー"
                >
                    <div className="user-list">
                        {renderUserList(followersList)}
                    </div>
                </Modal>

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
        </div>
    );
};

export default ProfilePage;