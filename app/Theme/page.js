// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import DatePicker from 'react-datepicker';
// import 'react-datepicker/dist/react-datepicker.css';
// import { db } from '../firebase';
// import { collection, addDoc, serverTimestamp, query, where, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
// import { getAuth, onAuthStateChanged } from 'firebase/auth';
// import '../../style/theme.css';

// const ALLOWED_EMAILS = ['s22026@std.it-college.ac.jp', ''];

// const Theme = () => {
//     const [themeText, setThemeText] = useState('');
//     const [postTime, setPostTime] = useState(new Date());
//     const [user, setUser] = useState(null);
//     const [isAuthorized, setIsAuthorized] = useState(false);
//     const router = useRouter();
//     const auth = getAuth();
//     const [newContent, setNewContent] = useState("");


//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//             setUser(currentUser);
//             setIsAuthorized(currentUser && ALLOWED_EMAILS.includes(currentUser.email));
//         });

//         return () => unsubscribe();
//     }, []);

//         // ログイン中のユーザーを取得
//         useEffect(() => {
//             const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//                 if (currentUser) {
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
//                 } else {
//                     setUser(null);
//                 }
//             });
//             return () => unsubscribe();
//         }, []);

//         const handlePost = async () => {
//             if (!isAuthorized) {
//                 alert('お題の投稿権限がありません。');
//                 return;
//             }
        
//             if (!themeText.trim()) {
//                 alert('お題を入力してください。');
//                 return;
//             }
        
//             if (postTime < new Date()) {
//                 alert('現在時刻より後の時間を選択してください。');
//                 return;
//             }
        
//             try {
//                 const postData = {
//                     content: themeText,
//                     postTime: serverTimestamp(),
//                     scheduled_at: postTime.getTime(), // ミリ秒単位のタイムスタンプ
//                     visible_at: postTime.getTime(), // 表示開始時間を追加
//                     user_name: '管理者',
//                     user_icon: '/images/God.png', // 画像のパスを文字列として保存
//                     likes: 0,
//                     likedBy: [],
//                     comments_count: 0,
//                     isTheme: true,
//                     create_at: serverTimestamp(),
//                 };
        
//                 const docRef = await addDoc(collection(db, 'post'), postData);
        
//                 if (docRef.id) {
//                     alert('お題を投稿しました！指定した時間に表示されます。');
//                     router.push('/PostList');
//                 }
//             } catch (error) {
//                 console.error("Error adding theme: ", error);
//                 alert(`投稿中にエラーが発生しました。エラー: ${error.message}`);
//             }
//         };

        // const handlePostSubmit = async () => {
        //     if (!user) {
        //         alert("ログインしてください。");
        //         return;
        //     }
        //     if (!newContent.trim()) {
        //         alert("投稿内容を入力してください。");
        //         return;
        //     }
        
        //     try {
        //         const postRef = collection(db, "post");
        //         const newPost = {
        //             content: newContent,
        //             user_name: user.name || "名無し",
        //             user_icon: God.src,
        //             create_at: new Date(),
        //             likes: 0,
        //             likedBy: [],
        //             comments_count: 0,
        //             scheduled_at: null,
        //             isTheme: false,
        //         };
        
        //         await addDoc(postRef, newPost);
        //         setNewContent(""); // 入力欄をリセット
        //         console.log("投稿が保存されました！");
        //     } catch (error) {
        //         console.error("投稿の保存に失敗しました: ", error);
        //     }
        // };
        

    // const handleGoBack = () => {
    //     router.push('/PostList');  // '/PostList'へ遷移
    // };

    // if (!user) {
    //     return <div className="p-4">ログインしてください。</div>;
    // }

    // if (!isAuthorized) {
    //     return <div className="p-4">お題の投稿権限がありません。</div>;
    // }

//     return (
//         <div className="centered-container">
//             <div className="card">
//                 <h1 className="theme-post">🎉 お題投稿 🎉</h1>
    
//                 <div className="mb-6">
//                     <label className="label">
//                         お題を入力してください
//                     </label>
//                     <input 
//                         type="text" 
//                         value={themeText} 
//                         onChange={(e) => setThemeText(e.target.value)} 
//                         placeholder="今日の夕飯は何を食べる？🍛" 
//                         className="text-input"
//                         maxLength={100}
//                     />
//                 </div>
    
