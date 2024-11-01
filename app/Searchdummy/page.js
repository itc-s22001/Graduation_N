import React, { useEffect, useState } from 'react';
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import '../../style/Searchdummy.css';

const Searchdummy = () => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredUsers, setFilteredUsers] = useState([]);

    useEffect(() => {
        // Firebaseからユーザー情報を取得
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            const loadedUsers = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
            setUsers(loadedUsers);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // 検索キーワードでユーザーをフィルタリング
        setFilteredUsers(
            users.filter(user =>
                (user.uid && user.uid.includes(searchTerm)) ||
                (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        );
    }, [searchTerm, users]);

    return (
        <div className="search-container">
            <input
                type="text"
                className="search-input"
                placeholder="ユーザー名またはIDで検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <ul className="search-results">
                <h3> user </h3>
                {filteredUsers.map(user => (
                    <li key={user.uid} className="search-result-item">
                        <div style={{ display: "flex" }}>
                            <img src={user.profile_image_url} alt={`${user.name}のプロフィール画像`}
                                 className="search-profile-image"/>
                            <p className="searchname">{user.name || "No Name"}</p>
                            {/*<p>{user.email}</p>*/}
                        </div>
                        <p>profile:{user.profile_description}</p>

                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Searchdummy;
