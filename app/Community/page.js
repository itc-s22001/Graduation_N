"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, increment, addDoc, collection, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db, auth, storage } from "../firebase";  // storageをインポート
import { useRouter } from "next/navigation"; // Import useRouter from Next.js
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";  // Firebase Storageをインポート

const CommunityPage = () => {
    const [currentCommunity, setCurrentCommunity] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [communityName, setCommunityName] = useState("");
    const [description, setDescription] = useState("");
    const [communityIcon, setCommunityIcon] = useState(null);
    const [isPublic, setIsPublic] = useState(true);
    const [joinedCommunities, setJoinedCommunities] = useState([]);
    const [communities, setCommunities] = useState([]);
    const [uploading, setUploading] = useState(false);  // アップロード状態の管理
    const router = useRouter(); // Initialize useRouter

    useEffect(() => {
        const fetchCommunities = async () => {
            try {
                // コミュニティ一覧の取得
                const querySnapshot = await getDocs(collection(db, "communities"));
                const communityList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setCommunities(communityList);

                // ユーザーの参加済みコミュニティ取得
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists()) {
                    setJoinedCommunities(userDoc.data().joined_communities || []);
                }
            } catch (error) {
                console.error("コミュニティの取得エラー:", error);
            }
        };
        fetchCommunities();
    }, []);

    const joinCommunity = async (communityId) => {
        const communityRef = doc(db, "community_members", communityId);
        const userCommunityRef = doc(db, "users", auth.currentUser.uid);
        const communityDocRef = doc(db, "communities", communityId);

        try {
            // community_members コレクションのドキュメントが存在しない場合は新たに作成
            const communitySnapshot = await getDoc(communityRef);
            if (!communitySnapshot.exists()) {
                await setDoc(communityRef, { members: [], community_NOP: 0 });
            }

            await updateDoc(communityRef, {
                community_NOP: increment(1),
                members: arrayUnion(auth.currentUser.uid),
            });

            await updateDoc(userCommunityRef, {
                joined_communities: arrayUnion(communityId),
            });

            await updateDoc(communityDocRef, {
                community_NOP: increment(1),
            });

            setJoinedCommunities((prev) => [...prev, communityId]);
            setCurrentCommunity(communityId);
            // コミュニティページからCommunityPostページに遷移
            router.push(`/CommunityPost/${communityId}`);
        } catch (error) {
            console.error("コミュニティ参加エラー:", error);
        }
    };

    const leaveCommunity = async () => {
        if (!currentCommunity) return;

        const communityRef = doc(db, "community_members", currentCommunity);
        const userCommunityRef = doc(db, "users", auth.currentUser.uid);
        const communityDocRef = doc(db, "communities", currentCommunity);

        try {
            // community_members コレクションのドキュメントが存在しない場合は作成
            const communitySnapshot = await getDoc(communityRef);
            if (!communitySnapshot.exists()) {
                await setDoc(communityRef, { members: [], community_NOP: 0 });
            }

            await updateDoc(communityRef, {
                community_NOP: increment(-1),
                members: arrayRemove(auth.currentUser.uid),
            });

            await updateDoc(userCommunityRef, {
                joined_communities: arrayRemove(currentCommunity),
            });

            await updateDoc(communityDocRef, {
                community_NOP: increment(-1),
            });

            setJoinedCommunities((prev) => prev.filter((id) => id !== currentCommunity));
            setCurrentCommunity(null);
        } catch (error) {
            console.error("コミュニティ退出エラー:", error);
        }
    };

    const handleCreateCommunity = async () => {
        if (!communityName || !description) {
            alert("コミュニティ名と説明文は必須です");
            return;
        }

        if (!communityIcon) {
            alert("アイコン画像をアップロードしてください");
            return;
        }

        // 画像のアップロード
        const imageRef = ref(storage, `community_images/${communityIcon.name}`);
        const uploadTask = uploadBytesResumable(imageRef, communityIcon);

        setUploading(true); // アップロード開始

        uploadTask.on("state_changed",
            (snapshot) => {
                // 進行状況の表示が可能
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload is ${progress}% done`);
            },
            (error) => {
                console.error("画像のアップロードエラー:", error);
                setUploading(false);
            },
            async () => {
                // アップロード完了後
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                // Firestoreに新しいコミュニティを作成
                try {
                    const communityRef = await addDoc(collection(db, "communities"), {
                        community_NOP: 0,
                        community_name: communityName,
                        community_profile: description,
                        community_public_private: isPublic ? "公開" : "非公開",
                        community_image_url: downloadURL,  // 画像URLを追加
                        created_at: new Date().toISOString(),
                        created_by: auth.currentUser.uid,
                    });

                    // community_id をドキュメントIDとして保存
                    await updateDoc(communityRef, {
                        community_id: communityRef.id,  // ドキュメントIDを community_id に設定
                    });

                    setIsCreating(false);
                    setCommunityName("");
                    setDescription("");
                    setCommunityIcon(null);
                    setUploading(false); // アップロード完了
                    // 作成後にCommunityPostページへ遷移
                    router.push(`/CommunityPost/${communityRef.id}`);
                } catch (error) {
                    console.error("コミュニティ作成エラー:", error);
                    setUploading(false);
                }
            }
        );
    };

    return (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
                <h2>参加済みのコミュニティ</h2>
                {communities
                    .filter((community) => joinedCommunities.includes(community.id))
                    .map((community) => (
                        <div key={community.id}>
                            <h3>{community.community_name}</h3>
                            <p>{community.community_profile}</p>


                            <button onClick={() => router.push(`/CommunityPost/${community.id}`)}>コミュニティを見る</button>
                            <button onClick={leaveCommunity}>退出</button>
                        </div>
                    ))}
            </div>

            <div>
                <h2>未参加のコミュニティ</h2>
                {communities
                    .filter((community) => !joinedCommunities.includes(community.id))
                    .map((community) => (
                        <div key={community.id}>
                            <h3>{community.community_name}</h3>
                            <p>{community.community_profile}</p>
                            <button onClick={() => joinCommunity(community.id)}>参加</button>
                        </div>
                    ))}
            </div>

            {/* コミュニティ作成フォーム */}
            <div>
                <h2>新しいコミュニティを作成</h2>
                <input
                    type="text"
                    placeholder="コミュニティ名"
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                />
                <textarea
                    placeholder="コミュニティの説明"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <div>
                    <label>
                        アイコン画像:
                        <input
                            type="file"
                            onChange={(e) => setCommunityIcon(e.target.files[0])}
                        />
                    </label>
                </div>
                <div>
                    <label>
                        公開:
                        <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={() => setIsPublic(!isPublic)}
                        />
                    </label>
                </div>
                <button onClick={handleCreateCommunity} disabled={uploading}>
                    {uploading ? "アップロード中..." : "コミュニティ作成"}
                </button>
            </div>
        </div>
    );
};

export default CommunityPage;
