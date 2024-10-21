'use client'; // クライアントサイドコンポーネントとして指定

import React, { useState } from 'react';
import { db } from '../firebase'; // Firestoreの設定をインポート
import { collection, query, where, getDocs, orderBy, limit, startAt, endAt } from 'firebase/firestore'; // Firestoreのクエリ関連のメソッドをインポート
import '../../Style/sidebar.css'; // 必要に応じて適切なCSSをインポート

const Searchbar = () => {
    const [searchQuery, setSearchQuery] = useState(''); // 検索クエリの状態
    const [suggestions, setSuggestions] = useState([]); // サジェストリストの状態

    // 検索クエリの変更ハンドラ
    const handleSearchChange = async (event) => {
        const query = event.target.value;
        setSearchQuery(query); // 検索クエリを更新
        
        // サジェストの更新
        if (query) {
            const filteredUsers = await fetchUsers(query); // Firestoreからユーザーを取得
            setSuggestions(filteredUsers); // サジェストを更新
        } else {
            setSuggestions([]); // クエリが空の場合、サジェストをクリア
        }
    };

    // Firestoreからユーザーを取得する関数（検索クエリで始まるユーザーのみ取得）
    const fetchUsers = async (queryString) => {
        const usersRef = collection(db, 'users'); // 'users' コレクションを指定

        // Firestoreクエリ：queryStringで始まるユーザー名を検索
        const q = query(
            usersRef,
            orderBy('name'),
            startAt(queryString), // 検索クエリで始まる
            endAt(queryString + '\uf8ff'), // クエリで始まる範囲
            limit(10) // 取得するユーザーの最大数
        );
        
        const querySnapshot = await getDocs(q);
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ name: doc.data().name, uid: doc.id }); // アカウント名とuidを配列に追加
        });

        return users; // 検索結果を返す
    };

    // 検索の送信ハンドラ
    const handleSearchSubmit = (event) => {
        event.preventDefault(); // フォーム送信を防ぐ
        alert(`Searching for: ${searchQuery}`); // 検索クエリをアラート表示
        setSuggestions([]); // 検索後にサジェストをクリア
    };

    // サジェストアイテムのクリックハンドラ
    const handleSuggestionClick = (suggestion) => {
        setSearchQuery(suggestion.name); // 検索クエリをサジェストの内容に設定
        setSuggestions([]); // サジェストをクリア
        // uidを使って他の操作が必要なら、ここでuidを利用可能（例：ユーザー詳細ページに遷移など）
        console.log(`Selected user ID: ${suggestion.uid}`);
    };

    return (
        <div className="search-container">
            <label htmlFor="search-input" className="search-label">検索</label>
            <div className="search-and-divider">
                <div className="vertical-line"></div>

                <form onSubmit={handleSearchSubmit} className="search-form">
                    <input 
                        type="text" 
                        id="search-input" 
                        value={searchQuery} 
                        onChange={handleSearchChange} 
                        placeholder="検索..." 
                        className="search-input" 
                    />
                    <button type="submit" className="search-button">検索</button>
                </form>
            </div>

            {suggestions.length > 0 && (
                <ul className="search-suggestions">
                    {suggestions.map((suggestion, index) => (
                        <li key={index} onClick={() => handleSuggestionClick(suggestion)}>
                            {suggestion.name} {/* 表示にはユーザー名を使い、uidはバックエンド操作用に保持 */}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Searchbar;
