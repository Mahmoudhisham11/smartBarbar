"use client";
import { useEffect, useState } from "react";
import styles from "./styles.module.css";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/app/firebase";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import qz from "qz-tray";
import SideBar from "@/components/SideBar/page";

export default function Main() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedPrinter, setSelectedPrinter] = useState(null);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const productsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);
    });

    return () => unsubscribe();
  }, []);

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1, total: product.price }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const handlePrint = async () => {
    if (!cart.length) {
      alert("السلة فارغة!");
      return;
    }

    try {
      await qz.websocket.connect();
      const printers = await qz.printers.find();
      if (!printers.length) {
        alert("لم يتم العثور على أي طابعة");
        return;
      }

      const config = qz.configs.create(printers[0]); // أول طابعة
      const total = cart.reduce((acc, item) => acc + item.total, 0);

      // HTML الفاتورة
      const htmlInvoice = `
        <div style="font-family: Arial; font-size: 14px; text-align: center;">
          <h3>فاتورة بيع</h3>
          <p>العميل: ${clientName}</p>
          <p>التليفون: ${phone}</p>
          <hr/>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: center;">
            <thead>
              <tr>
                <th style="border: 1px solid #000;">الكود</th>
                <th style="border: 1px solid #000;">المنتج</th>
                <th style="border: 1px solid #000;">الكمية</th>
                <th style="border: 1px solid #000;">السعر</th>
              </tr>
            </thead>
            <tbody>
              ${cart
                .map(
                  (item) => `
                <tr>
                  <td style="border: 1px solid #000;">${item.code}</td>
                  <td style="border: 1px solid #000;">${item.name}</td>
                  <td style="border: 1px solid #000;">${item.quantity}</td>
                  <td style="border: 1px solid #000;">${item.total} $</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
          <hr/>
          <p><b>الإجمالي: ${total} $</b></p>
          <p>شكراً لتعاملكم معنا ❤️</p>
        </div>
      `;

      await qz.print(config, [
        {
          type: "html",
          format: "plain",
          data: htmlInvoice,
        },
      ]);

      await qz.websocket.disconnect();
    } catch (err) {
      console.error(err);
      alert("فشل في الطباعة");
    }
  };

  return (
    <div className={styles.container}>
      <SideBar/>
      <div className={styles.content}>
        <h2>المنتجات</h2>
        <div className={styles.products}>
          {products.map((product) => (
            <div
              key={product.id}
              className={styles.product}
              onClick={() => addToCart(product)}
            >
              <h4>{product.name}</h4>
              <p>{product.price} $</p>
            </div>
          ))}
        </div>

        <h2>السلة</h2>
        <div className={styles.cart}>
          {cart.map((item) => (
            <div key={item.id} className={styles.cartItem}>
              <p>
                {item.name} - {item.quantity} × {item.price} = {item.total} $
              </p>
              <button onClick={() => removeFromCart(item.id)}>حذف</button>
            </div>
          ))}
        </div>

        <div className={styles.clientInfo}>
          <input
            type="text"
            placeholder="اسم العميل"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <input
            type="text"
            placeholder="رقم الهاتف"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button onClick={handlePrint} className={styles.printBtn}>
          طباعة الفاتورة
        </button>
      </div>
    </div>
  );
}
