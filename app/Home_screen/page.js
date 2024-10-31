"use client";

import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, } from 'firebase/firestore';

export const HomeScreen = async () => {

    const postCollection = collection(db, "post");
    const snapshot = await getDocs(postCollection);

    const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));
    return posts
    // const [posts, setposts] = useState([]);

    // useEffect(() => {
    //     const unsubscribe = onSnapshot(collection(db, "post"), (snapshot) => {
    //         const postData = snapshot.docs.map(doc => ({
    //             id: doc.id,
    //             content: doc.data().content,
    //             create_at: doc.data().create_at,
    //             post_id: doc.data().post_id,
    //             user_id: doc.data().user_id
    //         }));
    //         setposts(postData);
    //     });
    //     return () => unsubscribe();
    // },[]);

    // return (
    //     <div>
    //         {posts.map(post => (
    //             <div key={post.id}>
    //                 <p>内容: {post.content}</p>
    //                 <p>投稿日: {new Date(post.create_at.seconds * 1000).toLocaleString()}</p>
    //                 <p>投稿ID: {post.post_id}</p>
    //                 <p>ユーザーID: {post.user_id}</p>
    //             </div>
    //         ))}
    //     </div>
    // );
};

