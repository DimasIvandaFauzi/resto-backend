import asyncHandler from "../middleware/asyncHandler.js";
import { connection, OUT_FORMAT_OBJECT } from "../database/connection.js";
import oracledb from "oracledb";

export const createTransaction = asyncHandler(async (req, res) => {
    const { items, money, payment_method, cashier, customer_name } = req.body; // Tambah customer_name

    // Validasi input
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error("Items harus berupa array dan tidak boleh kosong");
    }
    if (!money || money < 0 || isNaN(Number(money))) {
        throw new Error("Money harus berupa angka positif");
    }
    if (!payment_method || !["CASH", "CARD", "QRIS"].includes(payment_method)) {
        throw new Error("Payment method harus CASH, CARD, atau QRIS");
    }
    if (customer_name && (typeof customer_name !== "string" || customer_name.length > 100)) {
        throw new Error("Nama pelanggan harus berupa string maksimal 100 karakter");
    }

    const conn = await connection();
    try {
        // Hitung subtotal dan validasi
        let subtotal = 0;
        for (const item of items) {
            const { id_menu, quantity } = item;
            if (!id_menu || !quantity || isNaN(Number(quantity)) || quantity <= 0) {
                throw new Error("Item tidak valid");
            }

            const menuId = Number(id_menu);
            const quantityNum = parseInt(quantity, 10);
            if (isNaN(menuId)) {
                throw new Error(`ID menu ${id_menu} tidak valid`);
            }

            const menuResult = await conn.execute(
                `SELECT PRICE, STOCK FROM RESTO.MENU WHERE ID_MENU = :id_menu`,
                { id_menu: menuId },
                { outFormat: OUT_FORMAT_OBJECT }
            );
            if (menuResult.rows.length === 0) {
                throw new Error(`Menu dengan ID ${menuId} tidak ditemukan`);
            }
            const { PRICE, STOCK } = menuResult.rows[0];
            if (STOCK < quantityNum) {
                throw new Error(`Stok menu ${menuId} tidak cukup`);
            }
            subtotal += PRICE * quantityNum;
        }

        if (money < subtotal) {
            throw new Error("Uang tidak cukup");
        }
        const refund = Number(money) - subtotal;

        console.log('Creating transaction with:', { subtotal, money, refund, cashier, customer_name });

        // Insert transaksi
        const transactionSql = `
            INSERT INTO RESTO.TRANSACTION (ID_TRANSACTION, SUBTOTAL, MONEY, REFUND, STATUS, DATETIME, IS_VALID, CASHIER, CUSTOMER_NAME)
            VALUES (RESTO.SEQ_TRANSACTION.NEXTVAL, :subtotal, :money, :refund, :status, SYSTIMESTAMP, :is_valid, :cashier, :customer_name)
            RETURNING ID_TRANSACTION INTO :id_transaction
        `;
        const transactionResult = await conn.execute(
            transactionSql,
            { 
                subtotal: Number(subtotal), 
                money: Number(money), 
                refund: Number(refund), 
                status: 'SELESAI',
                is_valid: 1,
                cashier: cashier || 'Admin',
                customer_name: customer_name || null, // Gunakan null jika tidak ada nama
                id_transaction: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            },
            { autoCommit: false }
        );
        const id_transaction = transactionResult.outBinds.id_transaction;

        console.log('Inserted transaction ID:', id_transaction);

        // Insert detail transaksi
        for (const item of items) {
            const { id_menu, quantity } = item;
            const menuId = Number(id_menu);
            const quantityNum = parseInt(quantity, 10);
            const menuResult = await conn.execute(
                `SELECT PRICE FROM RESTO.MENU WHERE ID_MENU = :id_menu`,
                { id_menu: menuId },
                { outFormat: OUT_FORMAT_OBJECT }
            );
            const price = menuResult.rows[0].PRICE;
            const itemSubtotal = price * quantityNum;

            await conn.execute(
                `INSERT INTO RESTO.DETAIL_TRANSACTION (ID_DETAIL_TRANSACTION, ID_TRANSACTION, ID_MENU, QUANTITY, PRICE, SUBTOTAL)
                 VALUES (RESTO.SEQ_DETAIL_TRANSACTION.NEXTVAL, :id_transaction, :id_menu, :quantity, :price, :subtotal)`,
                { 
                    id_transaction: Number(id_transaction), 
                    id_menu: menuId, 
                    quantity: quantityNum, 
                    price: Number(price), 
                    subtotal: Number(itemSubtotal) 
                },
                { autoCommit: false }
            );
        }

        // Insert pembayaran
        await conn.execute(
            `INSERT INTO RESTO.PAYMENT (ID_PAYMENT, ID_TRANSACTION, PAYMENT_METHOD, AMOUNT, PAYMENT_DATE)
             VALUES (RESTO.SEQ_PAYMENT.NEXTVAL, :id_transaction, :payment_method, :amount, SYSTIMESTAMP)`,
            { 
                id_transaction: Number(id_transaction), 
                payment_method, 
                amount: Number(money) 
            },
            { autoCommit: false }
        );

        await conn.commit();

        // Ambil data transaksi
        const getData = `SELECT ID_TRANSACTION, SUBTOTAL, MONEY, REFUND, STATUS, DATETIME, IS_VALID, CASHIER, CUSTOMER_NAME 
                         FROM RESTO.TRANSACTION 
                         WHERE ID_TRANSACTION = :id_transaction`;
        const data = await conn.execute(
            getData,
            { id_transaction: Number(id_transaction) },
            { outFormat: OUT_FORMAT_OBJECT }
        );

        if (data.rows.length === 0) {
            throw new Error("Gagal mengambil data transaksi");
        }

        return res.status(201).json({
            message: "Berhasil membuat transaksi",
            data: data.rows[0]
        });
    } catch (error) {
        console.error('Error in createTransaction:', error.message, error.stack);
        await conn.rollback();
        throw error;
    } finally {
        await conn.close();
    }
});

