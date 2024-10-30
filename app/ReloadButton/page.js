"use client";  // クライアントコンポーネントとして指定

import React from 'react';

const ReloadButton = () => {
    const handleReload = () => {
        window.location.reload(); // ページをリロード
    };

    return (
        <button className="logo-button" type="button" onClick={handleReload}>
            N
        </button>
    );
};

export default ReloadButton;