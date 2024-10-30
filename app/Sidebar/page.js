'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../../Style/sidebar.css';

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
