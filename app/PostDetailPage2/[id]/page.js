"use client";
import { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, getDoc, collection, addDoc, query, onSnapshot, orderBy, getDocs,where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Sidebar from "../../Sidebar/page"


const PostDetailPage = ({ params }) => {
    const { id } = params;
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [user, setUser] = useState(null);
    const [postAuthor, setPostAuthor] = useState(null);

    // ログイン中のユーザーを取得
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                (async () => {
                    const q = query(collection(db, "users"), where("email", "==", currentUser.email));
                    const userSnapshot = await getDocs(q);
                    if (!userSnapshot.empty) {
                        const userData = userSnapshot.docs[0].data();
                        setUser({
                            id: userSnapshot.docs[0].id,
                            uid: userData.uid,
                            ...userData,
                        });
                    }
                })();
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);
    

    // 投稿データと投稿者情報を取得
    useEffect(() => {
        if (id) {
            const fetchPost = async () => {
                const postRef = doc(db, 'post', id);
                const postSnap = await getDoc(postRef);
                if (postSnap.exists()) {
                    const postData = { id: postSnap.id, ...postSnap.data() };
                    setPost(postData);

                    // 投稿者の情報を取得
                    const userRef = doc(db, 'users', postData.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        setPostAuthor(userSnap.data());
                    }
                }
            };
            fetchPost();
        }
    }, [id]);

    // コメントデータをリアルタイムで取得
useEffect(() => {
    if (id) {
        const q = query(collection(db, 'post', id, 'comments'), orderBy('created_at', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map((commentDoc) => {
                const comment = commentDoc.data();
                return {
                    id: commentDoc.id,
                    text: comment.text,
                    created_at: comment.created_at,
                    user_name: comment.user_name || "名無し",
                    user_icon: comment.user_icon || "/default_icon.png",
                    uid: comment.uid || "不明",
                };
            });
            setComments(commentsData);
        });
        return () => unsubscribe();
    }
}, [id]);

    // コメントを追加する処理
    const handleAddComment = async () => {
        if (newComment.trim() && user) {
            await addDoc(collection(db, 'post', id, 'comments'), {
                text: newComment,
                created_at: new Date(),
                uid: user.uid,
                user_name: user.name,
                user_icon: user.profile_image_url,
            });
            setNewComment("");
        }
    };

    if (!post) return <p>読み込み中...</p>;

    return (
        <div style={styles.container}>
            <Sidebar />
            {/* <h2 style={styles.postContent}>{post.content}</h2> */}
            {postAuthor && (
                <div style={styles.authorContainer}>
                    <img
                        src={postAuthor.profile_image_url || "/default_icon.png"}
                        alt="Post Author Icon"
                        style={styles.authorIcon}
                    />
                    <p style={styles.authorName}>{postAuthor.name}</p>
                </div>
            )}
            <h2 style={styles.postContent}>{post.content}</h2>
            <p style={styles.likes}>いいね: {post.likes} コメント <span style={styles.commentCount}>({comments.length})</span></p>
            <hr style={styles.separator} />
            <h3 style={styles.commentHeader}>
                {/* コメント <span style={styles.commentCount}>({comments.length})</span> */}
            </h3>
            <div style={styles.commentsContainer}>
                {comments.map((comment) => (
                    <div key={comment.id} style={styles.comment}>
                        <img
                            src={comment.user_icon}
                            alt="User Icon"
                            style={styles.commentIcon}
                        />
                        <p style={styles.commentText}><strong>{comment.user_name}</strong>: {comment.text}</p>
                    </div>
                ))}
            </div>
            <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="コメントを追加"
                style={styles.textarea}
            />
            <button onClick={handleAddComment} disabled={!user} style={styles.button}>コメントを投稿</button>
        </div>
    );
};

export default PostDetailPage;

// "use client";
// import { useState, useEffect } from 'react';
// import { db, auth } from '../../firebase';
// import { doc, getDoc, collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
// import { onAuthStateChanged } from 'firebase/auth';
// import Sidebar from "../../Sidebar/page"


// const PostDetailPage = ({ params }) => {
//     const { id } = params;
//     const [post, setPost] = useState(null);
//     const [comments, setComments] = useState([]);
//     const [newComment, setNewComment] = useState("");
//     const [user, setUser] = useState(null);
//     const [postAuthor, setPostAuthor] = useState(null);

