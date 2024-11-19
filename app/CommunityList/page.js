"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "../../style/CommunityList.css";

function CommunityList({ onJoinCommunity }) {
    const [communities, setCommunities] = useState([]);
    const [isScrollable, setIsScrollable] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [error, setError] = useState(null);

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
                setError("コミュニティ情報を取得できませんでした。");
            }
        };

        fetchCommunities();
    }, []);

    // スクロール可能かどうかの判定
    useEffect(() => {
        const handleResize = () => {
            const container = document.querySelector('.community-list-container');
            setIsScrollable(container.scrollHeight > window.innerHeight);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [communities]);

    // スクロール位置に応じて「上に戻る」ボタンを表示
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollButton(window.scrollY > 100);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 上に戻る関数
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div
            className="community-list-container"
            style={{ overflowY: isScrollable ? 'scroll' : 'hidden' }}
        >
            <h2 className="community-list-title">コミュニティ一覧</h2>
            {error && <p className="error-message">{error}</p>}
            <ul>
                {communities.map((community) => (
                    <li key={community.id} className="community-item">
                        <h3>{community.community_name}</h3>
                        <p>{community.community_profile}</p>
                        <p>{community.community_NOP}</p>
                        <button
                            className="join-button"
                            onClick={() => onJoinCommunity(community.id)}
                        >
                            参加する
                        </button>
                    </li>
                ))}
            </ul>

            {/* 「上に戻る」ボタン */}
            {showScrollButton && (
                <button className="back-to-top-button" onClick={scrollToTop}>
                    上に戻る
                </button>
            )}
        </div>
    );
}

export default CommunityList;
