'use client';
import { useEffect, useState } from "react";
import styles from "./styles.module.css";
import Image from "next/image";
import resetImage from "../../public/images/logo.png";
import { useRouter } from "next/navigation";
import qz from "qz-tray";
import EscPosEncoder from 'escpos-encoder';

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
        console.log("QZ Tray connected ✅");
        setQzConnected(true);
      } catch (err) {
        console.error("QZ Tray connection error:", err);
        setQzConnected(false);
      }
    };

    connectQZ();
    const interval = setInterval(() => {
      if (!qz.websocket.isActive()) connectQZ();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Get printers
  const getPrinters = async () => {
    if (!qzConnected) {
      alert("يرجى التأكد من تشغيل QZ Tray.");
      return;
    }
    setLoadingPrinters(true);
    try {
      const list = await qz.printers.find();
      setPrinters(list);
      if (list.length > 0 && !selectedPrinter) setSelectedPrinter(list[0]);
    } catch (err) {
      console.error("Error fetching printers:", err);
      alert("فشل جلب الطابعات. تحقق من QZ Tray.");
    } finally {
      setLoadingPrinters(false);
    }
  };

  // Print invoice using escpos-encoder (supports Arabic)
  const handlePrint = async () => {
    if (!invoice) { alert("لا توجد فاتورة للطباعة."); return; }
    if (!selectedPrinter) { alert("يرجى اختيار الطابعة."); return; }

    try {
      if (!qz.websocket.isActive()) await qz.websocket.connect();

      const config = qz.configs.create(selectedPrinter);

      const encoder = new EscPosEncoder();
      encoder.initialize()
        .align('center')
        .text('********** Mahmoud Elsony **********')
        .newline()
        .align('left')
        .text('------------------------------------')
        .newline()
        .text(`العميل: ${invoice.clientName}`)
        .newline()
        .text(`الهاتف: ${invoice.phone}`)
        .newline()
        .text('------------------------------------')
        .newline()
        .text('الكود | المنتج | الكمية | السعر')
        .newline()
        .text('------------------------------------')
        .newline();

      invoice.cart.forEach(item => {
        encoder.text(`${item.code} | ${item.name} | ${item.quantity} | ${item.total} $`).newline();
      });

      encoder.text('------------------------------------').newline()
        .text(`الإجمالي: ${invoice.total} $`).newline()
        .text('------------------------------------').newline()
        .align('center')
        .text('شكراً لتعاملكم معنا!')
        .newline(3);

      const encodedData = encoder.encode(); // ArrayBuffer

      await qz.print(config, [{
        type: 'raw',
        format: 'hex',
        data: Buffer.from(encodedData).toString('hex')
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

      {/* عرض الفاتورة على الشاشة */}
      <div className={styles.invoice} style={{
        width: '384px', 
        fontFamily: 'Arial', 
        direction: 'rtl', 
        backgroundColor: 'white', 
        padding: '5px'
      }}>
        <h3 style={{ textAlign: 'center' }}>فاتورة</h3>
        <p><strong>العميل:</strong> {invoice.clientName}</p>
        <p><strong>الهاتف:</strong> {invoice.phone}</p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right' }}>الكود</th>
              <th style={{ textAlign: 'right' }}>المنتج</th>
              <th style={{ textAlign: 'right' }}>الكمية</th>
              <th style={{ textAlign: 'right' }}>السعر</th>
            </tr>
          </thead>
          <tbody>
            {invoice.cart.map(item => (
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

        <p style={{ textAlign: 'center', marginTop: '5px'}}>شكراً لتعاملكم معنا!</p>
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
