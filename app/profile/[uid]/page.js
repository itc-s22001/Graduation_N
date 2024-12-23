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
    onSnapshot,
    orderBy
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import '@/style/otherprofile.css';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Sidebar from '@/app/Sidebar/page';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import Image from 'next/image';
import Searchdummy from "../../Searchdummy/page";


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
    const [userPosts, setUserPosts] = useState([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState({});

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

        const unsubscribe = onSnapshot(userQuery, async (snapshot) => {
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

                // 投稿を取得
                const postsQuery = query(
                    collection(db, 'post'),
                    where('uid', '==', user.uid),
                    orderBy('create_at', 'desc')
                );

                const unsubscribePosts = onSnapshot(postsQuery, (querySnapshot) => {
                    const posts = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        comments_count: doc.data().comments_count || 0,
                        content: doc.data().content || "",
                        create_at: doc.data().create_at,
                        likedBy: doc.data().likedBy || [],
                        likes: doc.data().likes || 0,
                        uid: doc.data().uid,
                        user_icon: doc.data().user_icon || "",
                        user_name: doc.data().user_name || "",
                        likedByUser: currentUserData && doc.data().likedBy && doc.data().likedBy.includes(currentUserData.uid)
                    }));
                    setUserPosts(posts);
                    setIsLoadingPosts(false);
                });

                return () => {
                    unsubscribe();
                    unsubscribePosts();
                };
            } else {
                setError('ユーザー情報が見つかりません。');
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [decodedUid, currentUserData]);

    // フォロー状態の確認を追加
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

    const renderUserList = (users) => {
        return users.map((user) => (
            <div key={user.uid} className="user-list-item">
                <Image
                    src={user.profile_image_url}
                    alt={`${user.name}'s profile`}
                    width={48}
                    height={48}
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

    // いいね機能の実装
    const toggleLike = async (postId) => {
        if (!currentUserData) return;

        const postRef = doc(db, "post", postId);
        const post = userPosts.find(post => post.id === postId);

        if (!post || !Array.isArray(post.likedBy)) return;

        const likedByUser = post.likedBy.includes(currentUserData.uid);
        const newLikes = likedByUser ? post.likes - 1 : post.likes + 1;
        const updatedLikedBy = likedByUser
            ? post.likedBy.filter(uid => uid !== currentUserData.uid)
            : [...post.likedBy, currentUserData.uid];

        try {
            await updateDoc(postRef, {
                likes: newLikes,
                likedBy: updatedLikedBy,
            });
        } catch (error) {
            console.error("いいねの更新に失敗しました: ", error);
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
                                    <Image
                                        src={post.user_icon}
                                        alt="User Icon"
                                        width={40}
                                        height={40}
                                        className="user-icon"
                                    />
                                ) : (
                                    <div className="default-icon"></div>
                                )}
                                <span className="user-name">{post.user_name}</span>
                                <span className="user-id">{post.uid}</span>
                            </div>
                            {currentUserData?.uid === post.uid && (
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

                        {/* 投稿画像を表示 */}
                        {post.image_url && (
                            <div className="post-image-container">
                                <Image
                                    src={post.image_url}
                                    alt="投稿画像"
                                    width={500}
                                    height={300}
                                    className="post-image"
                                />
                            </div>
                        )}

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
                    <Image
                        src={userData.profile_image_url}
                        alt="Profile Image"
                        width={133.5}  // 必須の幅を指定
                        height={133.5} // 必須の高さを指定
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

                <div className="user-posts-section">
                    <h2 className="posts-title">投稿一覧</h2>
                    {renderUserPosts()}
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
            <Searchdummy />
        </div>
    );
};

export default UserProfilePage;


// 'use client';

// import { useEffect, useState } from 'react';
// import { 
//     collection, 
//     query, 
//     where, 
//     getDocs, 
//     doc, 
//     updateDoc, 
//     getDoc, 
//     arrayUnion, 
//     arrayRemove,
//     onSnapshot 
// } from 'firebase/firestore';
// import { db } from '@/app/firebase';
// import '@/style/otherprofile.css';
// import { getAuth, onAuthStateChanged } from 'firebase/auth';
// import Sidebar from '@/app/Sidebar/page';
// import { useRouter } from 'next/navigation';

// // カスタムモーダルコンポーネント
// const Modal = ({ isOpen, onClose, title, children }) => {
//     if (!isOpen) return null;

//     return (
//         <div className="modal-overlay" onClick={onClose}>
//             <div className="modal-content" onClick={e => e.stopPropagation()}>
//                 <div className="modal-header">
//                     <h2 className="modal-title">{title}</h2>
//                     <button className="modal-close" onClick={onClose}>×</button>
//                 </div>
//                 <div className="modal-body">
//                     {children}
//                 </div>
//             </div>
//         </div>
//     );
// };

// const UserProfilePage = ({ params }) => {
//     const router = useRouter();
//     const { uid } = params;
//     const decodedUid = decodeURIComponent(uid);
//     const [userData, setUserData] = useState(null);
//     const [error, setError] = useState('');
//     const [currentUser, setCurrentUser] = useState(null);
//     const [currentUserData, setCurrentUserData] = useState(null);
//     const [followerCount, setFollowerCount] = useState(0);
//     const [followingCount, setFollowingCount] = useState(0);
//     const [isFollowing, setIsFollowing] = useState(false);
//     const [loading, setLoading] = useState(true);
//     const [showFollowersModal, setShowFollowersModal] = useState(false);
//     const [showFollowingModal, setShowFollowingModal] = useState(false);
//     const [followersList, setFollowersList] = useState([]);
//     const [followingList, setFollowingList] = useState([]);

//     // Auth状態の監視
//     useEffect(() => {
//         const auth = getAuth();
//         const unsubscribe = onAuthStateChanged(auth, async (user) => {
//             if (user) {
//                 setCurrentUser(user);
//                 try {
//                     const userQuery = query(
//                         collection(db, 'users'),
//                         where('email', '==', user.email)
//                     );
//                     const querySnapshot = await getDocs(userQuery);
//                     if (!querySnapshot.empty) {
//                         const userData = querySnapshot.docs[0].data();
//                         setCurrentUserData(userData);
//                     }
//                 } catch (error) {
//                     console.error('Error fetching current user data:', error);
//                 }
//             } else {
//                 setCurrentUser(null);
//                 setCurrentUserData(null);
//             }
//         });

//         return () => unsubscribe();
//     }, []);

//     // プロフィールデータとフォロー情報の取得
//     useEffect(() => {
//         if (!decodedUid) return;

//         const userQuery = query(
//             collection(db, 'users'),
//             where('uid', '==', decodedUid)
//         );

//         const unsubscribe = onSnapshot(userQuery, (snapshot) => {
//             if (!snapshot.empty) {
//                 const user = snapshot.docs[0].data();
//                 setUserData(user);
//                 const followers = user.followers || [];
//                 const following = user.following || [];
//                 setFollowerCount(followers.length);
//                 setFollowingCount(following.length);
//                 setLoading(false);

//                 // フォロワーとフォロー中のユーザー情報を取得
//                 fetchUsersList(followers, setFollowersList);
//                 fetchUsersList(following, setFollowingList);
//             } else {
//                 setError('ユーザー情報が見つかりません。');
//                 setLoading(false);
//             }
//         });

//         return () => unsubscribe();
//     }, [decodedUid]);

//     // フォロー状態の確認
//     useEffect(() => {
//         if (!currentUserData || !decodedUid) return;

//         const userQuery = query(
//             collection(db, 'users'),
//             where('uid', '==', currentUserData.uid)
//         );

//         const unsubscribe = onSnapshot(userQuery, (snapshot) => {
//             if (!snapshot.empty) {
//                 const user = snapshot.docs[0].data();
//                 const following = user.following || [];
//                 setIsFollowing(following.includes(decodedUid));
//             }
//         });

//         return () => unsubscribe();
//     }, [currentUserData, decodedUid]);

//     const fetchUsersList = async (userIds, setList) => {
//         try {
//             const usersData = [];
//             for (const uid of userIds) {
//                 const userQuery = query(collection(db, 'users'), where('uid', '==', uid));
//                 const querySnapshot = await getDocs(userQuery);
//                 if (!querySnapshot.empty) {
//                     const userData = querySnapshot.docs[0].data();
//                     usersData.push(userData);
//                 }
//             }
//             setList(usersData);
//         } catch (error) {
//             console.error('Error fetching users list:', error);
//         }
//     };


//     const handleFollow = async () => {
//         if (!currentUser) {
//             alert('フォローするにはログインが必要です。');
//             return;
//         }

//         try {
//             const currentUserQuery = query(
//                 collection(db, 'users'),
//                 where('uid', '==', currentUserData.uid)
//             );
//             const currentUserSnapshot = await getDocs(currentUserQuery);

//             const targetUserQuery = query(
//                 collection(db, 'users'),
//                 where('uid', '==', decodedUid)
//             );
//             const targetUserSnapshot = await getDocs(targetUserQuery);

//             if (!currentUserSnapshot.empty && !targetUserSnapshot.empty) {
//                 const currentUserDoc = currentUserSnapshot.docs[0].ref;
//                 const targetUserDoc = targetUserSnapshot.docs[0].ref;

//                 if (isFollowing) {
//                     await updateDoc(currentUserDoc, {
//                         following: arrayRemove(decodedUid)
//                     });
//                     await updateDoc(targetUserDoc, {
//                         followers: arrayRemove(currentUserData.uid)
//                     });
//                 } else {
//                     await updateDoc(currentUserDoc, {
//                         following: arrayUnion(decodedUid)
//                     });
//                     await updateDoc(targetUserDoc, {
//                         followers: arrayUnion(currentUserData.uid)
//                     });
//                 }
//             }
//         } catch (error) {
//             console.error('フォロー操作に失敗しました:', error);
//             alert('フォロー操作に失敗しました。');
//         }
//     };

//     const handleUserClick = (userId) => {
//         setShowFollowersModal(false);
//         setShowFollowingModal(false);
//         // 自分のプロフィールページに戻る場合
//         if (userId === currentUserData.uid) {
//             router.push('/profile/');
//         } else {
//             // 他のユーザーのプロフィールページに遷移
//             router.push(`/profile/${encodeURIComponent(userId)}`);
//         }
//     };


//     const renderUserList = (users) => {
//         return users.map((user) => (
//             <div key={user.uid} className="user-list-item">
//                 <img 
//                     src={user.profile_image_url} 
//                     alt={`${user.name}'s profile`} 
//                     className="user-list-avatar"
//                     onClick={() => handleUserClick(user.uid)}
//                     style={{ cursor: 'pointer' }}
//                 />
//                 <div 
//                     className="user-list-info"
//                     onClick={() => handleUserClick(user.uid)}
//                     style={{ cursor: 'pointer' }}
//                 >
//                     <p className="user-list-name">{user.name}</p>
//                     <p className="user-list-id">{user.uid}</p>
//                 </div>
//             </div>
//         ));
//     };

//     if (loading) {
//         return <p>読み込み中...</p>;
//     }

//     if (error) {
//         return <p>{error}</p>;
//     }

//     if (!userData) {
//         return <p>ユーザー情報が見つかりません。</p>;
//     }

//     return (
//         <div className="profile-layout">
//             <Sidebar />
//             <div className="profile-container">
//                 <div className="profile-header">
//                     <img 
//                         src={userData.profile_image_url} 
//                         alt="Profile Image" 
//                         className="profile-image"
//                     />
//                     {currentUserData && currentUserData.uid !== userData.uid && (
//                         <button 
//                             onClick={handleFollow}
//                             className={`follow-button ${isFollowing ? 'following' : ''}`}
//                         >
//                             {isFollowing ? 'フォロー中' : 'フォロー'}
//                         </button>
//                     )}
//                 </div>
//                 <div className="profile-info">
//                     <h1 className="username">{userData.name}</h1>
//                     <p className="user-id">{userData.uid}</p>
//                     <p className="self-introduction">{userData.profile_description}</p>
//                     <div className="follow-info">
//                         <button 
//                             className="following-button"
//                             onClick={() => setShowFollowingModal(true)}
//                         >
//                             <span className="follow-count">{followingCount}</span>
//                             <span className="follow-text">フォロー中</span>
//                         </button>
//                         <button 
//                             className="followers-button"
//                             onClick={() => setShowFollowersModal(true)}
//                         >
//                             <span className="follow-count">{followerCount}</span>
//                             <span className="follow-text">フォロワー</span>
//                         </button>
//                     </div>
//                 </div>

//                 <div className="user-posts">
//                     {/* ユーザーポストコンテンツ */}
//                 </div>
//             </div>

//             {/* フォロワーモーダル */}
//             <Modal
//                 isOpen={showFollowersModal}
//                 onClose={() => setShowFollowersModal(false)}
//                 title="フォロワー"
//             >
//                 <div className="user-list">
//                     {renderUserList(followersList)}
//                 </div>
//             </Modal>

//             {/* フォロー中モーダル */}
//             <Modal
//                 isOpen={showFollowingModal}
//                 onClose={() => setShowFollowingModal(false)}
//                 title="フォロー中"
//             >
//                 <div className="user-list">
//                     {renderUserList(followingList)}
//                 </div>
//             </Modal>
//         </div>
//     );
// };

// export default UserProfilePage;