//     // ログイン中のユーザーを取得
//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//             if (currentUser) {
//                 setUser({
//                     id: currentUser.uid,
//                     name: currentUser.displayName,
//                     profile_image_url: currentUser.photoURL || "/default_icon.png",
//                 });
//             } else {
//                 setUser(null);
//             }
//         });
//         return () => unsubscribe();
//     }, []);

//     // 投稿データと投稿者情報を取得
//     useEffect(() => {
//         if (id) {
//             const fetchPost = async () => {
//                 const postRef = doc(db, 'post', id);
//                 const postSnap = await getDoc(postRef);
//                 if (postSnap.exists()) {
//                     const postData = { id: postSnap.id, ...postSnap.data() };
//                     setPost(postData);

//                     // 投稿者の情報を取得
//                     const userRef = doc(db, 'users', postData.user_id);
//                     const userSnap = await getDoc(userRef);
//                     if (userSnap.exists()) {
//                         setPostAuthor(userSnap.data());
//                     }
//                 }
//             };
//             fetchPost();
//         }
//     }, [id]);

//     // コメントデータをリアルタイムで取得
//     useEffect(() => {
//         if (id) {
//             const q = query(collection(db, 'post', id, 'comments'), orderBy('created_at', 'asc'));
//             const unsubscribe = onSnapshot(q, async (snapshot) => {
//                 const commentsData = await Promise.all(
//                     snapshot.docs.map(async (commentDoc) => {
//                         const comment = commentDoc.data();
//                         const userRef = doc(db, 'users', comment.user_id);
//                         const userSnap = await getDoc(userRef);
//                         const userData = userSnap.exists() ? userSnap.data() : {};
//                         return {
//                             id: commentDoc.id,
//                             ...comment,
//                             user_name: userData.name || "名無し",
//                             user_icon: userData.profile_image_url || "/default_icon.png",
//                         };
//                     })
//                 );
//                 setComments(commentsData);
//             });
//             return () => unsubscribe();
//         }
//     }, [id]);

//     // コメントを追加する処理
//     const handleAddComment = async () => {
//         if (newComment.trim() && user) {
//             await addDoc(collection(db, 'post', id, 'comments'), {
//                 text: newComment,
//                 created_at: new Date(),
//                 user_id: user.id,
//                 user_name: user.name,
//                 user_icon: user.profile_image_url,
//             });
//             setNewComment("");
//         }
//     };

//     if (!post) return <p>読み込み中...</p>;

//     return (
//         <div style={styles.container}>
//             <Sidebar />
//             {/* <h2 style={styles.postContent}>{post.content}</h2> */}
//             {postAuthor && (
//                 <div style={styles.authorContainer}>
//                     <img
//                         src={postAuthor.profile_image_url || "/default_icon.png"}
//                         alt="Post Author Icon"
//                         style={styles.authorIcon}
//                     />
//                     <p style={styles.authorName}>{postAuthor.name}</p>
//                 </div>
//             )}
//             <h2 style={styles.postContent}>{post.content}</h2>
//             <p style={styles.likes}>いいね: {post.likes} コメント <span style={styles.commentCount}>({comments.length})</span></p>
//             <hr style={styles.separator} />
//             <h3 style={styles.commentHeader}>
//                 {/* コメント <span style={styles.commentCount}>({comments.length})</span> */}
//             </h3>
//             <div style={styles.commentsContainer}>
//                 {comments.map((comment) => (
//                     <div key={comment.id} style={styles.comment}>
//                         <img
//                             src={comment.user_icon}
//                             alt="User Icon"
//                             style={styles.commentIcon}
//                         />
//                         <p style={styles.commentText}><strong>{comment.user_name}</strong>: {comment.text}</p>
//                     </div>
//                 ))}
//             </div>
//             <textarea
//                 value={newComment}
//                 onChange={(e) => setNewComment(e.target.value)}
//                 placeholder="コメントを追加"
//                 style={styles.textarea}
//             />
//             <button onClick={handleAddComment} disabled={!user} style={styles.button}>コメントを投稿</button>
//         </div>
//     );
// };

// export default PostDetailPage;

