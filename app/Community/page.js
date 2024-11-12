"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, increment, addDoc, collection, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db, auth, storage } from "../firebase";
import { useRouter } from "next/navigation";
import '../../style/Community.css'
import Sidebar from "../Sidebar/page";
import Searchdummy from "../Searchdummy/page";
import CommunityModal from "../CommunityModal/page";

const CommunityPage = () => {
    const [currentCommunity, setCurrentCommunity] = useState(null);
    const [joinedCommunities, setJoinedCommunities] = useState([]);
    const [communities, setCommunities] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const router = useRouter();

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


    const joinCommunity = async (communityId) => {
        const communityRef = doc(db, "community_members", communityId);
        const userCommunityRef = doc(db, "users", auth.currentUser.uid);
        const communityDocRef = doc(db, "communities", communityId);

        try {
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



    return (
        <div style={{display:"flex", position: "relative"}}>
            <Sidebar />
            <div className="CommunityContent">
                <div className="CommunityBox">
                    <div>
                        <h2 style={{
                            borderBottom: '1px solid black',
                            paddingLeft: '20px',
                            paddingRight: '20px'
                        }}>参加済みのコミュニティ</h2>
                        {communities
                            .filter((community) => joinedCommunities.includes(community.id))
                            .map((community) => (
                                <div key={community.id} style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    {/* コミュニティのアイコン */}
                                    {community.community_image_url && (
                                        <img src={community.community_image_url} alt="コミュニティアイコン"
                                        className="CommunityImage"/>
                                    )}
                                    <div>
                                        <h3>{community.community_name}</h3>
                                        <p>{community.community_profile}</p>
                                        <button
                                            onClick={() => router.push(`/CommunityPost/${community.id}`)}>コミュニティを見る
                                        </button>
                                        <button onClick={leaveCommunity}>退出</button>
                                    </div>
                                </div>
                            ))}
                    </div>

                    <div style={{borderLeft: "1px solid black", paddingLeft: "50px", marginLeft: '50px'}}>
                        <h2 style={{
                            borderBottom: '1px solid black',
                            paddingLeft: '20px',
                            paddingRight: '20px'
                        }}>未参加のコミュニティ</h2>
                        {communities
                            .filter((community) => !joinedCommunities.includes(community.id))
                            .map((community) => (
                                <div key={community.id} style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    {/* コミュニティのアイコン */}
                                    {community.community_image_url && (
                                        <img src={community.community_image_url} alt="コミュニティアイコン"
                                             style={{width: '50px', height: '50px', borderRadius: '50%'}}/>
                                    )}
                                    <div>
                                        <h3>{community.community_name}</h3>
                                        <p>{community.community_profile}</p>
                                        <button onClick={() => joinCommunity(community.id)}>参加</button>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

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
                <div style={{position: "fixed", bottom: 0, zIndex: 1001}}>
                    <CommunityModal/>
                </div>
            </div>
            <Searchdummy/>
        </div>
    );
};

export default CommunityPage;
