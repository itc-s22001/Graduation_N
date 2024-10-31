"use client";

const handleCommentPost = async (postId) => {
    try {
        const postRef = doc(db, "post", postId); // 投稿IDに基づいてドキュメントを取得
        await updateDoc(postRef, {
            comments_count: increment(1) // comments_countフィールドを1つ増やす
        });
        console.log("コメントがカウントされました");
    } catch (error) {
        console.error("コメントのカウントに失敗しました:", error);
    }
};

export default handleCommentPost;