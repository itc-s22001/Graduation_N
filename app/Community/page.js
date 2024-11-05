"use client";

import { useState } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, increment, addDoc, collection, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import CommunityList from "../CommunityList/page";
import CommunityPosts from "../CommunityPost/page";

const CommunityPage = () => {
    const [currentCommunity, setCurrentCommunity] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [communityName, setCommunityName] = useState("");
    const [description, setDescription] = useState("");
    const [communityIcon, setCommunityIcon] = useState(null);
    const [isPublic, setIsPublic] = useState(true);

    const joinCommunity = async (communityId) => {
        const communityRef = doc(db, "community_members", communityId);
        const userCommunityRef = doc(db, "users", auth.currentUser.uid);
        const communityDocRef = doc(db, "communities", communityId);

        try {
            const communitySnap = await getDoc(communityRef);
            if (!communitySnap.exists()) {
                await setDoc(communityRef, { community_NOP: 0, members: [] });
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

            setCurrentCommunity(communityId);
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

        try {
            const communityRef = await addDoc(collection(db, "communities"), {
                community_NOP: 0,
                community_id: Math.floor(Math.random() * 100000),
                community_name: communityName,
                community_profile: description,
                community_public_private: isPublic ? "公開" : "非公開",
                created_at: new Date().toISOString(),
                created_by: auth.currentUser.uid,
            });

            console.log("コミュニティが作成されました:", communityRef.id);
            setIsCreating(false);
            setCommunityName("");
            setDescription("");
            setCommunityIcon(null);
        } catch (error) {
            console.error("コミュニティ作成エラー:", error);
        }
    };

    return (
        <div>
            {currentCommunity ? (
                <CommunityPosts communityId={currentCommunity} onLeaveCommunity={leaveCommunity} />
            ) : (
                isCreating ? (
                    <div>
                        <h2>新しいコミュニティを作成</h2>
                        <input
                            type="text"
                            placeholder="コミュニティ名（変更不可）"
                            value={communityName}
                            onChange={(e) => setCommunityName(e.target.value)}
                        />
                        <textarea
                            placeholder="コミュニティの説明文"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setCommunityIcon(e.target.files[0])}
                        />
                        <label>
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                            />
                            公開する
                        </label>
                        <button onClick={handleCreateCommunity}>コミュニティを作成</button>
                        <button onClick={() => setIsCreating(false)}>キャンセル</button>
                    </div>
                ) : (
                    <>
                        <button onClick={() => setIsCreating(true)}>新しいコミュニティを作成</button>
                        <CommunityList onJoinCommunity={joinCommunity} />
                    </>
                )
            )}
        </div>
    );
};

export default CommunityPage;
