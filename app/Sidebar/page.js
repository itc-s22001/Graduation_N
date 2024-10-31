'use client';


import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // next/navigation から useRouter と usePathname をインポート
import '../../Style/sidebar.css'; // CSSファイルのインポート



const SidebarButton = ({ children, push, isActive, onClick }) => {
    return (
        <button
            className={`sidebar-button ${isActive ? 'active' : ''}`} // アクティブな場合にクラスを追加
            onClick={onClick}
        >
            {children}
        </button>
    );
};

const Sidebar = () => {
    const router = useRouter();
    const [activeButton, setActiveButton] = useState('/home'); // 初期アクティブボタン

    // 初期レンダリング時に現在のパスを取得
    useEffect(() => {
        setActiveButton(window.location.pathname); // 現在のパスをアクティブに設定
    }, []);

    const handleButtonClick = (path) => {
        setActiveButton(path); // 押されたボタンのパスをアクティブに設定
        router.push(path); // ルートを変更
    };

    return (
        <div className="sidebar">
            <button className="logo-button">N</button> {/* ロゴボタン */}
            <div className="button-container">
                <div className="buttons">
                    {/* ホームボタン */}
                    <div className="sidebar-button-container">
                        <svg className="home-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 3l10 9h-3v9h-6v-6h-4v6H5v-9H2z" />
                        </svg>

                        <SidebarButton
                            push="/home"
                            isActive={activeButton === '/home'}
                            onClick={() => handleButtonClick('/home')}
                        >
                            ホーム
                        </SidebarButton>

                    </div>

                    {/* プロフィールボタン */}
                    <div className="sidebar-button-container">
                        <SidebarButton
                            push="/profile"
                            isActive={activeButton === '/profile'}
                            onClick={() => handleButtonClick('/profile')}
                        >
                            プロフィール
                        </SidebarButton>
                    </div>

                    {/* 通知ボタン */}
                    <div className="sidebar-button-container">
                        <SidebarButton
                            push="/notification"
                            isActive={activeButton === '/notification'}
                            onClick={() => handleButtonClick('/notification')}
                        >
                            通知
                        </SidebarButton>
                    </div>

                    {/* DMボタン */}
                    <div className="sidebar-button-container">

                        <svg className="dm-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 13.5l8.5-6.5H3.5l8.5 6.5zm0 2.5l-9 6v-12l9 6 9-6v12l-9 6z" />
                        </svg>

                        <SidebarButton
                            push="/DM"
                            isActive={activeButton === '/DM'}
                            onClick={() => handleButtonClick('/DM')}
                        >
                            DM
                        </SidebarButton>
                    </div>

                    {/* 投稿ボタン */}
                    <div className="sidebar-button-container">
                        <SidebarButton
                            push="/post"
                            isActive={activeButton === '/post'}
                            onClick={() => handleButtonClick('/post')}
                        >
                            投稿
                        </SidebarButton>
                    </div>

                    {/* コミュニティボタン */}
                    <div className="sidebar-button-container">
                        <SidebarButton
                            push="/community"
                            isActive={activeButton === '/community'}
                            onClick={() => handleButtonClick('/community')}
                        >
                            コミュニティ
                        </SidebarButton>
                    </div>

                    {/* アンケートボタン */}
                    <div className="sidebar-button-container">
                        <SidebarButton
                            push="/survey"
                            isActive={activeButton === '/survey'}
                            onClick={() => handleButtonClick('/survey')}
                        >
                            アンケート
                        </SidebarButton>
                    </div>

                    {/* 設定ボタン */}
                    <div className="sidebar-button-container">
                        <SidebarButton
                            push="/settings"
                            isActive={activeButton === '/settings'}
                            onClick={() => handleButtonClick('/settings')}
                        >
                            設定
                        </SidebarButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
