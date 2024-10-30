'use client'; // クライアントサイドコンポーネントとして指定

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // next/navigation から useRouter と usePathname をインポート
import '../../Style/sidebar.css'; // CSSファイルのインポート
import Searchbar from '@/app/searchbar/page'; // 検索バーのインポート

const Sidebar = () => {
    const router = useRouter(); // useRouterフックの呼び出し
    const pathname = usePathname(); // 現在のパスを取得
    const [activePage, setActivePage] = useState('home'); // 現在のページの状態

    // ページ遷移関数
    const navigateTo = (page) => {
        setActivePage(page); // 現在のページを設定
        router.push(`/${page}`); // 指定されたページに遷移
    };

    // 初回マウント時にURLをチェックしてアクティブなページを設定
    useEffect(() => {
        const page = pathname.split('/').pop(); // URLからページを取得
        setActivePage(page || 'home'); // デフォルトは 'home'
    }, [pathname]); // pathnameが変更されたときにアクティブなページを更新

    return (
        <div className="sidebar">
            <Searchbar /> {/* 検索バーを上部に表示 */}
            <button className="logo-button">N</button> {/* ロゴをボタンに変更 */}

            <div className="button-container">
                <div className="buttons">
                    {/* ホームボタン */}
                    <div className="sidebar-button-container">
                        <svg className="home-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 3l10 9h-3v9h-6v-6h-4v6H5v-9H2z" />
                        </svg>
                        <button className={`sidebar-button ${activePage === 'home' ? 'active' : ''}`} onClick={() => navigateTo('home')}>ホーム</button>
                    </div>
                    
                    {/* プロフィールボタン */}
                    <div className="sidebar-button-container">
                        <svg className="profile-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-4.41 0-8 2.79-8 6v2h16v-2c0-3.21-3.59-6-8-6z" />
                        </svg>
                        <button className={`sidebar-button ${activePage === 'profile' ? 'active' : ''}`} onClick={() => navigateTo('profile')}>プロフィール</button>
                    </div>

                    {/* 通知ボタン */}
                    <div className="sidebar-button-container">
                        <svg className="notification-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.11-6.32C14.59 4.42 13.4 3 12 3c-1.4 0-2.59 1.42-1.89 7.68C7.64 10.36 6 12.93 6 16v5l-2 2h16l-2-2z" />
                        </svg>
                        <button className="sidebar-button">通知</button>
                    </div>

                    {/* DMボタン */}
                    <div className="sidebar-button-container">
                        <svg className="dm-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 13.5l8.5-6.5H3.5l8.5 6.5zm0 2.5l-9 6v-12l9 6 9-6v12l-9 6z" />
                        </svg>
                        <button className="sidebar-button">DM</button>
                    </div>

                    {/* 投稿ボタン */}
                    <div className="sidebar-button-container">
                        <svg className="post-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75L16.88 12.88l-3.75-3.75L3 17.25zm15.41-10.83L20.25 4l-2.58-2.59c-.39-.39-1.02-.39-1.41 0L14.41 3.17l3.75 3.75z" />
                        </svg>
                        <button className="sidebar-button">投稿</button>
                    </div>

                    {/* コミュニティボタン */}
                    <div className="sidebar-button-container">
                        <svg className="community-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14h-4v-2h4v2zm6 0h-4v-2h4v2zm4-4H4v-2h16v2z"/>
                        </svg>
                        <button className="sidebar-button">コミュニティ</button>
                    </div>

                    {/* アンケートボタン */}
                    <div className="sidebar-button-container">
                        <svg className="survey-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm6 3h4v2h-4V9zm-6 0h4v2H6V9zm0 4h4v2H6v-2zm6 0h4v2h-4v-2z" />
                            <path d="M20 1l-1.41 1.41L21.17 4l2-2-2-2-1.41 1.41L20 1z" />
                        </svg>
                        <button className={`sidebar-button ${activePage === 'survey' ? 'active' : ''}`} onClick={() => navigateTo('survey')}>アンケート</button>
                    </div>

                    {/* 設定ボタン */}
                    <div className="sidebar-button-container">
                        <svg className="settings-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 8a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0-4-4zm0 10a6 6 0 1 1 0-12 6 6 0 0 1 0 12zM15.9 1.1l-1.4 1.4A9.98 9.98 0 0 0 12 0a9.98 9.98 0 0 0-2.5 2.5L8.1 1.1A10.02 10.02 0 0 0 0 12c0 5.5 4.5 10 10 10a10.02 10.02 0 0 0 9.9-11.9zM12 22c-5.5 0-10-4.5-10-10 0-1.68.43-3.25 1.17-4.58l1.59 1.59A8.03 8.03 0 0 0 4 12c0 4.4 3.6 8 8 8a8.03 8.03 0 0 0 2.58-.43l1.59 1.59A9.98 9.98 0 0 0 12 22z" />
                        </svg>
                        <button className="sidebar-button">設定</button>
                    </div>
                </div>
                <div className="separator" /> {/* 縦線のための要素 */}
            </div>
        </div>
    );
};
export default Sidebar;

