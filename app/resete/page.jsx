'use client';
import { useEffect, useState } from "react";
import styles from "./styles.module.css";
import Image from "next/image";
import resetImage from "../../public/images/logo.png";
import { useRouter } from "next/navigation";
import qz from "qz-tray"; // استدعاء مكتبة QZ Tray من npm

function Resete() {
    const router = useRouter();
    const [invoice, setInvoice] = useState(null);
    const [printers, setPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState("");
    const [qzLoaded, setQzLoaded] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const lastInvoice = localStorage.getItem("lastInvoice");
            if (lastInvoice) setInvoice(JSON.parse(lastInvoice));

            // محاولة الاتصال بـ QZ Tray عند تحميل الصفحة
            const tryConnect = async () => {
                try {
                    await qz.websocket.connect();
                    setQzLoaded(true);
                } catch (err) {
                    console.warn("انتظر تشغيل QZ Tray على الجهاز:", err);
                }
            };
            tryConnect();
        }
    }, []);

    // جلب قائمة الطابعات المتصلة
    const getPrinters = async () => {
        try {
            if (!qzLoaded) {
                alert("يرجى التأكد من تشغيل QZ Tray على جهازك.");
                return;
            }
            const list = await qz.printers.find();
            setPrinters(list);
            if (list.length > 0) setSelectedPrinter(list[0]);
        } catch (err) {
            console.error("خطأ في جلب الطابعات:", err);
        }
    };

    // دالة الطباعة
    const handlePrint = async () => {
        if (!invoice || !selectedPrinter) return;

        try {
            const config = qz.configs.create(selectedPrinter);

            const data = [
                '\x1B\x61\x01', // center
                '********** Mahmoud Elsony **********\n',
                '\x1B\x61\x00', // left
                '------------------------------------\n',
                `اسم العميل: ${invoice.clientName}\n`,
                `رقم الهاتف: ${invoice.phone}\n`,
                '------------------------------------\n',
                'الكود | المنتج | كمية | السعر\n',
                '------------------------------------\n',
                ...invoice.cart.map(item => 
                    `${item.code} | ${item.name} | ${item.quantity} | ${item.total} جنيه\n`
                ),
                '------------------------------------\n',
                `الإجمالي: ${invoice.total} جنيه\n`,
                '------------------------------------\n',
                '\x1B\x61\x01', // center
                'شكراً لتعاملكم معنا!\n\n\n'
            ];

            await qz.print(config, data);
            localStorage.removeItem("lastInvoice");
        } catch (err) {
            console.error("خطأ في الطباعة:", err);
            alert("حدث خطأ أثناء الطباعة، تحقق من Console.");
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
                    <Image src={resetImage} fill style={{objectFit: 'cover'}} alt="logo"/>
                </div>
            </div>

            <div className={styles.content}>
                <strong>اسم العميل: {invoice.clientName}</strong>
                <strong>رقم الهاتف: {invoice.phone}</strong>
            </div>

            <div style={{ margin: '10px 0' }}>
                <button onClick={getPrinters}>
                    جلب الطابعات المتصلة
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
                <button onClick={handlePrint} disabled={!selectedPrinter}>
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
