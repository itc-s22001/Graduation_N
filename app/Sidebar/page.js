// src/components/Sidebar.js
"use client"; // この行を追加

import React from 'react';
import Link from 'next/link'; // next/linkをインポート
import '@/style/sidebar.css'; // CSSファイルのインポート
import ReloadButton from '@/app/ReloadButton/page'; // ReloadButtonをインポート

const Sidebar = () => {
    return (
        <div className="sidebar">
            <ReloadButton /> {/* Nボタンをリロード機能付きに変更 */}
            <div className="button-container">
                <div className="buttons">
                    <Link href="/" className="sidebar-button">ホーム</Link>
                    <Link href="/profile" className="sidebar-button">プロフィール</Link>
                    <button className="sidebar-button">通知</button>
                    <button className="sidebar-button">DM</button>
                    <button className="sidebar-button">投稿</button>
                    <button className="sidebar-button">コミュニティ</button>
                    <button className="sidebar-button">アンケート</button>
                    <button className="sidebar-button">設定</button>
                </div>
                <div className="separator" /> {/* 縦線のための要素 */}
            </div>
        </div>
    );
};

export default Sidebar;