'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/app/firebase'; // Firebaseのauthをインポート
import '../../style/SidebarMobile.css';
import Modal from "@/app/MobileModal/page"; // モーダルのインポート

const SidebarButton = ({ children, push, isActive, onClick }) => {
    return (
        <button
            className={`Msidebar-button ${isActive ? 'active' : ''}`} // アクティブな場合にクラスを追加
            onClick={onClick}
        >
            {children}
        </button>
    );
};

const SidebarModal = () => {
    const router = useRouter();
    const [activeButton, setActiveButton] = useState('/home'); // 初期アクティブボタン
    const [userEmail, setUserEmail] = useState(''); // ユーザーのメールアドレスを格納するステート
    const [isLoading, setIsLoading] = useState(false); // リロード中の状態を useState で定義




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
        setIsLoading(true); // リロード中の状態にする

        // 少し遅延を入れてから遷移
        setTimeout(() => {
            router.push(path); // ルートを変更
            setIsLoading(false); // 更新が終わったらリロードマークを非表示にする
        }, 1000); // 1秒後に遷移
    };
    return (
        <div>
            <button className="Mlogo-button">N</button>
            {/* ロゴボタン */}

            <div className="Msidebar-modal">
                {/* ロゴボタン */}
                <div className="Msidebar-button-container">
                    <SidebarButton
                        push="/PostList"
                        isActive={activeButton === '/PostList'}
                        onClick={() => handleButtonClick('/PostList')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 3l10 9h-3v9h-6v-6h-4v6H5v-9H2z"/>
                        </svg>
                    </SidebarButton>
                </div>

                <div className="Msidebar-button-container">
                    <SidebarButton
                        push="/profile"
                        isActive={activeButton === '/profile'}
                        onClick={() => handleButtonClick('/profile')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path
                                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-4.41 0-8 2.79-8 6v2h16v-2c0-3.21-3.59-6-8-6z"/>
                        </svg>
                    </SidebarButton>
                </div>

                <div className="Msidebar-button-container" style={{paddingBottom: '5px'}}>
                    <SidebarButton
                        push="/DM"
                        isActive={activeButton === '/DM'}
                        onClick={() => handleButtonClick('/DM')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 13.5l8.5-6.5H3.5l8.5 6.5zm0 2.5l-9 6v-12l9 6 9-6v12l-9 6z"/>
                        </svg>
                    </SidebarButton>
                </div>

                <div className="Msidebar-button-container">
                    <Modal/>
                </div>

                <div className="Msidebar-button-container">
                    <SidebarButton
                        push="/community"
                        isActive={activeButton === '/Community'}
                        onClick={() => handleButtonClick('/Community')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path
                                d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm8 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm-8 0C5.67 13 1 14.17 1 16.5V19h6v-2.5C7 14.17 5.67 13 4 13z"/>
                        </svg>
                    </SidebarButton>
                </div>
            </div>
            {/* リロード中のマーク */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                </div>
            )}
        </div>

    );
};

export default SidebarModal;
