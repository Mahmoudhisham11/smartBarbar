'use client';

import { useEffect, useState, useRef } from "react";
import styles from "./styles.module.css";
import Image from "next/image";
import resetImage from "../../public/images/logo.png";
import { useRouter } from "next/navigation";
import qz from "qz-tray";
import { toPng } from 'html-to-image';

function Resete() {
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [qzConnected, setQzConnected] = useState(false);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  const invoiceRef = useRef(null); // للفاتورة HTML

  // Load invoice & connect QZ Tray
  useEffect(() => {
    if (typeof window === "undefined") return;

    const lastInvoice = localStorage.getItem("lastInvoice");
    if (lastInvoice) setInvoice(JSON.parse(lastInvoice));

    const connectQZ = async () => {
      try {
        if (!qz.websocket.isActive()) await qz.websocket.connect();
        setQzConnected(true);
      } catch (err) {
        console.warn("Please run QZ Tray:", err);
        setQzConnected(false);
      }
    };

    connectQZ();
    const interval = setInterval(() => {
      if (!qzConnected) connectQZ();
    }, 3000);

    return () => clearInterval(interval);
  }, [qzConnected]);

  // Get printers
  const getPrinters = async () => {
    if (!qzConnected) {
      alert("Please ensure QZ Tray is running.");
      return;
    }
    setLoadingPrinters(true);
    try {
      const list = await qz.printers.find();
      setPrinters(list);
      if (list.length > 0 && !selectedPrinter) setSelectedPrinter(list[0]);
    } catch (err) {
      console.error("Error fetching printers:", err);
      alert("Failed to fetch printers. Check QZ Tray.");
    } finally {
      setLoadingPrinters(false);
    }
  };

  // Print invoice as image
  const handlePrint = async () => {
    if (!invoice) {
      alert("لا توجد فاتورة للطباعة.");
      return;
    }
    if (!selectedPrinter) {
      alert("يرجى اختيار الطابعة أولاً.");
      return;
    }

    try {
      // تحويل الفاتورة لـ PNG مع ضبط العرض
      const dataUrl = await toPng(invoiceRef.current, {
        width: 384, // مثال عرض رول حراري شائع
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      // إعداد الطابعة
      if (!qz.websocket.isActive()) await qz.websocket.connect();
      const config = qz.configs.create(selectedPrinter);

      // الطباعة كصورة
      await qz.print(config, [{
        type: 'image',
        format: 'png',
        data: dataUrl
      }]);

      localStorage.removeItem("lastInvoice");
      alert("تم طباعة الفاتورة بنجاح!");
    } catch (err) {
      console.error("Print error:", err);
      alert("حدث خطأ أثناء الطباعة. تحقق من الطابعة وQZ Tray.");
    }
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

      {/* فاتورة HTML */}
      <div ref={invoiceRef} className={styles.invoice} style={{ fontFamily: 'Tajawal, Cairo, sans-serif', direction: 'rtl', backgroundColor: 'white', padding: '10px' }}>
        <h3 style={{ textAlign: 'center' }}>فاتورة</h3>
        <p><strong>العميل:</strong> {invoice.clientName}</p>
        <p><strong>الهاتف:</strong> {invoice.phone}</p>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #000', textAlign: 'right' }}>الكود</th>
              <th style={{ borderBottom: '1px solid #000', textAlign: 'right' }}>المنتج</th>
              <th style={{ borderBottom: '1px solid #000', textAlign: 'right' }}>الكمية</th>
              <th style={{ borderBottom: '1px solid #000', textAlign: 'right' }}>السعر</th>
            </tr>
          </thead>
          <tbody>
            {invoice.cart.map((item) => (
              <tr key={item.id}>
                <td style={{ textAlign: 'right' }}>{item.code}</td>
                <td style={{ textAlign: 'right' }}>{item.name}</td>
                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{item.total} $</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ textAlign: 'right', borderTop: '1px solid #000' }}>الإجمالي: {invoice.total} $</td>
            </tr>
          </tfoot>
        </table>

        <p style={{ textAlign: 'center', marginTop: '20px' }}>شكراً لتعاملكم معنا!</p>
      </div>

      <div style={{ margin: '10px 0' }}>
        <button onClick={getPrinters} disabled={loadingPrinters}>
          {loadingPrinters ? "جاري جلب الطابعات..." : "جلب الطابعات"}
        </button>

        {printers.length > 0 && (
          <select value={selectedPrinter} onChange={(e) => setSelectedPrinter(e.target.value)}>
            {printers.map((p, idx) => <option key={idx} value={p}>{p}</option>)}
          </select>
        )}
      </div>

      <div className={styles.btn}>
        <button onClick={handlePrint} disabled={!selectedPrinter || !qzConnected}>
          طباعة الفاتورة
        </button>
      </div>

      <div className={styles.footer}>
        <strong>تم التوجيه بواسطة: Devori</strong>
      </div>
    </div>
  );
}

export default Resete;