//                 <div className="mb-6">
//                     <label className="label">
//                         表示開始時間 ⏰
//                     </label>
//                     <DatePicker
//                         selected={postTime}
//                         onChange={(date) => setPostTime(date)}
//                         showTimeSelect
//                         timeFormat="HH:mm"
//                         timeIntervals={1}
//                         minDate={new Date()}
//                         dateFormat="yyyy/MM/dd HH:mm"
//                         className="date-picker"
//                     />
//                 </div>
    
//                 <div className="post-cansel">
//                     <button 
//                         onClick={handlePost}
//                         className="post-button"
//                     >
//                         🚀 投稿する
//                     </button>
//                     <button
//                         onClick={handleGoBack}
//                         className="cancel-button"
//                     >
//                         🔙 戻る
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
    
// };

// export default Theme;


'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '../firebase';
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    query, 
    where, 
    getDoc, 
    getDocs, 
    deleteDoc, 
    doc,
    orderBy,
    limit
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import '../../style/theme.css';

const ALLOWED_EMAILS = ['s22026@std.it-college.ac.jp', 's22001@std.it-college.ac.jp', 's22022@std.it-college.ac.jp', 's22028@std.it-college.ac.jp'];
const DELETE_WINDOW_MINUTES = 1; // 1 minute delete window

const Theme = () => {
    const [themeText, setThemeText] = useState('');
    const [postTime, setPostTime] = useState(new Date());
    const [user, setUser] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [recentThemes, setRecentThemes] = useState([]);
    const router = useRouter();
    const auth = getAuth();
    const [newContent, setNewContent] = useState("");

    // Authentication and User Setup (previous useEffects remain the same)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthorized(currentUser && ALLOWED_EMAILS.includes(currentUser.email));
            if (currentUser) {
                fetchRecentThemes(currentUser.email);
            }
        });

        return () => unsubscribe();
    }, [auth]);
    // useEffect(() => {
    //     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    //         setUser(currentUser);
    //         setIsAuthorized(currentUser && ALLOWED_EMAILS.includes(currentUser.email));
    //     });

    //     return () => unsubscribe();
    // }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const q = query(collection(db, "users"), where("email", "==", currentUser.email));
                const userSnapshot = await getDocs(q);
                if (!userSnapshot.empty) {
                    const userData = userSnapshot.docs[0].data();
                    setUser({
                        id: userSnapshot.docs[0].id,
                        uid: userData.uid,
                        ...userData,
                    });
    
                    // ユーザーの最新のお題を取得
                    await fetchRecentThemes(currentUser.email);
                }
            } else {
                setUser(null);
            }
        });
    
        return () => unsubscribe();
    }, [auth]);  // authが変更された場合にのみ実行されるようにする
    

    // useEffect(() => {
    //     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    //         if (currentUser) {
    //             const q = query(collection(db, "users"), where("email", "==", currentUser.email));
    //             const userSnapshot = await getDocs(q);
    //             if (!userSnapshot.empty) {
    //                 const userData = userSnapshot.docs[0].data();
    //                 setUser({
    //                     id: userSnapshot.docs[0].id,
    //                     uid: userData.uid,
    //                     ...userData,
    //                 });
                    
    //                 // Fetch recent themes for this user
    //                 await fetchRecentThemes(currentUser.email);
    //             }
    //         } else {
    //             setUser(null);
    //         }
    //     });
    //     return () => unsubscribe();
    // }, []);

    // Fetch recent themes for deletion (modified and added)
const fetchRecentThemes = async (userEmail) => {
    try {
        const oneMinuteAgo = new Date(Date.now() - DELETE_WINDOW_MINUTES * 60 * 1000);
        const q = query(
            collection(db, 'post'), 
            where('user_name', '==', '管理者'),
            where('create_at', '>', oneMinuteAgo),
            orderBy('create_at', 'desc')
        );
        const snapshot = await getDocs(q);
        const themes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setRecentThemes(themes);
    } catch (error) {
        console.error("Error fetching recent themes: ", error);
    }
};

