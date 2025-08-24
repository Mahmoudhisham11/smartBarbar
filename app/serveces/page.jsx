'use client';
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect } from "react";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { GiMoneyStack } from "react-icons/gi";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { db } from "@/app/firebase";

function Services() {
  const [active, setActive] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [services, setServices] = useState([]);

  // 📥 جلب البيانات
  useEffect(() => {
    const shop = localStorage.getItem("shop");
    if (!shop) return;

    const q = query(collection(db, "services"), where("shop", "==", shop));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setServices(data);
    });
    return () => unsubscribe();
  }, []);

  // ✅ دالة تجيب الكود الجديد من counters
  const getNextCode = async () => {
    const counterRef = doc(db, "counters", "phones");
    const counterSnap = await getDoc(counterRef);

    if (counterSnap.exists()) {
      const lastCode = counterSnap.data().lastCode || 1000;
      // ✏️ تحديث العداد بعد ما نجيب الكود
      await updateDoc(counterRef, { lastCode: lastCode + 1 });
      return lastCode + 1;
    } else {
      // لو الوثيقة مش موجودة نعملها من 1000
      await updateDoc(counterRef, { lastCode: 1000 });
      return 1000;
    }
  };

  // ➕ إضافة خدمة جديدة
  const handleAddService = async () => {
    if (!name || !price) {
      alert("❗️من فضلك ادخل جميع البيانات");
      return;
    }

    const newCode = await getNextCode();

    await addDoc(collection(db, "services"), {
      code: newCode,
      name,
      price: Number(price),
      date: Timestamp.now(),
      shop: localStorage.getItem("shop"),
      userEmail: localStorage.getItem("email"),
      type: "service"
    });

    setName("");
    setPrice("");
    setActive(false);
    alert("✅ تم إضافة الخدمة بنجاح");
  };

  // ❌ حذف خدمة
  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "services", id));
  };

  return (
    <div className={styles.serveces}>
      <SideBar />
      <div className={styles.content}>
        <div className={styles.btns}>
          <button onClick={() => setActive(false)}>كل الخدمات</button>
          <button onClick={() => setActive(true)}>اضف خدمة جديدة</button>
        </div>

        {/* جدول عرض الخدمات */}
        <div
          className={styles.phoneContainer}
          style={{ display: active ? "none" : "flex" }}
        >
          <div className={styles.tableContainer}>
            <table>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>السعر</th>
                  <th>التاريخ</th>
                  <th>حذف</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>{service.code}</td>
                    <td>{service.name}</td>
                    <td>{service.price} جنيه</td>
                    <td>{service.date?.toDate().toLocaleDateString("ar-EG")}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(service.id)}
                        style={{ color: "red" }}
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* إضافة خدمة جديدة */}
        <div
          className={styles.addContainer}
          style={{ display: active ? "flex" : "none" }}
        >
          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label>
                <MdDriveFileRenameOutline />
              </label>
              <input
                type="text"
                placeholder="اسم الخدمة"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label>
                <GiMoneyStack />
              </label>
              <input
                type="number"
                placeholder="سعر الخدمة"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <button className={styles.addBtn} onClick={handleAddService}>
            اضف الخدمة
          </button>
        </div>
      </div>
    </div>
  );
}

export default Services;
