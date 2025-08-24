'use client';
import styles from "./styles.module.css";
import Image from "next/image";
import logo from "../../public/images/logo.png"
import { useState } from "react";
import { db } from "@/app/firebase";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { CiMail } from "react-icons/ci";
import { CiLock } from "react-icons/ci";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { IoStorefrontOutline } from "react-icons/io5";

function Login() {
    const [creat, setCreat] = useState(false)
    const [userName, setUserName] = useState('')
    const [password, setPassword] = useState('')
    const [shop, setShop] = useState('')
    
    const handleCreatAcc = async() => {
        if(!userName) {
            alert("يجب ادخال اسم المستخدم")
            return
        }
        if(!password) {
            alert("يجب ادخال كلمة المرور")
            return
        }
        const q = query(collection(db, 'snadUsers'), where('userName', '==', userName))
        const querySnapshot = await getDocs(q)
        if(querySnapshot.empty) {
            await addDoc(collection(db, 'snadUsers'), {
                userName,
                 password, 
                 shop,
                 isSubscribed: false
                })
            alert("تم انشاء حساب للمستخدم")
            setUserName('')
            setPassword('')
            setShop('')
        }else {
            alert('المستخدم موجود بالفعل')
        }
    }

    const handleLogin = async() => {
        const q = query(collection(db, 'snadUsers'), where('userName', '==', userName))
        const querySnapshot = await getDocs(q)
        if(querySnapshot.empty) {
            alert('اسم المستخدم غير صحيح')
        }else {
            const userDoc = querySnapshot.docs[0] 
            const userData = userDoc.data()
            if(userData.password !== password) {
                alert("كلمة المرور غير صحيحة")
            }else {
                if(userData.isSubscribed === false) {
                    alert('يجب تفعيل البرنامج اولا برجاء التواصل مع المطور')
                }else {
                    if(typeof window !== 'undefinde') {
                        localStorage.setItem('userName', userData.userName)
                        localStorage.setItem('shop', shop)
                        window.location.reload()
                    }
                }
            }
        }
    }

    return(
        <div className={styles.loginContainer}>
            <div className={styles.logoContainer}>
                <h2>Mahmoud Elsony</h2>
                <div className={styles.imageContaienr}>
                    <Image src={logo} fill style={{objectFit: 'cover'}} className={styles.logoImage} alt="logoImage"/>
                </div>
            </div>
            <div className={styles.loginContent} style={{display: creat ? 'none' : 'flex'}}>
                <div className={styles.title}>
                    <h3>مرحبا بك برجاء تسجيل الدخول</h3>
                </div>
                <div className={styles.inputs}>
                    <div className="inputContainer">
                        <label><MdDriveFileRenameOutline/></label>
                        <input type="text" value={userName} placeholder="اسم المستخدم" onChange={(e) => setUserName(e.target.value)}/>
                    </div>
                    <div className="inputContainer">
                        <label><CiLock/></label>
                        <input type="password" placeholder="كلمة المرور" onChange={(e) => setPassword(e.target.value)}/>
                    </div>
                    <div className="inputContainer">
                        <label><IoStorefrontOutline/></label>
                        <input type="text" value={shop} placeholder="اسم الفرع" onChange={(e) => setShop(e.target.value)}/>
                    </div>
                    <button className={styles.loginBtn} onClick={handleLogin}>تسجيل الدخول</button>
                    <button className={styles.creatBtn} onClick={() => setCreat(true)}>ليس لديك لديك حساب؟ <span>انشاء حساب جديد</span></button>
                </div>
            </div>
            <div className={styles.loginContent} style={{display: creat ? 'flex' : 'none'}}>
                <div className={styles.title}>
                    <h3>مرحبا بك برجاء انشاء حساب جديد</h3>
                </div>
                <div className={styles.inputs}>
                    <div className="inputContainer">
                        <label><MdDriveFileRenameOutline/></label>
                        <input type="text" value={userName} placeholder="اسم المستخدم" onChange={(e) => setUserName(e.target.value)}/>
                    </div>
                    <div className="inputContainer">
                        <label><CiLock/></label>
                        <input type="password" value={password} placeholder="كلمة المرور" onChange={(e) => setPassword(e.target.value)}/>
                    </div>
                    <div className="inputContainer">
                        <label><IoStorefrontOutline/></label>
                        <input type="text" value={shop} placeholder="اسم الفرع" onChange={(e) => setShop(e.target.value)}/>
                    </div>
                    <button className={styles.loginBtn}  onClick={handleCreatAcc}> انشاء حساب جديد</button>
                    <button className={styles.creatBtn} onClick={() => setCreat(false)}>لديك حساب بالفعل؟ <span>تسجيل الدخول</span></button>
                </div>
            </div>
        </div>
    )
}

export default Login;