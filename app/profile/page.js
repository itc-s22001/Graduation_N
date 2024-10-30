"use client";

import React from "react";
import "../../Style/profile.css";
import Sidebar from "../Sidebar/page";  // サイドバーをインポート
import Searchbar from "../Searchbar/page";  // 検索バーをインポート

const ProfilePage = () => {
    return (
        <div className="profile-page">
            <Sidebar /> {/* サイドバーを左側に配置 */}

            {/*<Searchbar /> /!* 検索バーを右側に配置 *!/*/}
        </div>
    );
};

export default ProfilePage;