// // スタイルの追加
const styles = {
    container: {
        maxWidth: '600px',
        margin: '0 auto',
        padding: '16px',
        fontFamily: 'Arial, sans-serif',
    },
    postContent: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#333',
    },
    authorContainer: {
        display: 'flex',
        alignItems: 'center',
        marginTop: '8px',
    },
    authorIcon: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        marginRight: '8px',
    },
    authorName: {
        fontSize: '16px',
        color: '#555',
    },
    likes: {
        fontSize: '14px',
        color: '#666',
        marginTop: '8px',
    },
    separator: {
        margin: '16px 0',
        border: 'none',
        borderBottom: '1px solid #ddd',
    },
    commentHeader: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333',
        display: 'flex',
        alignItems: 'center',
    },
    commentCount: {
        fontSize: '16px',
        fontWeight: 'normal',
        color: '#1da1f2', // Xのカラーテーマ
        marginLeft: '4px',
    },
    commentsContainer: {
        marginTop: '16px',
    },
    comment: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px',
    },
    commentIcon: {
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        marginRight: '8px',
    },
    commentText: {
        fontSize: '14px',
        color: '#555',
    },
    textarea: {
        width: '100%',
        padding: '8px',
        fontSize: '14px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        marginTop: '16px',
    },
    button: {
        marginTop: '8px',
        padding: '8px 16px',
        fontSize: '14px',
        color: '#fff',
        backgroundColor: '#1da1f2', // Xのブルーカラー
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
};


// import { useState, useEffect } from 'react';
// import { db, auth } from '../../firebase';
// import { doc, getDoc, collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
// import { onAuthStateChanged } from 'firebase/auth';
// import Sidebar from "../../Sidebar/page"


// const PostDetailPage = ({ params }) => {
//     const { id } = params;
//     const [post, setPost] = useState(null);
//     const [comments, setComments] = useState([]);
//     const [newComment, setNewComment] = useState("");
//     const [user, setUser] = useState(null);
//     const [postAuthor, setPostAuthor] = useState(null);

//     // ログイン中のユーザーを取得
//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//             if (currentUser) {
//                 setUser({
//                     id: currentUser.uid,
//                     name: currentUser.displayName,
//                     profile_image_url: currentUser.photoURL || "/default_icon.png",
//                 });
//             } else {
//                 setUser(null);
//             }
//         });
//         return () => unsubscribe();
//     }, []);

//     // 投稿データと投稿者情報を取得
//     useEffect(() => {
//         if (id) {
//             const fetchPost = async () => {
//                 const postRef = doc(db, 'post', id);
//                 const postSnap = await getDoc(postRef);
//                 if (postSnap.exists()) {
//                     const postData = { id: postSnap.id, ...postSnap.data() };
//                     setPost(postData);

//                     // 投稿者の情報を取得
//                     const userRef = doc(db, 'users', postData.user_id);
//                     const userSnap = await getDoc(userRef);
//                     if (userSnap.exists()) {
//                         setPostAuthor(userSnap.data());
//                     }
//                 }
//             };
//             fetchPost();
//         }
//     }, [id]);

//     // コメントデータをリアルタイムで取得
//     useEffect(() => {
//         if (id) {
//             const q = query(collection(db, 'post', id, 'comments'), orderBy('created_at', 'asc'));
//             const unsubscribe = onSnapshot(q, async (snapshot) => {
//                 const commentsData = await Promise.all(
//                     snapshot.docs.map(async (commentDoc) => {
//                         const comment = commentDoc.data();
//                         const userRef = doc(db, 'users', comment.user_id);
//                         const userSnap = await getDoc(userRef);
//                         const userData = userSnap.exists() ? userSnap.data() : {};
//                         return {
//                             id: commentDoc.id,
//                             ...comment,
//                             user_name: userData.name || "名無し",
//                             user_icon: userData.profile_image_url || "/default_icon.png",
//                         };
//                     })
//                 );
//                 setComments(commentsData);
//             });
//             return () => unsubscribe();
//         }
//     }, [id]);

//     // コメントを追加する処理
//     const handleAddComment = async () => {
//         if (newComment.trim() && user) {
//             await addDoc(collection(db, 'post', id, 'comments'), {
//                 text: newComment,
//                 created_at: new Date(),
//                 user_id: user.id,
//                 user_name: user.name,
//                 user_icon: user.profile_image_url,
//             });
//             setNewComment("");
//         }
//     };

