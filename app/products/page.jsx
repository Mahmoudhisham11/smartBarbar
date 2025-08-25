'use client';

import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect } from "react";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { GiMoneyStack } from "react-icons/gi";
import { CiSearch } from "react-icons/ci";
import { FaRegTrashAlt } from "react-icons/fa";
import { GoNumber } from "react-icons/go";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  Timestamp,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

function Products() {
  const [active, setActive] = useState(false);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchCode, setSearchCode] = useState("");
  const [totalBuy, setTotalBuy] = useState(0);   // ✅ إجمالي الشراء
  const [totalSell, setTotalSell] = useState(0); // ✅ إجمالي البيع

  const [form, setForm] = useState({
    name: "",
    buyPrice: "",
    sellPrice: "",
    quantity: "",
  });

  // 📥 تحميل المنتجات
  useEffect(() => {
    const shop = localStorage.getItem("shop");
    if (!shop) return;

    const q = query(
      collection(db, "products"),
      where("shop", "==", shop),
      where("type", "==", "product")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(data);

      // ✅ حساب الإجماليات
      let totalBuyAmount = 0;
      let totalSellAmount = 0;
      data.forEach((product) => {
        totalBuyAmount += (product.buyPrice || 0) * (product.quantity || 1);
        totalSellAmount += (product.sellPrice || 0) * (product.quantity || 1);
      });
      setTotalBuy(totalBuyAmount);
      setTotalSell(totalSellAmount);

      // ✅ فلترة بالبحث
      if (searchCode.trim()) {
        const filtered = data.filter((p) =>
          p.name?.toLowerCase().includes(searchCode.trim().toLowerCase())
        );
        setFilteredProducts(filtered);
      } else {
        setFilteredProducts(data);
      }
    });

    return () => unsubscribe();
  }, [searchCode]);

  // ✅ الحصول على الكود الجديد من counters/count باستخدام lastNumber
  const getNextCode = async () => {
    const counterRef = doc(db, "counters", "count");
    const counterSnap = await getDoc(counterRef);

    if (!counterSnap.exists()) {
      // لو مفيش counters → ابدأ من 1000
      await setDoc(counterRef, { lastNumber: 1000 });
      return 1000;
    }

    const lastNumber = counterSnap.data().lastNumber || 1000;

    // نزود واحد ونحدث الـ counter
    const newCode = lastNumber + 1;
    await updateDoc(counterRef, { lastNumber: newCode });
    return newCode;
  };

  // ➕ إضافة منتج جديد
  const handleAddProduct = async () => {
    const shop = localStorage.getItem("shop");

    if (!form.name || !form.buyPrice || !form.sellPrice || !form.quantity) {
      alert("❗️يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const newCode = await getNextCode();

    await addDoc(collection(db, "products"), {
      code: newCode,
      name: form.name,
      buyPrice: Number(form.buyPrice),
      sellPrice: Number(form.sellPrice),
      quantity: Number(form.quantity),
      date: Timestamp.now(),
      shop: shop,
      userEmail: localStorage.getItem("email"),
      type: "product"
    });

    alert("✅ تم إضافة المنتج");
    setForm({ name: "", buyPrice: "", sellPrice: "", quantity: "" });
  };

  // ❌ حذف منتج
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (err) {
      console.error("❌ خطأ أثناء الحذف:", err);
    }
  };

  return (
    <div className={styles.products}>
      <SideBar />

      <div className={styles.content}>
        <div className={styles.btns}>
          <button onClick={() => setActive(false)}>كل المنتجات</button>
          <button onClick={() => setActive(true)}>اضف منتج جديد</button>
        </div>

        {/* ✅ عرض المنتجات */}
        <div
          className={styles.phoneContainer}
          style={{ display: active ? "none" : "flex" }}
        >
          <div className={styles.searchBox}>
            <div className="inputContainer">
              <label><CiSearch /></label>
              <input
                type="text"
                list="code"
                placeholder="ابحث بالاسم"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
              />
              <datalist id="code">
                {products.map((product) => (
                  <option key={product.id} value={product.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className={styles.totals}>
            <p>اجمالي الشراء: {totalBuy} EGP</p>
            <p>اجمالي البيع: {totalSell} EGP</p>
          </div>

          <div className={styles.tableContainer}>
            <table>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>سعر الشراء</th>
                  <th>سعر البيع</th>
                  <th>الكمية</th>
                  <th>التاريخ</th>
                  <th>حذف</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.code}</td>
                    <td>{product.name}</td>
                    <td>{product.buyPrice} EGP</td>
                    <td>{product.sellPrice} EGP</td>
                    <td>{product.quantity}</td>
                    <td>{product.date?.toDate().toLocaleDateString("ar-EG")}</td>
                    <td>
                      <button
                        className={styles.delBtn}
                        onClick={() => handleDelete(product.id)}
                      >
                        <FaRegTrashAlt />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ➕ إضافة منتج جديد */}
        <div
          className={styles.addContainer}
          style={{ display: active ? "flex" : "none" }}
        >
          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label><MdDriveFileRenameOutline /></label>
              <input
                type="text"
                placeholder="اسم المنتج"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label><GiMoneyStack /></label>
              <input
                type="number"
                placeholder="سعر الشراء"
                value={form.buyPrice}
                onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
              />
            </div>

            <div className="inputContainer">
              <label><GiMoneyStack /></label>
              <input
                type="number"
                placeholder="سعر البيع"
                value={form.sellPrice}
                onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label><GoNumber /></label>
              <input
                type="number"
                placeholder="الكمية"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
          </div>

          <button className={styles.addBtn} onClick={handleAddProduct}>
            اضف المنتج
          </button>
        </div>
      </div>
    </div>
  );
}

export default Products;
