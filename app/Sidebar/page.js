'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../Modal/page';
import Searchdummy from '../Searchdummy/page';
import { useRouter, usePathname } from 'next/navigation'; // next/navigation から useRouter と usePathname をインポート
import { auth } from '@/app/firebase'; // Firebaseのauthをインポート
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
    const [userEmail, setUserEmail] = useState(''); // ユーザーのメールアドレスを格納するステート


    // 初期レンダリング時に現在のパスを取得
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setUserEmail(user.email); // ユーザーのメールアドレスを取得
                setActiveButton(window.location.pathname);
            } else {
                setUserEmail(''); // ユーザーがいない場合はメールアドレスをリセット
            }
        });

        return () => unsubscribe(); // コンポーネントのアンマウント時にリスナーを解除
    }, []);

    const handleButtonClick = (path) => {
        setActiveButton(path); // 押されたボタンのパスをアクティブに設定
        router.push(path); // ルートを変更
    };

    const targetEmail = ["s22022@std.it-college.ac.jp", "s22026@std.it-college.ac.jp", "s22001@std.it-college.ac.jp", "s22028@std.it-college.ac.jp"]; // 一致させたいメールアドレスに変更


    return (
        <div className="sidebar">
            < Searchdummy />
            <button className="logo-button">N</button> {/* ロゴボタン */}
            <div className="button-container">
                <div className="buttons">
                    {/* ホームボタン */}
                    <div className="sidebar-button-container">
                        <svg className="home-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 3l10 9h-3v9h-6v-6h-4v6H5v-9H2z" />
                        </svg>


                        <SidebarButton
                            push="/PostList"
                            isActive={activeButton === '/PostList'}
                            onClick={() => handleButtonClick('/PostList')}
                        >
                            ホーム
                        </SidebarButton>

                    </div>

                    {/* プロフィールボタン */}
                    <div className="sidebar-button-container">
                        <svg className="profile-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-4.41 0-8 2.79-8 6v2h16v-2c0-3.21-3.59-6-8-6z" />
                        </svg>
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
                        <svg className="notification-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.11-6.32C14.59 4.42 13.4 3 12 3c-1.4 0-2.59 1.42-1.89 7.68C7.64 10.36 6 12.93 6 16v5l-2 2h16l-2-2z" />
                        </svg>
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
                        <Modal />
                        {/* <SidebarButton
                        <svg className="post-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75L16.88 12.88l-3.75-3.75L3 17.25zm15.41-10.83L20.25 4l-2.58-2.59c-.39-.39-1.02-.39-1.41 0L14.41 3.17l3.75 3.75z" />
                        </svg>
                        <SidebarButton
                            push="/post"
                            isActive={activeButton === '/post'}
                            onClick={() => handleButtonClick('/post')}
                        >
                            投稿
                        </SidebarButton> */}
                    </div>

                    {/* コミュニティボタン */}
                    <div className="sidebar-button-container">
                        <svg className="community-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm8 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm-8 0C5.67 13 1 14.17 1 16.5V19h6v-2.5C7 14.17 5.67 13 4 13z" />
                        </svg>
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
                        <svg className="survey-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm6 3h4v2h-4V9zm-6 0h4v2H6V9zm0 4h4v2H6v-2zm6 0h4v2h-4v-2z" />
                        </svg>
                        <SidebarButton
                            push="/survey"
                            isActive={activeButton === '/survey'}
                            onClick={() => handleButtonClick('/survey')}
                        >
                            アンケート
                        </SidebarButton>
                    </div>
                    {/* お題ボタン */}
                                    {targetEmail.includes(userEmail) && ( // メールアドレスが配列に含まれている場合のみ表示
                    <div className="sidebar-button-container">
                        <svg className="topic-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12c0 4.41 3.59 8 8 8 2.21 0 4.21-.89 5.66-2.34l3.73 3.73c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-3.73-3.73C19.11 16.21 20 14.21 20 12c0-5.52-4.48-10-10-10zm0 18c-1.11 0-2.16-.27-3.1-.75l4.82-4.82c.37 1.05.59 2.2.59 3.45 0 1.11-.27 2.16-.75 3.1l-3.72-3.72c.21-.15.41-.31.59-.49l4.75-4.75c-.18.18-.34.38-.49.59l-3.72 3.72c1.05.37 2.2.59 3.45.59 1.11 0 2.16-.27 3.1-.75l4.82 4.82c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-3.73-3.73C19.11 16.21 20 14.21 20 12c0-5.52-4.48-10-10-10zm0 4c-1.11 0-2.16.27-3.1.75l4.82 4.82c.37-1.05.59-2.2.59-3.45 0-1.11-.27-2.16-.75-3.1l-3.72 3.72c.21.15.41.31.59.49l4.75-4.75c-.18.18-.34.38-.49.59l-3.72 3.72c1.05.37 2.2.59 3.45.59 1.11 0 2.16-.27 3.1-.75l4.82 4.82c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-3.73-3.73C19.11 16.21 20 14.21 20 12c0-5.52-4.48-10-10-10z"/>
                        </svg>
                        <SidebarButton
                            isActive={activeButton === '/Theme'} // 遷移先のパスを設定
                            onClick={() => handleButtonClick('/Theme')}
                        >
                            お題
                        </SidebarButton>
                    </div>
                )}


                    {/* 設定ボタン */}
                    <div className="sidebar-button-container">
                        <svg className="settings-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 8a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0-4-4zm0 10a6 6 0 1 1 0-12 6 6 0 0 1 0 12zM15.9 1.1l-1.4 1.4A9.98 9.98 0 0 0 12 0a9.98 9.98 0 0 0-2.5 2.5L8.1 1.1A10.02 10.02 0 0 0 0 12c0 5.5 4.5 10 10 10a10.02 10.02 0 0 0 9.9-11.9zM12 22c-5.5 0-10-4.5-10-10 0-1.68.43-3.25 1.17-4.58l1.59 1.59A8.03 8.03 0 0 0 4 12c0 4.4 3.6 8 8 8a8.03 8.03 0 0 0 2.58-.43l1.59 1.59A9.98 9.98 0 0 0 12 22z" />
                        </svg>
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