'use client';

import { useEffect, useState } from "react";
import styles from "./styles.module.css";
import Image from "next/image";
import resetImage from "../../public/images/logo.png";
import { useRouter } from "next/navigation";
import qz from "qz-tray";

function Resete() {
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [qzConnected, setQzConnected] = useState(false);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

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

  // Print invoice as raw ESC/POS
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
      if (!qz.websocket.isActive()) await qz.websocket.connect();
      const config = qz.configs.create(selectedPrinter);

      // تجهيز نص الفاتورة بصيغة raw ESC/POS
      let data = '';
      data += '\x1B\x40'; // Initialize printer
      data += '\x1B\x61\x01'; // Center
      data += '********** فاتورة **********\n';
      data += '\x1B\x61\x00'; // Left
      data += `العميل: ${invoice.clientName}\n`;
      data += `الهاتف: ${invoice.phone}\n`;
      data += '------------------------------\n';
      data += 'الكود | المنتج | الكمية | السعر\n';
      data += '------------------------------\n';
      invoice.cart.forEach(item => {
        data += `${item.code} | ${item.name} | ${item.quantity} | ${item.total}\n`;
      });
      data += '------------------------------\n';
      data += `الإجمالي: ${invoice.total}\n`;
      data += '\n\x1B\x61\x01شكراً لتعاملكم معنا!\n\n\n';
      data += '\x1D\x56\x41'; // Cut paper

      // الطباعة
      await qz.print(config, [{ type: 'raw', format: 'plain', data }]);
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

      {/* عرض معلومات الفاتورة */}
      <div className={styles.invoice} style={{ fontFamily: 'Tajawal, Cairo, sans-serif', direction: 'rtl', backgroundColor: 'white', padding: '10px' }}>
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
