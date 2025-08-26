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

  // تحميل الفاتورة والاتصال بـ QZ Tray
  useEffect(() => {
    if (typeof window === "undefined") return;

    const lastInvoice = localStorage.getItem("lastInvoice");
    if (lastInvoice) setInvoice(JSON.parse(lastInvoice));

    const connectQZ = async () => {
      try {
        if (!qz.websocket.isActive()) {
          await qz.websocket.connect();
        }
        setQzConnected(true);
      } catch (err) {
        console.warn("يرجى تشغيل QZ Tray على جهازك:", err);
        setQzConnected(false);
      }
    };

    connectQZ();
    const interval = setInterval(() => {
      if (!qzConnected) connectQZ();
    }, 3000); 

    return () => clearInterval(interval);
  }, [qzConnected]);

  // جلب الطابعات
  const getPrinters = async () => {
    if (!qzConnected) {
      alert("يرجى التأكد من تشغيل QZ Tray على جهازك.");
      return;
    }
    setLoadingPrinters(true);
    try {
      const list = await qz.printers.find();
      setPrinters(list);
      if (list.length > 0 && !selectedPrinter) setSelectedPrinter(list[0]);
    } catch (err) {
      console.error("خطأ في جلب الطابعات:", err);
      alert("فشل جلب الطابعات، تحقق من تشغيل QZ Tray.");
    } finally {
      setLoadingPrinters(false);
    }
  };

  // دالة الطباعة باستخدام HTML لدعم العربي والإنجليزي
  const handlePrint = async () => {
    if (!invoice) { alert("لا توجد فاتورة للطباعة."); return; }
    if (!selectedPrinter) { alert("يرجى اختيار طابعة."); return; }

    try {
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
        setQzConnected(true);
      }

      const config = qz.configs.create(selectedPrinter);

      const html = `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2 style="text-align:center;">********** Mahmoud Elsony **********</h2>
          <hr>
          <p>اسم العميل: ${invoice.clientName}</p>
          <p>رقم الهاتف: ${invoice.phone}</p>
          <hr>
          <table style="width:100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border:1px solid #000;">الكود</th>
                <th style="border:1px solid #000;">المنتج</th>
                <th style="border:1px solid #000;">الكمية</th>
                <th style="border:1px solid #000;">السعر</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.cart.map(item => `
                <tr>
                  <td style="border:1px solid #000;">${item.code}</td>
                  <td style="border:1px solid #000;">${item.name}</td>
                  <td style="border:1px solid #000;">${item.quantity}</td>
                  <td style="border:1px solid #000;">${item.total} جنيه</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="border:1px solid #000; text-align:right;">الإجمالي: ${invoice.total} جنيه</td>
              </tr>
            </tfoot>
          </table>
          <hr>
          <p style="text-align:center;">شكراً لتعاملكم معنا!</p>
        </div>
      `;

      await qz.print(config, [
        {
          type: 'html',
          format: 'plain',
          flavor: 'plain',
          data: html
        }
      ]);

      localStorage.removeItem("lastInvoice");
      alert("تمت الطباعة بنجاح!");
    } catch (err) {
      console.error("خطأ أثناء الطباعة:", err);
      alert("فشل الطباعة. تحقق من تشغيل QZ Tray والطابعة.");
    }
  };

  if (!invoice) {
    return <div className={styles.resete}><p>لا توجد فاتورة للعرض.</p></div>;
  }

  return (
    <div className={styles.resete}>
      <div className={styles.title}>
        <button onClick={() => router.push('/')} className={styles.btnBack}>رجوع</button>
        <h2>Mahmoud Elsony</h2>
        <div className={styles.imageContainer}>
          <Image src={resetImage} fill style={{ objectFit: 'cover' }} alt="logo" />
        </div>
      </div>

      <div className={styles.content}>
        <strong>اسم العميل: {invoice.clientName}</strong>
        <strong>رقم الهاتف: {invoice.phone}</strong>
      </div>

      <div style={{ margin: '10px 0' }}>
        <button onClick={getPrinters} disabled={loadingPrinters}>
          {loadingPrinters ? "جلب الطابعات..." : "جلب الطابعات المتصلة"}
        </button>
        {printers.length > 0 && (
          <select value={selectedPrinter} onChange={(e) => setSelectedPrinter(e.target.value)}>
            {printers.map((p, idx) => (
              <option key={idx} value={p}>{p}</option>
            ))}
          </select>
        )}
      </div>

      <div className={styles.tableContainer}>
        <table>
          <thead>
            <tr>
              <th>الكود</th>
              <th>الخدمة/المنتج</th>
              <th>الكمية</th>
              <th>السعر</th>
            </tr>
          </thead>
          <tbody>
            {invoice.cart.map((item) => (
              <tr key={item.id}>
                <td>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{item.total} جنيه</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>الإجمالي: {invoice.total} جنيه</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.btn}>
        <button onClick={handlePrint} disabled={!selectedPrinter || !qzConnected}>
          طباعة الفاتورة
        </button>
      </div>

      <div className={styles.footer}>
        <strong>directed by : Devori</strong>
      </div>
    </div>
  );
}

export default Resete;
