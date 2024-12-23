"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, increment, addDoc, collection, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db, auth, storage } from "../firebase";
import { useRouter } from "next/navigation";
import '../../style/Community.css'
import Sidebar from "../Sidebar/page";
import Searchdummy from "../Searchdummy/page";
import CommunityModal from "../CommunityModal/page";
import Image from "next/image";
import CommunitySearchBar from "@/app/CommunitySearchBar/page";
import SidebarMobile from "@/app/SidebarMobile/page";

const CommunityPage = () => {
    const [currentCommunity, setCurrentCommunity] = useState(null);
    const [joinedCommunities, setJoinedCommunities] = useState([]);
    const [communities, setCommunities] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState("joined");  // 新たに追加した状態管理

    useEffect(() => {
        const fetchCommunities = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "communities"));
                const communityList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setCommunities(communityList);

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

    const joinCommunity = async (communityId, action = "join") => {
        const communityRef = doc(db, "community_members", communityId);
        const userCommunityRef = doc(db, "users", auth.currentUser.uid);
        const communityDocRef = doc(db, "communities", communityId);

        try {
            const communitySnapshot = await getDoc(communityRef);
            if (!communitySnapshot.exists()) {
                await setDoc(communityRef, { members: [], community_NOP: 0 });
            }

            const userDoc = await getDoc(userCommunityRef);
            const joinedCommunities = userDoc.exists() ? userDoc.data().joined_communities || [] : [];

            if (action === "join" && !joinedCommunities.includes(communityId)) {
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
                router.push(`/CommunityPost/${communityId}`);
            } else if (action === "view" || joinedCommunities.includes(communityId)) {
                setCurrentCommunity(communityId);
                router.push(`/CommunityPost/${communityId}`);
            }
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

    // Mobile
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768); // 768px以下ならモバイルサイズ
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // 初回読み込み時に呼び出す

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{ display: "flex", position: "relative" }}>
            {isMobile ? <SidebarMobile /> : <Sidebar />}
            <div className="CommunityContent">
                {isMobile ? (
                        <div className='MobileCom'>
                            <div className="CommunityTabs">
                                <button
                                    className={activeTab === "joined" ? "activeTab" : ""}
                                    onClick={() => setActiveTab("joined")}
                                >
                                    参加済み
                                </button>
                                <button
                                    className={activeTab === "notJoined" ? "activeTab" : ""}
                                    onClick={() => setActiveTab("notJoined")}
                                >
                                    未参加
                                </button>
                            </div>
                            <div className="CommunityBox">
                                <div>
                                    {activeTab === "joined" && (
                                        <>
                                            <h2>参加済みのコミュニティ</h2>
                                            {communities
                                                .filter((community) => joinedCommunities.includes(community.id))
                                                .map((community) => (
                                                    <div key={community.id} className="CommunitysBOX">
                                                        {community.community_image_url && (
                                                            <Image src={community.community_image_url}
                                                                   alt="コミュニティアイコン"
                                                                   width={50} height={50}
                                                                   className="CommunityImage"/>
                                                        )}
                                                        <div className="CommunityContent">
                                                            <h3 className="CommunityName">{community.community_name}</h3>
                                                            <p className="CommunityProfile">{community.community_profile}</p>
                                                            <p className="CommunityNOP">コミュニティ参加人数: {community.community_NOP + 1}</p>
                                                            <button className="SeeJoinButton"
                                                                    onClick={() => joinCommunity(community.id)}>コミュニティを見る
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </>
                                    )}

                                    {activeTab === "notJoined" && (
                                        <>
                                            <h2>未参加のコミュニティ</h2>
                                            {communities
                                                .filter((community) => !joinedCommunities.includes(community.id))
                                                .map((community) => (
                                                    <div key={community.id} className="CommunitysBOX">
                                                        {community.community_image_url && (
                                                            <Image src={community.community_image_url}
                                                                   alt="コミュニティアイコン"
                                                                   width={50} height={50}
                                                                   className="CommunityImage"/>
                                                        )}
                                                        <div className="CommunityContent">
                                                            <h3 className="CommunityName">{community.community_name}</h3>
                                                            <p className="CommunityProfile">{community.community_profile}</p>
                                                            <p className="CommunityNOP">コミュニティ参加人数: {community.community_NOP + 1}</p>
                                                            <button className="JoinButton"
                                                                    onClick={() => joinCommunity(community.id)}>参加
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                    ) :
                    <div className="PCCom">


                        <div className="CommunityContent">
                            <div className="CommunityBox">
                                <div>
                                    <h2 style={{
                                        borderBottom: '1px solid black',
                                        paddingLeft: '20px',
                                        paddingRight: '20px'
                                    }}>参加済みのコミュニティ</h2>
                                    <div>
                                        {communities
                                            .filter((community) => joinedCommunities.includes(community.id))
                                            .map((community) => (
                                                <div key={community.id} className="CommunitysBOX">
                                                    {/* コミュニティのアイコン */}
                                                    {community.community_image_url && (
                                                        <Image src={community.community_image_url}
                                                               alt="コミュニティアイコン"
                                                               width={50} height={50}
                                                               className="CommunityImage"/>
                                                    )}
                                                    <div className="CommunityContent">
                                                        <h3 className="CommunityName">{community.community_name}</h3>
                                                        <p className="CommunityProfile">{community.community_profile}</p>
                                                        <p className="CommunityNOP">コミュニティ参加人数: {community.community_NOP + 1}</p>
                                                        <button className="SeeJoinButton"
                                                                onClick={() => joinCommunity(community.id)}>コミュニティを見る
                                                        </button>
                                                    </div>
                                                </div>

                                            ))}
                                    </div>

                                </div>

                                <div className="LeftCommunityBox">
                                    <h2 style={{
                                        borderBottom: '1px solid black',
                                        paddingLeft: '20px',
                                        paddingRight: '20px'
                                    }}>未参加のコミュニティ</h2>
                                    {communities
                                        .filter((community) => !joinedCommunities.includes(community.id))
                                        .map((community) => (
                                            <div key={community.id} className="CommunitysBOX">
                                                {/* コミュニティのアイコン */}
                                                {community.community_image_url && (
                                                    <Image src={community.community_image_url}
                                                           alt="コミュニティアイコン"
                                                           width={50} height={50}
                                                           className="CommunityImage"/>
                                                )}
                                                <div className="CommunityContent">
                                                    <h3 className="CommunityName">{community.community_name}</h3>
                                                    <p className="CommunityProfile">{community.community_profile}</p>
                                                    <p className="CommunityNOP">コミュニティ参加人数: {community.community_NOP + 1}</p>
                                                    <button className="JoinButton"
                                                            onClick={() => joinCommunity(community.id)}>参加
                                                    </button>
                                                </div>
                                            </div>

                                        ))}
                                </div>
                            </div>



                        </div>
                    </div>
                }

                {showPopup && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        zIndex: 1000,
                    }} onClick={() => setShowPopup(false)}/>
                )}
                <CommunityModal/>
            </div>
            <CommunitySearchBar/>
        </div>
    );
};

export default CommunityPage;