//     if (!post) return <p>読み込み中...</p>;

//     return (
//         <div style={styles.container}>
//             <Sidebar />
//             <div style={styles.postContainer}>
//                 {/* <h2 style={styles.postContent}>{post.content}</h2> */}
//                 {postAuthor && (
//                     <div style={styles.authorContainer}>
//                         <img
//                             src={postAuthor.profile_image_url || "/default_icon.png"}
//                             alt="Post Author Icon"
//                             style={styles.authorIcon}
//                         />
//                         <p style={styles.authorName}>{postAuthor.name}</p>
//                     </div>
//                 )}
//                 <h2 style={styles.postContent}>{post.content}</h2>
//                 <div style={styles.likes}>
//                     <p>いいね: {post.likes} コメント</p>
//                     {/* <h3 style={styles.commentHeader}>コメント:</h3> */}
//                 </div>
//             </div>
//             <hr style={styles.separator} />
//             {/* <h3 style={styles.commentHeader}>コメント:</h3> */}
//             <div style={styles.commentsContainer}>
//                 {comments.map((comment) => (
//                     <div key={comment.id} style={styles.comment}>
//                         <img
//                             src={comment.user_icon}
//                             alt="User Icon"
//                             style={styles.commentIcon}
//                         />
//                         <div style={styles.commentContent}>
//                             <p style={styles.commentAuthor}><strong>{comment.user_name}</strong></p>
//                             <p style={styles.commentText}>{comment.text}</p>
//                         </div>
//                     </div>
//                 ))}
//             </div>
//             <textarea
//                 value={newComment}
//                 onChange={(e) => setNewComment(e.target.value)}
//                 placeholder="コメントを追加"
//                 style={styles.textarea}
//             />
//             <button onClick={handleAddComment} disabled={!user} style={styles.button}>コメントを投稿</button>
//         </div>
//     );
// };

// export default PostDetailPage;

