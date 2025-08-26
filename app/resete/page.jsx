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

  // Print invoice using HTML
  const handlePrint = async () => {
    if (!invoice) { alert("No invoice to print."); return; }
    if (!selectedPrinter) { alert("Please select a printer."); return; }

    try {
      if (!qz.websocket.isActive()) await qz.websocket.connect();

      const config = qz.configs.create(selectedPrinter);

      const html = `
        <div style="font-family: Arial, sans-serif; direction: ltr; text-align: left;">
          <div style="text-align:center;">
            <img src="${resetImage.src}" width="100" height="100" />
            <h2>Mahmoud Elsony</h2>
          </div>
          <hr>
          <p>Client: ${invoice.clientName}</p>
          <p>Phone: ${invoice.phone}</p>
          <hr>
          <table style="width:100%; border-collapse: collapse;" border="1">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.cart.map(item => `
                <tr>
                  <td>${item.code}</td>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.total} $</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align:right;">Total: ${invoice.total} $</td>
              </tr>
            </tfoot>
          </table>
          <hr>
          <p style="text-align:center;">Thanks for working with us!</p>
        </div>
      `;

      await qz.print(config, [{ type: 'html', data: html }]);
      localStorage.removeItem("lastInvoice");
      alert("Invoice printed successfully!");
    } catch (err) {
      console.error("Print error:", err);
      alert("Failed to print. Check QZ Tray and printer.");
    }
  };

  if (!invoice) return <div className={styles.resete}><p>No invoice to display.</p></div>;

  return (
    <div className={styles.resete}>
      <div className={styles.title}>
        <button onClick={() => router.push('/')} className={styles.btnBack}>Back</button>
        <h2>Mahmoud Elsony</h2>
        <div className={styles.imageContainer}>
          <Image src={resetImage} fill style={{ objectFit: 'cover' }} alt="logo" />
        </div>
      </div>

      <div className={styles.content}>
        <strong>Client: {invoice.clientName}</strong>
        <strong>Phone: {invoice.phone}</strong>
      </div>

      <div style={{ margin: '10px 0' }}>
        <button onClick={getPrinters} disabled={loadingPrinters}>
          {loadingPrinters ? "Fetching printers..." : "Get Printers"}
        </button>
        {printers.length > 0 && (
          <select value={selectedPrinter} onChange={(e) => setSelectedPrinter(e.target.value)}>
            {printers.map((p, idx) => <option key={idx} value={p}>{p}</option>)}
          </select>
        )}
      </div>

      <div className={styles.tableContainer}>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {invoice.cart.map((item) => (
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
              <td colSpan={4} style={{ textAlign: 'right' }}>Total: {invoice.total} $</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.btn}>
        <button onClick={handlePrint} disabled={!selectedPrinter || !qzConnected}>
          Print Invoice
        </button>
      </div>

      <div className={styles.footer}>
        <strong>directed by: Devori</strong>
      </div>
    </div>
  );
}

export default Resete;
