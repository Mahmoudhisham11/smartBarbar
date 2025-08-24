'use client';
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    addDoc,
} from "firebase/firestore";
import { db } from "@/app/firebase";
import { FaTrashAlt } from "react-icons/fa";

function Reports() {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [reports, setReports] = useState([]);           // ← المعروض بعد الفلترة
    const [rawReports, setRawReports] = useState([]);     // ← البيانات الخام من Firestore
    const [openCard, setOpenCard] = useState(null);
    const [totalAmount, setTotalAmount] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const shop = typeof window !== "undefined" ? localStorage.getItem("shop") : "";

    // أداة مساعدة: تحويل أي نوع تاريخ إلى milliseconds
    const getMs = (val) => {
        if (!val) return null;
        try {
            if (typeof val.toDate === "function") return val.toDate().getTime(); // Firestore Timestamp
            if (typeof val.seconds === "number") return val.seconds * 1000;      // Timestamp-like
            if (typeof val === "number") return val;
            const d = new Date(val);
            const t = d.getTime();
            return isNaN(t) ? null : t;
        } catch {
            return null;
        }
    };

    // اشتراك واحد في Firestore حسب الـ shop
    useEffect(() => {
        if (!shop) return;
        const q = query(collection(db, "reports"), where("shop", "==", shop));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setRawReports(all);
        });
        return () => unsubscribe();
    }, [shop]);

    // فلترة بالتاريخ والنوع + حساب الإجمالي
    useEffect(() => {
        // حساب حدود التاريخ
        let fromMs = null, toMs = null;
        if (fromDate) {
            const d = new Date(fromDate);
            d.setHours(0, 0, 0, 0);
            fromMs = d.getTime();
        }
        if (toDate) {
            const d = new Date(toDate);
            d.setHours(23, 59, 59, 999);
            toMs = d.getTime();
        }

        const inRange = (ms) => {
            if (ms == null) return false;
            if (fromMs != null && toMs != null) return ms >= fromMs && ms <= toMs;
            if (fromMs != null) return ms >= fromMs;
            if (toMs != null) return ms <= toMs;
            return true;
        };

        // فلترة بالتاريخ
        const byDate = rawReports.filter(r => inRange(getMs(r.date)));

        // فلترة بالنوع + عدم إظهار التقارير اللي كارتها فاضية
        const byType = byDate
            .map((report) => {
                if (filterType === "all") return report;
                const filteredCart = (report.cart || []).filter((item) => item.type === filterType);
                return { ...report, cart: filteredCart };
            })
            .filter(r => (r.cart && r.cart.length > 0));

        setReports(byType);

        // إجمالي المبلغ من item.total لو موجود، وإلا sellPrice*quantity
        const total = byType.reduce((acc, report) => {
            const sum = (report.cart || []).reduce((s, item) => {
                const qty = Number(item.quantity) || 0;
                const lineTotal = (item.total != null)
                    ? Number(item.total) || 0
                    : (Number(item.sellPrice) || 0) * qty;
                return s + lineTotal;
            }, 0);
            return acc + sum;
        }, 0);
        setTotalAmount(total);
    }, [rawReports, fromDate, toDate, filterType]);

    // حذف عنصر واحد من تقرير (حسب index مش code)
    const handleDeleteSingleProduct = async (reportId, itemIndex) => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            const reportRef = doc(db, 'reports', reportId);
            const reportSnap = await getDoc(reportRef);

            if (!reportSnap.exists()) {
                alert("هذا التقرير غير موجود");
                return;
            }

            const reportData = reportSnap.data();
            const cartItems = Array.isArray(reportData.cart) ? reportData.cart : [];
            const reportShop = reportData.shop;

            if (itemIndex < 0 || itemIndex >= cartItems.length) {
                alert("هذا المنتج غير موجود في التقرير");
                return;
            }

            const deletedItem = cartItems[itemIndex];
            const updatedCart = cartItems.filter((_, idx) => idx !== itemIndex);

            // استرجاع للمخزون فقط لو له نوع قابل للمخزون
            if (deletedItem && (deletedItem.type === "product" || deletedItem.type === "phone")) {
                // لو المنتج موجود: زد الكمية، وإلا أنشئه
                if (deletedItem.code != null) {
                    const qProd = query(
                        collection(db, "products"),
                        where("code", "==", deletedItem.code),
                        where("shop", "==", reportShop)
                    );
                    const snapshot = await getDocs(qProd);

                    if (!snapshot.empty) {
                        const productDoc = snapshot.docs[0];
                        const currentQty = Number(productDoc.data().quantity) || 0;
                        const backQty = Number(deletedItem.quantity) || 0;

                        await updateDoc(productDoc.ref, {
                            quantity: currentQty + backQty,
                        });
                    } else {
                        await addDoc(collection(db, "products"), {
                            name: deletedItem.name ?? "بدون اسم",
                            code: deletedItem.code ?? 0,
                            serial: deletedItem.serial ?? 0,
                            sellPrice: deletedItem.sellPrice ?? deletedItem.price ?? 0,
                            buyPrice: deletedItem.buyPrice ?? 0,
                            type: deletedItem.type ?? "product",
                            sim: deletedItem.sim || 0,
                            battery: deletedItem.battery || 0,
                            storage: deletedItem.storage || 0,
                            color: deletedItem.color || 0,
                            box: deletedItem.box || 0,
                            condition: deletedItem.condition || 0,
                            tax: deletedItem.tax || 0,
                            quantity: Number(deletedItem.quantity) || 1,
                            date: new Date(),
                            shop: deletedItem.shop ?? reportShop,
                        });
                    }
                }
            }

            if (updatedCart.length === 0) {
                await deleteDoc(reportRef);
                alert("تم حذف التقرير لأنه لم يتبق فيه منتجات");
            } else {
                await updateDoc(reportRef, { cart: updatedCart });
                alert("تم حذف المنتج من التقرير واسترجاعه إلى المخزون");
            }
        } catch (error) {
            console.error("خطأ أثناء الحذف:", error);
            alert("حدث خطأ أثناء حذف المنتج");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={styles.reports}>
            <SideBar />
            <div className={styles.content}>
                <div className={styles.filterBar}>
                    <div className="inputContainer">
                        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="inputContainer">
                        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </div>
                </div>
                <div className={styles.totalContainer}>
                    <h2>الاجمالي: {totalAmount} EGP</h2>
                </div>
                <div className={styles.tableContainer}>
                    <table>
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>السعر</th>
                                <th>الكمية</th>
                                <th>اسم العميل</th>
                                <th>رقم الهاتف</th>
                                <th>مرتجع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) =>
                                report.cart?.map((item, index) => (
                                    <tr key={`${report.id}-${index}`}>
                                        <td>{item.name}</td>
                                        <td>{item.sellPrice} EGP</td>
                                        <td>{item.quantity}</td>
                                        <td>{report.clientName}</td>
                                        <td>{report.phone}</td>
                                        <td>
                                            <button
                                                className={styles.delBtn}
                                                onClick={() => handleDeleteSingleProduct(report.id, index)}
                                                disabled={isDeleting}
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={7} style={{ textAlign: "right", fontWeight: "bold" }}>
                                    الاجمالي: {totalAmount} EGP
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Reports;