// // スタイルの追加
// const styles = {
//     container: {
//         maxWidth: '600px',
//         margin: '0 auto',
//         padding: '16px',
//         fontFamily: 'Arial, sans-serif',
//     },
//     postContainer: {
//         backgroundColor: '#f8f9fa',
//         padding: '16px',
//         borderRadius: '8px',
//         marginBottom: '16px',
//     },
//     postContent: {
//         fontSize: '20px',
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     authorContainer: {
//         display: 'flex',
//         alignItems: 'center',
//         marginTop: '8px',
//     },
//     authorIcon: {
//         width: '40px',
//         height: '40px',
//         borderRadius: '50%',
//         marginRight: '8px',
//     },
//     authorName: {
//         fontSize: '16px',
//         color: '#555',
//     },
//     likes: {
//         fontSize: '14px',
//         color: '#666',
//         marginTop: '8px',
//     },
//     separator: {
//         margin: '16px 0',
//         border: 'none',
//         borderBottom: '1px solid #ddd',
//     },
//     // commentHeader: {
//     //     fontSize: '18px',
//     //     fontWeight: 'bold',
//     //     color: '#333',
//     // },
//     commentsContainer: {
//         marginTop: '16px',
//     },
//     comment: {
//         display: 'flex',
//         alignItems: 'flex-start',
//         marginBottom: '12px',
//     },
//     commentIcon: {
//         width: '30px',
//         height: '30px',
//         borderRadius: '50%',
//         marginRight: '8px',
//     },
//     commentContent: {
//         backgroundColor: '#f0f0f0',
//         padding: '8px',
//         borderRadius: '8px',
//         width: '100%',
//     },
//     commentAuthor: {
//         fontSize: '14px',
//         color: '#333',
//     },
//     commentText: {
//         fontSize: '14px',
//         color: '#555',
//         marginTop: '4px',
//     },
//     textarea: {
//         width: '100%',
//         padding: '8px',
//         fontSize: '14px',
//         borderRadius: '8px',
//         border: '1px solid #ddd',
//         marginTop: '16px',
//     },
//     button: {
//         marginTop: '8px',
//         padding: '8px 16px',
//         fontSize: '14px',
//         color: '#fff',
//         backgroundColor: '#1da1f2', // Xのブルーカラー
//         border: 'none',
//         borderRadius: '8px',
//         cursor: 'pointer',
//         transition: 'background-color 0.2s',
//     },
// };


// import { useState, useEffect } from 'react';
// import { db, auth } from '../../firebase';
// import { doc, getDoc, collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
// import { onAuthStateChanged } from 'firebase/auth';

// const PostDetailPage = ({ params }) => {
//     const { id } = params;
//     const [post, setPost] = useState(null);
//     const [comments, setComments] = useState([]);
//     const [newComment, setNewComment] = useState("");
//     const [user, setUser] = useState(null);
//     const [postAuthor, setPostAuthor] = useState(null); // 投稿者の情報

//     // ログイン中のユーザーを取得
//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//             if (currentUser) {
//                 setUser({
//                     id: currentUser.uid,
//                     name: currentUser.displayName,
//                     profile_image_url: currentUser.photoURL || "/default_icon.png",
//                 });
//             } else {
//                 setUser(null);
//             }
//         });
//         return () => unsubscribe();
//     }, []);

//     // 投稿データと投稿者情報を取得
//     useEffect(() => {
//         if (id) {
//             const fetchPost = async () => {
//                 const postRef = doc(db, 'post', id);
//                 const postSnap = await getDoc(postRef);
//                 if (postSnap.exists()) {
//                     const postData = { id: postSnap.id, ...postSnap.data() };
//                     setPost(postData);

//                     // 投稿者の情報を取得
//                     const userRef = doc(db, 'users', postData.user_id);
//                     const userSnap = await getDoc(userRef);
//                     if (userSnap.exists()) {
//                         setPostAuthor(userSnap.data());
//                     }
//                 }
//             };
//             fetchPost();
//         }
//     }, [id]);

//     // コメントデータをリアルタイムで取得
//     useEffect(() => {
//         if (id) {
//             const q = query(collection(db, 'post', id, 'comments'), orderBy('created_at', 'asc'));
//             const unsubscribe = onSnapshot(q, async (snapshot) => {
//                 const commentsData = await Promise.all(
//                     snapshot.docs.map(async (commentDoc) => {
//                         const comment = commentDoc.data();
//                         const userRef = doc(db, 'users', comment.user_id);
//                         const userSnap = await getDoc(userRef);
//                         const userData = userSnap.exists() ? userSnap.data() : {};
//                         return {
//                             id: commentDoc.id,
//                             ...comment,
//                             user_name: userData.name || "名無し",
//                             user_icon: userData.profile_image_url || "/default_icon.png",
//                         };
//                     })
//                 );
//                 setComments(commentsData);
//             });
//             return () => unsubscribe();
//         }
//     }, [id]);

//     // コメントを追加する処理
//     const handleAddComment = async () => {
//         if (newComment.trim() && user) {
//             await addDoc(collection(db, 'post', id, 'comments'), {
//                 text: newComment,
//                 created_at: new Date(),
//                 user_id: user.id,
//                 user_name: user.name,
//                 user_icon: user.profile_image_url,
//             });
//             setNewComment("");
//         }
//     };

//     if (!post) return <p>読み込み中...</p>;

//     return (
//         <div>
//             <h2>{post.content}</h2>
//             {postAuthor && (
//                 <div style={{ display: "flex", alignItems: "center" }}>
//                     <img
//                         src={postAuthor.profile_image_url || "/default_icon.png"}
//                         alt="Post Author Icon"
//                         style={{ width: 50, height: 50, borderRadius: "50%", marginRight: 8 }}
//                     />
//                     <p>投稿者: {postAuthor.name}</p>
//                 </div>
//             )}
//             <p>いいね: {post.likes}</p>
//             <hr />
//             <h3>コメント:</h3>
//             <div>
//                 {comments.map((comment) => (
//                     <div key={comment.id} style={{ display: "flex", alignItems: "center" }}>
//                         <img
//                             src={comment.user_icon}
//                             alt="User Icon"
//                             style={{ width: 30, height: 30, borderRadius: "50%", marginRight: 8 }}
//                         />
//                         <p><strong>{comment.user_name}</strong>: {comment.text}</p>
//                     </div>
//                 ))}
//             </div>
//             <textarea
//                 value={newComment}
//                 onChange={(e) => setNewComment(e.target.value)}
//                 placeholder="コメントを追加"
//             />
//             <button onClick={handleAddComment} disabled={!user}>コメントを投稿</button>
//         </div>
//     );
// };

// export default PostDetailPage;

// import { useState, useEffect } from 'react';
// import { db, auth } from '../../firebase'; // Firebaseのインポート（適宜修正）
// import { doc, getDoc, collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
// import { onAuthStateChanged } from 'firebase/auth'; // Firebase Authのインポート

// const PostDetailPage = ({ params }) => {
//     const { id } = params; // paramsからidを取得
//     const [post, setPost] = useState(null); // 投稿の状態
//     const [comments, setComments] = useState([]); // コメントの状態
//     const [newComment, setNewComment] = useState(""); // 新しいコメント
//     const [user, setUser] = useState(null); // ログイン中のユーザー情報

//     // ログイン中のユーザーを取得
//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//             if (currentUser) {
//                 setUser({
//                     id: currentUser.uid,
//                     name: currentUser.displayName,
//                     profile_image_url: currentUser.photoURL || "/default_icon.png", // アイコンがない場合はデフォルトを設定
//                 });
//             } else {
//                 setUser(null);
//             }
//         });

//         return () => unsubscribe();
//     }, []);

//     // 投稿データを取得
//     useEffect(() => {
//         if (id) {
//             const fetchPost = async () => {
//                 const postRef = doc(db, 'post', id); // Firestoreの投稿データ
//                 const postSnap = await getDoc(postRef);
//                 if (postSnap.exists()) {
//                     setPost({ id: postSnap.id, ...postSnap.data() });
//                 }
//             };

//             fetchPost();
//         }
//     }, [id]);

//     // コメントデータをリアルタイムで取得
//     useEffect(() => {
//         if (id) {
//             const q = query(collection(db, 'post', id, 'comments'), orderBy('created_at', 'asc'));
//             const unsubscribe = onSnapshot(q, async (snapshot) => {
//                 const commentsData = await Promise.all(
//                     snapshot.docs.map(async (commentDoc) => {
//                         const comment = commentDoc.data();
//                         const userRef = doc(db, 'users', comment.user_id);
//                         const userSnap = await getDoc(userRef);
//                         const userData = userSnap.exists() ? userSnap.data() : {};
//                         return {
//                             id: commentDoc.id,
//                             ...comment,
//                             user_name: userData.name || "名無し",
//                             user_icon: userData.profile_image_url || "/default_icon.png",
//                         };
//                     })
//                 );
//                 setComments(commentsData);
//             });

//             return () => unsubscribe();
//         }
//     }, [id]);

//     // コメントを追加する処理
//     const handleAddComment = async () => {
//         if (newComment.trim() && user) { // userが存在する場合のみ処理を行う
//             await addDoc(collection(db, 'post', id, 'comments'), {
//                 text: newComment,
//                 created_at: new Date(),
//                 user_id: user.id,
//                 user_name: user.name,
//                 user_icon: user.profile_image_url,
//             });
//             setNewComment(""); // コメント追加後に入力フィールドをクリア
//         }
//     };

//     if (!post) return <p>読み込み中...</p>;

//     return (
//         <div>
//             <h2>{post.content}</h2>
//             <p>投稿者: {post.user_name}</p>
//             <p>いいね: {post.likes}</p>
//             <hr />
//             <h3>コメント:</h3>
//             <div>
//                 {comments.map((comment) => (
//                     <div key={comment.id} style={{ display: "flex", alignItems: "center" }}>
//                         <img
//                             src={comment.user_icon}
//                             alt="User Icon"
//                             style={{ width: 30, height: 30, borderRadius: "50%", marginRight: 8 }}
//                         />
//                         <p><strong>{comment.user_name}</strong>: {comment.text}</p>
//                     </div>
//                 ))}
//             </div>
//             <textarea
//                 value={newComment}
//                 onChange={(e) => setNewComment(e.target.value)}
//                 placeholder="コメントを追加"
//             />
//             <button onClick={handleAddComment} disabled={!user}>コメントを投稿</button>
//         </div>
//     );
// };

// export default PostDetailPage;
