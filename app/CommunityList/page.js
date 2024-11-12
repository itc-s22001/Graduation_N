"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "../../style/CommunityList.css";

function CommunityList({ onJoinCommunity }) {
    const [communities, setCommunities] = useState([]);

    useEffect(() => {
        const fetchCommunities = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "communities"));
                const communityData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setCommunities(communityData);
            } catch (error) {
                console.error("コミュニティ情報の取得エラー:", error);
            }
        };

        fetchCommunities();
    }, []);

    return (
        <div className="community-list-container">
            <h2 className="community-list-title">コミュニティ一覧</h2>
            <ul>
                {communities.map((community) => (
                    <li key={community.id} className="community-item">
                        <h3>{community.community_name}</h3>
                        <p>{community.community_profile}</p>
                        <button
                            className="join-button"
                            onClick={() => onJoinCommunity(community.id)}
                        >
                            参加する
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default CommunityList;
