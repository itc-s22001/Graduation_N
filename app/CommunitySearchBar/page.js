import React, { useState } from 'react';
import '../../style/CommunitySearchBar.css'; // CSSファイルをインポート
import { db } from '../firebase'; // Firebase設定をインポート
import { collection, query, where, getDocs } from 'firebase/firestore';

const CommunitySearchBar = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const handleSearch = async (term) => {
        if (!term.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const q = query(
                collection(db, 'communities'),
                where('community_name', '>=', term),
                where('community_name', '<=', term + '\uf8ff')
            );
            const querySnapshot = await getDocs(q);
            const results = [];
            querySnapshot.forEach((doc) => {
                results.push({ id: doc.id, ...doc.data() });
            });
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching communities:', error);
        }
    };

    const handleInputChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        handleSearch(term);
    };

    return (
        <div className="community-search-container">
            <input
                type="text"
                placeholder="コミュニティを検索"
                value={searchTerm}
                onChange={handleInputChange}
                className="community-search-input"
                style={{ textAlign: 'center' }}
            />
            <ul className="community-search-results">
                {searchResults.map((community) => (
                    // <div key={community.id} className="community-search-result-item">
                        <div key={community.id} className="CommunitysBOX">
                            {/* コミュニティのアイコン */}
                            {community.community_image_url && (
                                <img src={community.community_image_url} alt="コミュニティアイコン"
                                     className="CommunityImage"/>
                            )}
                            <div className="CommunityContent">
                                <h3 className="CommunityName">{community.community_name}</h3>
                                <p className="CommunityProfile">{community.community_profile}</p>
                                <p className="CommunityNOP">コミュニティ参加人数: {community.community_NOP + 1}</p>
                                <button className="ViewButton"
                                        onClick={() => {
                                            setCurrentCommunity(community.id);
                                            router.push(`/CommunityPost/${community.id}`);
                                        }}>コミュニティを見る
                                </button>
                            </div>
                        {/*</div>*/}
                    </div>
                    ))}
            </ul>
        </div>
);
};

export default CommunitySearchBar;
