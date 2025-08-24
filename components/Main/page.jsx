'use client';
import SideBar from "../SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect, useRef } from "react";
import { IoMdSearch } from "react-icons/io";
import { CiShoppingCart } from "react-icons/ci";
import { FaRegTrashAlt } from "react-icons/fa";
import { IoIosCloseCircle } from "react-icons/io";
import { FaUser } from "react-icons/fa";
import { FaPhone } from "react-icons/fa";
import { FaBars } from "react-icons/fa6";
import {   
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs 
} from "firebase/firestore";
import { db } from "@/app/firebase";

function Main() {
  const [allItems, setAllItems] = useState([]); // 🆕 products + services
  const [cart, setCart] = useState([]);
  const [savePage, setSavePage] = useState(false)
  const [openSideBar, setOpenSideBar] = useState(false)
  const [isSaving, setIsSaving] = useState(false);
  const [customPrices, setCustomPrices] = useState({});
  const [searchCode, setSearchCode] = useState("");
  const nameRef = useRef();
  const phoneRef = useRef();  
  const shop = typeof window !== "undefined" ? localStorage.getItem("shop") : "";

  // ------------------ جلب المنتجات + الخدمات ------------------
  useEffect(() => {
    if (!shop) return;

    // جلب المنتجات
    const qProd = query(collection(db, "products"), where("shop", "==", shop));
    const unsubProd = onSnapshot(qProd, (snapshot) => {
      const products = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), type: "product" }));
      setAllItems(prev => {
        const servicesOnly = prev.filter(item => item.type === "service");
        return [...products, ...servicesOnly];
      });
    });

    // جلب الخدمات
    const qServ = query(collection(db, "services"), where("shop", "==", shop));
    const unsubServ = onSnapshot(qServ, (snapshot) => {
      const services = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), type: "service" }));
      setAllItems(prev => {
        const productsOnly = prev.filter(item => item.type === "product");
        return [...productsOnly, ...services];
      });
    });

    return () => {
      unsubProd();
      unsubServ();
    };
  }, [shop]);

  // ------------------ جلب السلة ------------------
  useEffect(() => {
    if (!shop) return;
    const qCart = query(collection(db, "cart"), where("shop", "==", shop));
    const unsubscribe = onSnapshot(qCart, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCart(data);
    });
    return () => unsubscribe();
  }, [shop]);
  
  // ------------------ Helpers ------------------
  const toNumber = (v) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const findItemByCode = (code) =>
    allItems.find(p => String(p.code).toLowerCase() === String(code).toLowerCase());

  const currentCartQtyForCode = (code) => {
    const item = cart.find(c => String(c.code).toLowerCase() === String(code).toLowerCase());
    return item ? toNumber(item.quantity) : 0;
  };

  const filteredItems = allItems.filter((p) => {
    const s = (searchCode || "").toLowerCase().trim();
    if (!s) return true;
    return String(p.name).toLowerCase().includes(s) || String(p.code).toLowerCase().includes(s);
  });

  // ------------------ Actions ------------------
  const handleAddToCart = async (item) => {
    // سعر نهائي
    const customPrice = toNumber(customPrices[item.id]);
    const basePrice = toNumber(item.price || item.sellPrice); // service = price, product = sellPrice
    const finalPrice = customPrice > 0 ? customPrice : basePrice;

    // لو المنتج من نوع product نتحقق من الكمية
    if (item.type === "product") {
      const prodQty = toNumber(item.quantity);
      const alreadyInCartQty = currentCartQtyForCode(item.code);
      if (prodQty <= 0 || alreadyInCartQty + 1 > prodQty) {
        alert(`الكمية غير كافية للمنتج: ${item.name}`);
        return;
      }
    }

    // لو موجود في السلة نزود الكمية
    const existing = cart.find(c => String(c.code).toLowerCase() === String(item.code).toLowerCase());
    if (existing) {
      const newQty = toNumber(existing.quantity) + 1;
      const newTotal = newQty * finalPrice;
      await updateDoc(doc(db, "cart", existing.id), {
        quantity: newQty,
        total: newTotal,
      });
    } else {
      await addDoc(collection(db, "cart"), {
        name: item.name,
        sellPrice: finalPrice,
        productPrice: basePrice,
        buyPrice: toNumber(item.buyPrice || 0),
        code: item.code,
        quantity: 1,
        type: item.type,
        total: finalPrice,
        date: new Date(),
        shop: shop,
      });
    }

    // مسح سعر مخصص
    setCustomPrices(prev => {
      const updated = { ...prev };
      delete updated[item.id];
      return updated;
    });
  };

  const handleQtyChange = async (cartItem, delta) => {
    const newQty = toNumber(cartItem.quantity) + delta;
    if (newQty < 1) return;

    if (cartItem.type === "product" && delta > 0) {
      const prod = findItemByCode(cartItem.code);
      const prodQty = prod ? toNumber(prod.quantity) : 0;
      if (newQty > prodQty) {
        alert(`الكمية المتاحة (${prodQty}) لا تسمح بزيادة المنتج: ${cartItem.name}`);
        return;
      }
    }

    const newTotal = newQty * toNumber(cartItem.sellPrice);
    await updateDoc(doc(db, "cart", cartItem.id), {
      quantity: newQty,
      total: newTotal,
    });
  };

  const handleDeleteCartItem = async (id) => {
    await deleteDoc(doc(db, "cart", id));
  };

  const totalAmount = cart.reduce((acc, item) => acc + toNumber(item.total), 0);

  // ------------------ حفظ التقرير ------------------
  const handleSaveReport = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const clientName = (nameRef.current?.value || "").trim();
    const phone = (phoneRef.current?.value || "").trim();

    if (cart.length === 0 || clientName === "" || phone === "") {
      alert("يرجى ملء جميع الحقول وإضافة منتجات إلى السلة");
      setIsSaving(false);
      return;
    }

    try {
      for (const item of cart) {
        if (item.type === "product") {
          const qProd = query(
            collection(db, "products"),
            where("code", "==", item.code),
            where("shop", "==", shop)
          );
          const snapshot = await getDocs(qProd);

          if (!snapshot.empty) {
            const productDoc = snapshot.docs[0];
            const productData = productDoc.data();
            const productRef = productDoc.ref;

            const availableQty = toNumber(productData.quantity);
            const sellQty = toNumber(item.quantity);

            if (sellQty > availableQty) {
              alert(`الكمية غير كافية للمنتج: ${item.name}`);
              setIsSaving(false);
              return;
            } else if (sellQty === availableQty) {
              await deleteDoc(productRef);
            } else {
              await updateDoc(productRef, {
                quantity: availableQty - sellQty,
              });
            }
          }
        }
      }

      const total = cart.reduce((sum, item) => sum + toNumber(item.total), 0);

      const saleData = {
        cart,
        clientName,
        phone,
        total,
        date: new Date(),
        shop,
      };

      await addDoc(collection(db, "reports"), saleData);

      // امسح السلة
      const qClear = query(collection(db, "cart"), where("shop", "==", shop));
      const cartSnapshot = await getDocs(qClear);
      for (const cDoc of cartSnapshot.docs) {
        await deleteDoc(cDoc.ref);
      }

      if (nameRef.current) nameRef.current.value = "";
      if (phoneRef.current) phoneRef.current.value = "";

      alert("تم حفظ التقرير بنجاح");
    } catch (error) {
      console.error("حدث خطأ أثناء حفظ التقرير:", error);
      alert("حدث خطأ أثناء حفظ التقرير");
    }

    setIsSaving(false);
    setSavePage(false);
  };

  return (
    <div className={styles.mainContainer}>
      <SideBar openSideBar={openSideBar} setOpenSideBar={setOpenSideBar}/>
      <div className={styles.boxContainer} style={{display: savePage ? 'block' : 'none'}}>
        <div className={styles.boxTitle}>
          <h2>تقفيل البيعة</h2>
          <button onClick={() => setSavePage(false)}><IoIosCloseCircle/></button>
        </div>
        <div className={styles.boxContent}>
          <div className="inputContainer">
            <label><FaUser/></label>
            <input ref={nameRef} type="text" placeholder="اسم العميل"/>
          </div>
          <div className="inputContainer">
            <label><FaPhone/></label>
            <input ref={phoneRef} type="text" placeholder="رقم الهاتف"/>
          </div>
          <button onClick={handleSaveReport} disabled={isSaving}>
            {isSaving ? "جارٍ الحفظ..." : "حفظ العملية"}
          </button>
        </div>
      </div>

      <div className={styles.middleSection}>
        <div className={styles.title}>
          <div className={styles.rightSide}>
            <button onClick={() => setOpenSideBar(true)}><FaBars/></button>
            <h3>المبيعات</h3>
          </div>
          <div className={styles.inputBox}>
            <div className="inputContainer">
              <label><IoMdSearch /></label>
              <input type="text" list="codeList" placeholder="ابحث عن منتج أو خدمة" value={searchCode} onChange={(e) => setSearchCode(e.target.value)}/>
              <datalist id="codeList">
                {allItems.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
        <hr />
        {/* ✅ جدول عرض المنتجات والخدمات */}
        <div className={styles.tableContainer}>
          <table>
            <thead>
              <tr>
                <th>الكود</th>
                <th>الاسم</th>
                <th>السعر</th>
                <th>الكمية</th>
                <th>سعر مخصص</th>
                <th>إضافة</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{toNumber(item.sellPrice || item.price)} EGP</td>
                  <td>
                    {item.type === "product" ? toNumber(item.quantity) : "∞"}
                  </td>
                  <td>
                    <input
                      type="number"
                      placeholder="سعر مخصص"
                      value={customPrices[item.id] || ""}
                      onChange={(e) =>
                        setCustomPrices({ ...customPrices, [item.id]: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <button onClick={() => handleAddToCart(item)}>
                      <CiShoppingCart />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ الفاتورة */}
      <div className={styles.resetContainer}>
        <div className={styles.reset}>
          <div className={styles.resetTitle}>
            <h3>الفاتورة</h3>
            <hr />
          </div>

          <div className={styles.orderBox}>
            {cart.map((item) => (
              <div className={styles.ordersContainer} key={item.id}>
                <div className={styles.orderInfo}>
                  <div className={styles.content}>
                    <button onClick={() => handleDeleteCartItem(item.id)}><FaRegTrashAlt /></button>
                    <div className={styles.text}>
                      <h4>{item.name}</h4>
                      <p>{toNumber(item.total)} EGP</p>
                    </div>
                  </div>
                  <div className={styles.qtyInput}>
                    <button onClick={() => handleQtyChange(item, -1)}>-</button>
                    <input type="text" value={toNumber(item.quantity)} readOnly />
                    <button onClick={() => handleQtyChange(item, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.totalContainer}>
            <hr />
            <div className={styles.totalBox}>
              <h3>الاجمالي</h3>
              <strong>{totalAmount} EGP</strong>
            </div>
            <div className={styles.resetBtns}>
              <button onClick={() => setSavePage(true)}>حفظ</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
