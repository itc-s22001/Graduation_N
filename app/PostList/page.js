"use client";

import { useState, useEffect } from "react";
import { query, collection, orderBy, onSnapshot, where, getDocs, updateDoc, deleteDoc, doc, getDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "../../app/firebase";
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation'; // useRouterのインポート
import Sidebar from "../Sidebar/page";
import '../../styles/PostList.css';
import God from '../Images/God.png';
import Image from "next/image";
import Searchdummy from "../Searchdummy/page";
import "@/styles/SurveyForm.css";

const PostPage = () => {
    const router = useRouter(); // useRouterフックを使ってルーターを取得
    const [posts, setPosts] = useState([]); // 投稿データの状態管理
    const [user, setUser] = useState(null); // ログイン中のユーザー情報の状態管理
    const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState({}); // 削除メニューの状態管理
    const [isConfirmPopupOpen, setIsConfirmPopupOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);
    const [loading, setLoading] = useState(true); // Loading state
    //     const [content, setContent] = useState(""); // 投稿内容の状態
    //     const [image, setImage] = useState(null); // 画像の状態
    const [surveys, setSurveys] = useState([]); // アンケートデータの状態管理
    const [combinedContent, setCombinedContent] = useState([]); // 投稿とアンケートの結合データ

    const [isSurveyConfirmPopupOpen, setSurveyConfirmPopupOpen] = useState(false); // アンケート削除確認ポップアップの状態
    const [surveyToDelete, setSurveyToDelete] = useState(null); // 削除対象のアンケート

    // ログイン中のユーザーを取得
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
                }
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    // 時間に基づいた投稿表示のロジック
    useEffect(() => {
        if (!user) {
            setPosts([]); // ユーザーがログインしていない場合は空の配列
            return;
        }

        const q = query(
            collection(db, 'post'),
            orderBy('create_at', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const now = new Date().getTime(); // 現在時刻（ミリ秒）

            // 全ての投稿を取得し、フィルタリング
            const filteredPosts = await Promise.all(
                querySnapshot.docs.map(async (docSnapshot) => {
                    const post = docSnapshot.data();

                    // コメント数を取得
                    const commentsSnapshot = await getDocs(collection(docSnapshot.ref, "comments"));
                    const commentsCount = commentsSnapshot.size;

                    // 通常の投稿とテーマ投稿を区別
                    if (post.isTheme) {
                        // テーマ投稿は指定時間以降のみ表示
                        return post.scheduled_at && post.scheduled_at <= now
                            ? {
                                id: docSnapshot.id,
                                ...post,
                                likedByUser: (post.likedBy || []).includes(user?.uid),
                                comments_count: commentsCount,
                            }
                            : null;
                    } else {
                        // 通常の投稿は常に表示
                        return {
                            id: docSnapshot.id,
                            ...post,
                            likedByUser: (post.likedBy || []).includes(user?.uid),
                            comments_count: commentsCount,
                        };
                    }
                })
            );

            // nullを除外し、投稿日時の降順でソート
            const validPosts = filteredPosts
                .filter(post => post !== null);

            setPosts(validPosts);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, 'post'), orderBy('scheduled_at', 'asc')); // 投稿の表示順を指定時間でソート

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const now = new Date().getTime(); // 現在時刻
            const postData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                likedByUser: doc.data().likedBy && user?.uid && doc.data().likedBy.includes(user.uid)
            })).filter(post => {
                // scheduled_atが現在時刻より後なら非表示
                const scheduledTime = post.scheduled_at;
                return !post.isTheme || (scheduledTime && scheduledTime <= now);
            });

            setPosts(postData); // フィルタリングしたデータをセット
        });

        return () => unsubscribe(); // クリーンアップ
    }, [user]);

    // アンケートデータの取得
    useEffect(() => {
        const surveysQuery = query(collection(db, "PostList"), orderBy("create_at", "desc"));
        const unsubscribeSurveys = onSnapshot(surveysQuery, (snapshot) => {
            const surveyData = snapshot.docs.map((doc) => ({
                id: doc.id,
                type: "survey",
                ...doc.data(),
                hasVoted: doc.data().respondents?.includes(user?.uid) || false, // ユーザーが既に投票しているかどうか
            }));
            setSurveys(surveyData);
        });

        return () => {
            unsubscribeSurveys();
        };

    }, [user]);

    // 投稿とアンケートを結合して最新順に並べる
    useEffect(() => {
        const combined = [...posts, ...surveys].sort((a, b) => {
            // create_atフィールドがない場合には0をデフォルト値として扱い、降順でソート
            const timeA = a.create_at?.seconds || 0;
            const timeB = b.create_at?.seconds || 0;
            return timeB - timeA;
        });
        setCombinedContent(combined); // 結合したデータをセット
    }, [posts, surveys]); // postsまたはsurveysが更新されるたびに実行

    // 投票処理
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
        const updatedRespondents = [...currentRespondents, user.uid];

        try {
            await updateDoc(surveyRef, {
                votes: newVotes,
                respondents: updatedRespondents,
            });
        } catch (error) {
            console.error("投票の更新に失敗しました: ", error);
        }
    };
    // 投票割合を計算する
    const calculateVotePercentage = (votes, index) => {
        if (!votes || votes.length === 0) return 0;
        const totalVotes = votes.reduce((sum, count) => sum + count, 0);
        return totalVotes === 0 ? 0 : Math.round((votes[index] / totalVotes) * 100);
    };

    // アンケート削除処理
    const openSurveyConfirmPopup = (surveyId) => {
        setSurveyToDelete(surveyId);
        setSurveyConfirmPopupOpen(true);
    };
       
    const closeSurveyConfirmPopup = () => {
        setSurveyToDelete(null);
        setSurveyConfirmPopupOpen(false);
    };
    
    const handleDeleteSurvey = async () => {
        if (!surveyToDelete || !user) return;
    
        // 削除するアンケートを取得
        const survey = surveys.find(s => s.id === surveyToDelete);
    
        // アンケートの作成者と現在のユーザーが一致するか確認
        if (!survey?.uid || survey.uid !== user.uid) {
            alert("自分が作成したアンケートのみ削除できます。");
            return;
        }
    
        try {
            // Firebaseからアンケートを削除
            await deleteDoc(doc(db, "PostList", surveyToDelete));
    
            // 状態から削除したアンケートを除外
            setSurveys((prevSurveys) => prevSurveys.filter((survey) => survey.id !== surveyToDelete));
    
            // ポップアップを閉じて初期化
            setSurveyConfirmPopupOpen(false);
            setSurveyToDelete(null);
        } catch (error) {
            console.error("アンケート削除エラー:", error);
            alert("アンケートの削除に失敗しました。");
        }
    };
    

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


    // いいねボタンの処理
    const toggleLike = async (postId) => {
        if (!user) return; // ユーザーがログインしていない場合は終了

        const postRef = doc(db, "post", postId);

        try {
            // Firestore から最新の投稿データを取得
            const postSnapshot = await getDoc(postRef);

            if (!postSnapshot.exists()) {
                console.error("指定された投稿が見つかりません。");
                return;
            }

            const postData = postSnapshot.data();

            // Firestore から「いいね」の状態を確認
            const currentLikes = postData.likes || 0;
            const likedBy = postData.likedBy || [];
            const likedByUser = likedBy.includes(user.uid);

            // 「いいね」をトグル（追加または解除）
            const newLikes = likedByUser ? currentLikes - 1 : currentLikes + 1;
            const updatedLikedBy = likedByUser
                ? likedBy.filter(uid => uid !== user.uid) // 解除する場合
                : [...likedBy, user.uid]; // 追加する場合

            // Firestore を更新
            await updateDoc(postRef, {
                likes: newLikes,
                likedBy: updatedLikedBy,
            });

            console.log("いいねが更新されました！");
        } catch (error) {
            console.error("いいねの更新に失敗しました: ", error);
        }
    };

    // クリックされた投稿の詳細ページに遷移する関数
    const handlePostClick = (postId) => {
        router.push(`/PostDetailPage2/${postId}`); // 投稿詳細ページに遷移
    };

    // ユーザープロフィールページに遷移する関数
    const handleUserProfileClick = (userId) => {
        router.push(`/profile/${userId}`); // プロフィールページに遷移
    };


    return (
        <div className="container">
            <Sidebar />
    
            <div className="post_all">
                {loading ? (
                    <div>読み込み中...</div>
                ) : combinedContent.length === 0 ? (
                    <div>まだ投稿がありません。</div>
                ) : (            
                    combinedContent.map((item) => {
                        // 投稿のレンダリング
                        if (item.content) {
                            return (
                                <div key={item.id} className="single_post">
                                    <div className="post_icon_name">
                                        {item.user_icon && (
                                            <Image
                                            src={
                                                item.isTheme
                                                    ? God
                                                    : item.user_icon
                                            }
                                            alt="User Icon"
                                            width={50}
                                            height={50}
                                            className="post_icon"
                                            style={{
                                                objectFit: 'cover',
                                                borderRadius: '50%'  // 丸型にする場合
                                            }}
                                            onClick={() => handleUserProfileClick(item.uid)} // アイコンクリックで遷移
                                        />
                                        )}
                                        <p className="post_name">{item.user_name}</p>
                                        {user?.uid === item.uid && (
                                            <div className="post_name_distance">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsDeleteMenuOpen((prev) => ({
                                                            ...prev,
                                                            [item.id]: !prev[item.id],
                                                        }));
                                                    }}
                                                >
                                                    ⋮
                                                </button>
                                                {isDeleteMenuOpen[item.id] && (
                                                    <div
                                                        className="post_delete"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openConfirmPopup(item.id);
                                                        }}
                                                    >
                                                        削除
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
    
                                    <div
                                        className="post_content_clickable"
                                        onClick={() => handlePostClick(item.id)}
                                    >
                                        <p>{item.content}</p>
                                        <p>
                                            投稿日:{" "}
                                            {item.create_at
                                                ? new Date(item.create_at.seconds * 1000).toLocaleString()
                                                : "不明"}
                                        </p>
                                    </div>
    
                                    <div className="post_nice_comment">
                                        <button
                                            onClick={() =>
                                                toggleLike(item.id, item.likes, item.likedBy?.includes(user?.uid))
                                            }
                                            className="post_like_icon"
                                        >
                                            {item.likedBy?.includes(user?.uid) ? "❤️" : "🤍"} {item.likes || 0} いいね
                                        </button>
                                        <p>コメント数: {item.comments_count || 0}</p>
                                    </div>
                                </div>
                            );
                        }
    
                        // アンケートのレンダリング
                        if (item.type === "survey") {
                            return (
                                <div key={item.id} className="survey_card">
                                    <div className="survey_header">
                                        {item.user_icon && (
                                            <Image
                                                src={item.user_icon}
                                                alt="User Icon"
                                                width={50}
                                                height={50}
                                                className="survey_icon"
                                                style={{
                                                    objectFit: 'cover',
                                                    borderRadius: '50%' // 丸型にする場合
                                                }}
                                            />
                                        )}
                                        <p className="survey_user">{item.user_name}</p>
                                        {user?.uid === item.uid && (
                                            <div className="post_name_distance">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsDeleteMenuOpen((prev) => ({
                                                            ...prev,
                                                            [item.id]: !prev[item.id],
                                                        }));
                                                    }}
                                                >
                                                    ⋮
                                                </button>
                                                {isDeleteMenuOpen[item.id] && (
                                                    <div
                                                        className="post_delete"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openSurveyConfirmPopup(item.id); // この行を変更
                                                        }}
                                                    >
                                                        削除
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="survey_question">{item.question}</h3>
                                    <div className="survey_options">
                                        {item.options.map((option, index) => {
                                            const votePercentage = calculateVotePercentage(item.votes, index);
                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => handleVote(item.id, index)}
                                                    disabled={item.hasVoted || !user}
                                                    style={{
                                                        padding: "10px",
                                                        border: "1px solid #ddd",
                                                        borderRadius: "5px",
                                                        backgroundColor: item.hasVoted
                                                            ? "#f0f0f0"
                                                            : "#f8f9fa",
                                                        cursor: item.hasVoted ? "default" : "pointer",
                                                        position: "relative",
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            position: "absolute",
                                                            left: 0,
                                                            top: 0,
                                                            bottom: 0,
                                                            width: `${votePercentage}%`,
                                                            backgroundColor: item.hasVoted
                                                                ? "rgba(0, 123, 255, 0.2)"
                                                                : "transparent",
                                                            zIndex: 1,
                                                            transition: "width 1s ease-out",
                                                        }}
                                                    />
                                                    <div
                                                        style={{
                                                            position: "relative",
                                                            zIndex: 2,
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                        }}
                                                    >
                                                        <span>{option}</span>
                                                        {item.hasVoted && <span>{votePercentage}%</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {!user && (
                                        <p className="survey_login_notice">
                                            投票するにはログインが必要です
                                        </p>
                                    )}
                                    {item.hasVoted && <p className="survey_voted_notice">投票済み</p>}
                                    <p className="survey_date">
                                        投稿日:{" "}
                                        {item.create_at
                                            ? new Date(item.create_at.seconds * 1000).toLocaleString()
                                            : "不明"}
                                    </p>
                                </div>
                            );
                        }
                    })
                )}
            </div>

            {/* 削除確認ポップアップ */}
            {isConfirmPopupOpen && (
                <div className="post_delete_confirmation">
                    <p>本当にこの投稿を削除しますか？</p>
                    <button onClick={handleDeletePost}>削除</button>
                    <button onClick={closeConfirmPopup}>キャンセル</button>
                </div>
            )}
            <Searchdummy />
            {isSurveyConfirmPopupOpen && (
                <div className="survey_delete_confirmation">
                    <p>本当にこのアンケートを削除しますか？</p>
                    <button onClick={handleDeleteSurvey}>削除
                    </button>
                    <button onClick={closeSurveyConfirmPopup}>キャンセル</button>
                </div>
            )}
        </div>
    );
};
export default PostPage;
