"use client";
import { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, getDoc, collection, addDoc, query, onSnapshot, orderBy, getDocs, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Sidebar from "../../Sidebar/page"
import Image from "next/image";
import God from "../../Images/God.png"
import  NextImage  from 'next/image';
import Searchdummy from "../../Searchdummy/page"



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


    // // 投稿データと投稿者情報を取得
    // useEffect(() => {
    //     if (id) {
    //         const fetchPost = async () => {
    //             const postRef = doc(db, 'post', id);
    //             const postSnap = await getDoc(postRef);
    //             if (postSnap.exists()) {
    //                 const postData = { id: postSnap.id, ...postSnap.data() };
    //                 setPost(postData);

    //                 // 投稿者の情報を取得
    //                 const userRef = doc(db, 'users', postData.uid);
    //                 const userSnap = await getDoc(userRef);
    //                 if (userSnap.exists()) {
    //                     setPostAuthor(userSnap.data());
    //                 }
    //             }
    //         };
    //         fetchPost();
    //     }
    // }, [id]);

    useEffect(() => {
        if (id) {
            const fetchPost = async () => {
                try {
                    const postRef = doc(db, 'post', id);
                    const postSnap = await getDoc(postRef);
                    if (postSnap.exists()) {
                        const postData = { id: postSnap.id, ...postSnap.data() };
                        console.log("Post Data:", postData); // Log the post data to inspect its structure

                        // Check if uid exists before trying to fetch user
                        if (postData.uid) {
                            const userRef = doc(db, 'users', postData.uid);
                            const userSnap = await getDoc(userRef);
                            if (userSnap.exists()) {
                                setPostAuthor(userSnap.data());
                            } else {
                                console.warn(`No user found for UID: ${postData.uid}`);
                            }
                        } else {
                            console.warn("No UID found in post data");
                        }

                        setPost(postData);
                    } else {
                        console.warn(`No post found with ID: ${id}`);
                    }
                } catch (error) {
                    console.error("Error fetching post:", error);
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

            {/* 投稿者情報 */}
            <div style={styles.UserData}>
                {postAuthor && (
                    <div style={styles.authorContainer}>
                        <NextImage
                            src={postAuthor.profile_image_url || "/default_icon.png"}
                            alt="Post Author Icon"
                            width={40}
                            height={40}
                            style={styles.authorIcon}
                        />
                        <div style={styles.textContainer}>
                            <p style={styles.authorName}>{postAuthor.name}</p>
                            <h3 style={styles.uid}>{user.uid}</h3>
                        </div>
                    </div>
                )}

                {post.user_icon && (
                    <NextImage
                        src={post.isTheme ? God : post.user_icon}
                        alt="User Icon"
                        width={50}
                        height={50}
                        className="post_icon"
                        style={{
                            objectFit: 'cover',
                            borderRadius: '50%', // 丸型アイコン
                        }}
                    />
                )}
                <h1>{post.user_name}</h1>
                {/* <h2>{user.uid}</h2> */}
            </div>


            {/* 投稿内容 */}
            <h1 style={styles.postContent}>{post.content}</h1>
            <p style={styles.likes}>
                いいね: {post.likes} コメント <span style={styles.commentCount}>({comments.length})</span>
            </p>
            <hr style={styles.separator} />

            {/* コメントセクション */}
            <h3 style={styles.commentHeader}>コメント</h3>
            <div style={styles.commentsContainer}>
                {comments.map((comment) => (
                    <div key={comment.id} style={styles.comment}>
                        <Image
                            src={comment.user_icon}
                            alt="User Icon"
                            width={30}
                            height={30}
                            style={styles.commentIcon}
                        />
                        <p style={styles.commentText}>
                            <strong>{comment.user_name}</strong>: {comment.text}
                        </p>
                    </div>
                ))}
            </div>

            {/* コメント入力 */}
            <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="コメントを追加"
                style={styles.textarea}
            />
            <button
                onClick={handleAddComment}
                disabled={!user}
                style={styles.button}
            >
                コメントを投稿
            </button>
            <Searchdummy />
        </div>
    );
};

export default PostDetailPage;



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

// "use client";

// import { useState, useEffect } from 'react';
// import { db, auth } from '../../firebase';
// import { doc, getDoc, collection, addDoc, query, onSnapshot, orderBy, getDocs,where } from 'firebase/firestore';
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
//                 (async () => {
//                     const q = query(collection(db, "users"), where("email", "==", currentUser.email));
//                     const userSnapshot = await getDocs(q);
//                     if (!userSnapshot.empty) {
//                         const userData = userSnapshot.docs[0].data();
//                         setUser({
//                             id: userSnapshot.docs[0].id,
//                             uid: userData.uid,
//                             ...userData,
//                         });
//                     }
//                 })();
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
//                     const userRef = doc(db, 'users', postData.uid);
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
// useEffect(() => {
//     if (id) {
//         const q = query(collection(db, 'post', id, 'comments'), orderBy('created_at', 'asc'));
//         const unsubscribe = onSnapshot(q, (snapshot) => {
//             const commentsData = snapshot.docs.map((commentDoc) => {
//                 const comment = commentDoc.data();
//                 return {
//                     id: commentDoc.id,
//                     text: comment.text,
//                     created_at: comment.created_at,
//                     user_name: comment.user_name || "名無し",
//                     user_icon: comment.user_icon || "/default_icon.png",
//                     uid: comment.uid || "不明",
//                 };
//             });
//             setComments(commentsData);
//         });
//         return () => unsubscribe();
//     }
// }, [id]);

//     // コメントを追加する処理
//     const handleAddComment = async () => {
//         if (newComment.trim() && user) {
//             await addDoc(collection(db, 'post', id, 'comments'), {
//                 text: newComment,
//                 created_at: new Date(),
//                 uid: user.uid,
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

