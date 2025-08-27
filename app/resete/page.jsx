'use client';
import { useEffect, useState } from "react";
import styles from "./styles.module.css";
import Image from "next/image";
import resetImage from "../../public/images/logo.png";
import { useRouter } from "next/navigation";

function Resete() {
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);

  // Load invoice from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const lastInvoice = localStorage.getItem("lastInvoice");
    if (lastInvoice) setInvoice(JSON.parse(lastInvoice));
  }, []);

  const handlePrint = () => {
    if (!invoice) { 
      alert("لا توجد فاتورة للطباعة."); 
      return; 
    }
    window.print();
  };

  if (!invoice) return <div className={styles.resete}><p>لا توجد فاتورة لعرضها.</p></div>;

  return (
    <div className={styles.resete}>
      <div className={styles.title}>
        <button onClick={() => router.push('/')} className={styles.btnBack}>رجوع</button>
        <h2>Mahmoud Elsony</h2>
        <div className={styles.imageContainer}>
          <Image src={resetImage} fill style={{ objectFit: 'cover' }} alt="logo" />
        </div>
      </div>

      {/* عرض الفاتورة على الشاشة */}
      <div className={styles.invoice}>
        <h2>فاتورة مبيعات</h2>
        <p>فاتورة عادية</p>
        <h3 style={{ textAlign: 'center' }}>فاتورة</h3>
        <p><strong>العميل:</strong> {invoice.clientName}</p>
        <p><strong>الهاتف:</strong> {invoice.phone}</p>

        <table>
          <thead>
            <tr>
              <th>الكود</th>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>السعر</th>
            </tr>
          </thead>
          <tbody>
            {invoice.cart.map(item => (
              <tr key={item.id}>
                <td>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{item.total} $</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>الإجمالي: {invoice.total} $</td>
            </tr>
          </tfoot>
        </table>
        <p>احمالي الفاتورة: {invoice.total}</p>
        <p>المدفوع: {invoice.total}</p>
        <p>المتبقي: 0.0</p>
        <p>عدد الاصناف:{invoice.lenth}</p>
        <p>الرصيد السابق: 0.0</p>
        <p>الرصيد المدفوع: {invoice.total}</p>
        <p>اجمالي الحساب: {invoice.toal}</p>
        <p>العنوان: شارع السجل المدني جراج محمد حسن رضوا</p>
        <p style={{ textAlign: 'center', marginTop: '5px'}}>رقم الهاتف: 01120391795</p>
        <p style={{ textAlign: 'center', marginTop: '5px'}}>شكراً لتعاملكم معنا!</p>
      </div>

      <div className={styles.btn}>
        <button onClick={handlePrint}>طباعة الفاتورة</button>
      </div>

      <div className={styles.footer}>
        <strong>تم التوجيه بواسطة: Devoria</strong>
      </div>
    </div>
  );
}

export default Resete;
