"use client";

// import { doc, updateDoc, increment } from "firebase/firestore";
// import { db } from "../firebase"; // Firebaseの初期化

// const handleLikePost = async (postId) => {
//     try {
//         const postRef = doc(db, "post", postId); // 投稿IDに基づいてドキュメントを取得
//         await updateDoc(postRef, {
//             likes: increment(1) // likesフィールドを1つ増やす
//         });
//         console.log("いいねがカウントされました");
//     } catch (error) {
//         console.error("いいねのカウントに失敗しました:", error);
//     }
// };

// export default handleLikePost;