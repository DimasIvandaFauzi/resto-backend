import express from 'express';
import { createTransaction, allTransaction, detailTransaction} from '../controllers/transactionController.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { connection, OUT_FORMAT_OBJECT } from '../database/connection.js';

const router = express.Router();

router.post('/', createTransaction); // Create a new transaction
router.get('/', allTransaction); // Get all transactions with filters and pagination
router.get('/:id', detailTransaction); // Get transaction details by ID
// Get items of a transaction
router.get('/:id/items', asyncHandler(async (req, res) => {
    const id = req.params.id;
    const conn = await connection();
    try {
        const sql = `
            SELECT dt.ID_DETAIL_TRANSACTION, dt.ID_TRANSACTION, dt.ID_MENU, m.NAME, m.CATEGORY, dt.QUANTITY, dt.PRICE, dt.SUBTOTAL
            FROM RESTO.DETAIL_TRANSACTION dt
            JOIN RESTO.MENU m ON dt.ID_MENU = m.ID_MENU
            WHERE dt.ID_TRANSACTION = :id_transaction
        `;
        const data = await conn.execute(sql, [id], { outFormat: OUT_FORMAT_OBJECT });

        if (data.rows.length === 0) {
            throw new Error('Item transaksi tidak ditemukan');
        }

        return res.status(200).json({
            message: "Berhasil menampilkan item transaksi",
            data: data.rows,
        });
    } finally {
        await conn.close();
    }
}));

export default router;