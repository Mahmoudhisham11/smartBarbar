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

    // تحميل الفاتورة والاتصال بـ QZ Tray مرة واحدة عند تحميل الصفحة
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

        // إعادة الاتصال كل 5 ثواني إذا لم يكن متصل
        const interval = setInterval(() => {
            if (!qzConnected) connectQZ();
        }, 5000);

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

    // دالة الطباعة
    const handlePrint = async () => {
        if (!invoice) {
            alert("لا توجد فاتورة للطباعة.");
            return;
        }
        if (!selectedPrinter) {
            alert("يرجى اختيار طابعة.");
            return;
        }
        try {
            if (!qz.websocket.isActive()) {
                await qz.websocket.connect();
                setQzConnected(true);
            }

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
                '\x1B\x61\x01',
                'شكراً لتعاملكم معنا!\n\n\n'
            ];

            await qz.print(config, data);
            localStorage.removeItem("lastInvoice");
            alert("تمت الطباعة بنجاح!");
        } catch (err) {
            console.error("خطأ أثناء الطباعة:", err);
            alert("فشل الطباعة. تحقق من تشغيل QZ Tray ومن الطابعة.");
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