// Delete a recently posted theme
const handleDeleteTheme = async (themeId) => {
    try {
        await deleteDoc(doc(db, 'post', themeId));
        alert('お題を削除しました。');
        // Refresh recent themes
        await fetchRecentThemes(user.email);
    } catch (error) {
        console.error("Error deleting theme: ", error);
        alert(`削除中にエラーが発生しました。エラー: ${error.message}`);
    }
};

    // // Fetch recent themes for deletion
    // const fetchRecentThemes = async (userEmail) => {
    //     try {
    //         const oneMinuteAgo = new Date(Date.now() - DELETE_WINDOW_MINUTES * 60 * 1000);
    //         const q = query(
    //             collection(db, 'post'), 
    //             where('user_name', '==', '管理者'),
    //             where('create_at', '>', oneMinuteAgo),
    //             orderBy('create_at', 'desc')
    //         );
    //         const snapshot = await getDocs(q);
    //         const themes = snapshot.docs.map(doc => ({
    //             id: doc.id,
    //             ...doc.data()
    //         }));
    //         setRecentThemes(themes);
    //     } catch (error) {
    //         console.error("Error fetching recent themes: ", error);
    //     }
    // };

    // // Delete a recently posted theme
    // const handleDeleteTheme = async (themeId) => {
    //     try {
    //         await deleteDoc(doc(db, 'post', themeId));
    //         alert('お題を削除しました。');
    //         // Refresh recent themes
    //         await fetchRecentThemes(user.email);
    //     } catch (error) {
    //         console.error("Error deleting theme: ", error);
    //         alert(`削除中にエラーが発生しました。エラー: ${error.message}`);
    //     }
    // };

    const handlePost = async () => {
        if (!isAuthorized) {
            alert('お題の投稿権限がありません。');
            return;
        }
    
        if (!themeText.trim()) {
            alert('お題を入力してください。');
            return;
        }
    
        if (postTime < new Date()) {
            alert('現在時刻より後の時間を選択してください。');
            return;
        }
    
        try {
            const postData = {
                content: themeText,
                postTime: serverTimestamp(),
                scheduled_at: postTime.getTime(),
                visible_at: postTime.getTime(),
                user_name: '管理者',
                user_icon: '/images/God.png',
                likes: 0,
                likedBy: [],
                comments_count: 0,
                isTheme: true,
                create_at: serverTimestamp(),
            };
    
            const docRef = await addDoc(collection(db, 'post'), postData);
    
            if (docRef.id) {
                alert('お題を投稿しました！指定した時間に表示されます。');
                // Refresh recent themes
                await fetchRecentThemes(user.email);
                router.push('/PostList');
            }
        } catch (error) {
            console.error("Error adding theme: ", error);
            alert(`投稿中にエラーが発生しました。エラー: ${error.message}`);
        }
    };

    const handleGoBack = () => {
        router.push('/PostList');  // '/PostList'へ遷移
    };

    if (!user) {
        return <div className="p-4">ログインしてください。</div>;
    }

    if (!isAuthorized) {
        return <div className="p-4">お題の投稿権限がありません。</div>;
    }

    if (!user) {
        return <div className="p-4">ログインしてください。</div>;
    }

    if (!isAuthorized) {
        return <div className="p-4">お題の投稿権限がありません。</div>;
    }

    return (
        <div className="centered-container">
            <div className="card">
                <h1 className="theme-post">🎉 お題投稿 🎉</h1>
    
                <div className="mb-6">
                    <label className="label">
                        お題を入力してください
                    </label>
                    <input 
                        type="text" 
                        value={themeText} 
                        onChange={(e) => setThemeText(e.target.value)} 
                        placeholder="今日の夕飯は何を食べる？🍛" 
                        className="text-input"
                        maxLength={100}
                    />
                </div>
    
                <div className="mb-6">
                    <label className="label">
                        表示開始時間 ⏰
                    </label>
                    <DatePicker
                        selected={postTime}
                        onChange={(date) => setPostTime(date)}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={1}
                        minDate={new Date()}
                        dateFormat="yyyy/MM/dd HH:mm"
                        className="date-picker"
                    />
                </div>
    
                <div className="post-cansel">
                    <button 
                        onClick={handlePost}
                        className="post-button"
                    >
                        🚀 投稿する
                    </button>
                    <button
                        onClick={handleGoBack}
                        className="cancel-button"
                    >
                        🔙 戻る
                    </button>
                </div>

                {/* Recent Themes Deletion Section */}
                {recentThemes.length > 0 && (
                    <div className="mt-4">
                        <h2 className="text-lg font-bold mb-2">最近投稿したお題</h2>
                        {recentThemes.map((theme) => (
                            <div key={theme.id} className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded">
                                <span>{theme.content}</span>
                                <button 
                                    onClick={() => handleDeleteTheme(theme.id)}
                                    className="bg-red-500 text-white px-2 py-1 rounded"
                                >
                                    削除
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Theme;

// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import DatePicker from 'react-datepicker';
// import 'react-datepicker/dist/react-datepicker.css';
// import { db } from '../firebase';
// import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
// import { getAuth, onAuthStateChanged } from 'firebase/auth';

// const ALLOWED_EMAILS = ['s22026@std.it-college.ac.jp', 's22022@std.it-college.ac.jp','s22028@std.it-college.ac.jp','s22001@std.it-college.ac.jp'];

// const Theme = () => {
//     const [themeText, setThemeText] = useState('');
//     const [postTime, setPostTime] = useState(new Date());
//     const [user, setUser] = useState(null);
//     const [isAuthorized, setIsAuthorized] = useState(false);
//     const router = useRouter();
//     const auth = getAuth();

//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//             setUser(currentUser);
//             setIsAuthorized(currentUser && ALLOWED_EMAILS.includes(currentUser.email));
//         });

//         return () => unsubscribe();
//     }, []);

//     const handlePost = async () => {
//         if (!isAuthorized) {
//             alert('お題の投稿権限がありません。');
//             return;
//         }

//         if (!themeText.trim()) {
//             alert('お題を入力してください。');
//             return;
//         }

//         if (postTime < new Date()) {
//             alert('現在時刻より後の時間を選択してください。');
//             return;
//         }

//         try {
//             // Firestoreのタイムスタンプ形式で保存
//             const postData = {
//                 content: themeText,
//                 postTime: serverTimestamp(), // 投稿時間
//                 scheduled_at: postTime.getTime(), // 表示予定時間
//                 user_id: user.uid,
//                 user_name: '管理者',
//                 user_icon: user.photoURL || '',
//                 likes: 0,
//                 likedBy: [],
//                 comments_count: 0,
//                 isTheme: true,
//                 isVisible: false,
//                 create_at: serverTimestamp()
//             };

//             const docRef = await addDoc(collection(db, 'post'), postData);
            
//             if (docRef.id) {
//                 alert('お題を投稿しました！指定した時間に表示されます。');
//                 router.push('/PostList');
//             }
//         } catch (error) {
//             console.error("Error adding theme: ", error);
//             alert(`投稿中にエラーが発生しました。エラー: ${error.message}`);
//         }
//     };

//     const handleGoBack = () => {
//         router.push('/PostList');  // '/PostList'へ遷移
//     };

//     if (!user) {
//         return <div className="p-4">ログインしてください。</div>;
//     }

//     if (!isAuthorized) {
//         return <div className="p-4">お題の投稿権限がありません。</div>;
//     }

//     return (
//         <div className="max-w-2xl mx-auto p-4">
//             <h1 className="text-2xl font-bold mb-6">お題投稿</h1>
            
//             <div className="mb-6">
//                 <label className="block text-gray-700 text-sm font-bold mb-2">
//                     お題を入力してください
//                 </label>
//                 <input 
//                     type="text" 
//                     value={themeText} 
//                     onChange={(e) => setThemeText(e.target.value)} 
//                     placeholder="今日の夕飯は何を食べる？" 
//                     className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     maxLength={100}
//                 />
//             </div>

//             <div className="mb-6">
//                 <label className="block text-gray-700 text-sm font-bold mb-2">
//                     表示開始時間
//                 </label>
//                 <DatePicker
//                     selected={postTime}
//                     onChange={(date) => setPostTime(date)}
//                     showTimeSelect
//                     timeFormat="HH:mm"
//                     timeIntervals={5}
//                     minDate={new Date()}
//                     dateFormat="yyyy/MM/dd HH:mm"
//                     className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//             </div>

//             <button 
//                 onClick={handlePost}
//                 className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
//             >
//                 投稿する
//             </button>
//             <button
//                 onClick={handleGoBack}
//                 className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
//             >
//                 戻る
//             </button>
//         </div>
//     );
// };

// export default Theme;