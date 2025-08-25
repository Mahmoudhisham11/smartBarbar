'use client';
import { useEffect, useState } from "react";
import styles from "./styles.module.css";
import Image from "next/image";
import resetImage from "../../public/images/logo.png";
import { useRouter } from "next/navigation";

function Resete() {
    const router = useRouter()
    const [invoice, setInvoice] = useState(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const lastInvoice = localStorage.getItem("lastInvoice");
            if (lastInvoice) {
                setInvoice(JSON.parse(lastInvoice));
            }
        }
    }, []);

    const handlePrint = () => {
        window.print();
        if (typeof window !== "undefined") {
            localStorage.removeItem("lastInvoice");
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
                                <td>{item.total} جنية</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={4}>الاجمالي: {invoice.total} جنية</td>
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
