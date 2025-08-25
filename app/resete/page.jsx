'use client';
import { useEffect, useState } from "react";
import styles from "./styles.module.css";
import Image from "next/image";
import resetImage from "../../public/images/logo.png";
import { useRouter } from "next/navigation";

function Resete() {
    const router = useRouter();
    const [invoice, setInvoice] = useState(null);

    // تحميل الفاتورة من localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const lastInvoice = localStorage.getItem("lastInvoice");
            if (lastInvoice) setInvoice(JSON.parse(lastInvoice));

            // تضمين مكتبة QZ Tray
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/qz-tray/2.1.0/qz-tray.js";
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    // دالة الطباعة المحسنة
    const handlePrint = async () => {
        if (!invoice || typeof window === "undefined") return;

        try {
            await qz.websocket.connect();
            const printer = await qz.printers.find("USB001 Xprinter");
            const config = qz.configs.create(printer);

            // نص الفاتورة مع تنسيق أفضل للطابعة Thermal
            const data = [
                '\x1B\x61\x01', // Center align
                '********** Mahmoud Elsony **********\n',
                '\x1B\x61\x00', // Left align
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
                '\x1B\x61\x01', // Center align
                'شكراً لتعاملكم معنا!\n',
                '\n\n\n'
            ];

            await qz.print(config, data);
            localStorage.removeItem("lastInvoice");
        } catch (err) {
            console.error("خطأ في الطباعة:", err);
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
                <button onClick={handlePrint}>طباعة الفاتورة</button>
            </div>

            <div className={styles.footer}>
                <strong>directed by : Devori</strong>
            </div>
        </div>
    );
}

export default Resete;