export const allTransaction = asyncHandler(async (req, res) => {
    const conn = await connection();
    try {
        const sql = `SELECT ID_TRANSACTION, SUBTOTAL, MONEY, REFUND, STATUS, DATETIME, IS_VALID, CASHIER, CUSTOMER_NAME 
                     FROM RESTO.TRANSACTION 
                     WHERE IS_VALID = 1 
                     ORDER BY DATETIME DESC`;
        const result = await conn.execute(sql, {}, { outFormat: OUT_FORMAT_OBJECT });

        return res.status(200).json({
            message: "Berhasil menampilkan semua transaksi",
            data: result.rows
        });
    } catch (error) {
        console.error('Error in allTransaction:', error.message, error.stack);
        throw error;
    } finally {
        await conn.close();
    }
});

export const detailTransaction = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        throw new Error("ID transaksi tidak valid");
    }

    const conn = await connection();
    try {
        const transactionSql = `SELECT ID_TRANSACTION, SUBTOTAL, MONEY, REFUND, STATUS, DATETIME, IS_VALID, CASHIER, CUSTOMER_NAME 
                               FROM RESTO.TRANSACTION 
                               WHERE ID_TRANSACTION = :id_transaction AND IS_VALID = 1`;
        const transactionResult = await conn.execute(
            transactionSql,
            { id_transaction: id },
            { outFormat: OUT_FORMAT_OBJECT }
        );

        if (transactionResult.rows.length === 0) {
            throw new Error("Transaksi tidak ditemukan atau tidak valid");
        }

        const detailSql = `SELECT ID_DETAIL_TRANSACTION, ID_MENU, QUANTITY, PRICE, SUBTOTAL 
                           FROM RESTO.DETAIL_TRANSACTION 
                           WHERE ID_TRANSACTION = :id_transaction`;
        const detailResult = await conn.execute(
            detailSql,
            { id_transaction: id },
            { outFormat: OUT_FORMAT_OBJECT }
        );

        const paymentSql = `SELECT ID_PAYMENT, PAYMENT_METHOD, AMOUNT, PAYMENT_DATE 
                            FROM RESTO.PAYMENT 
                            WHERE ID_TRANSACTION = :id_transaction`;
        const paymentResult = await conn.execute(
            paymentSql,
            { id_transaction: id },
            { outFormat: OUT_FORMAT_OBJECT }
        );

        return res.status(200).json({
            message: "Berhasil menampilkan detail transaksi",
            data: {
                transaction: transactionResult.rows[0],
                items: detailResult.rows,
                payment: paymentResult.rows[0]
            }
        });
    } catch (error) {
        console.error('Error in detailTransaction:', error.message, error.stack);
        throw error;
    } finally {
        await conn.close();
    }
});