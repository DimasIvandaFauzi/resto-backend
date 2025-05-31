import asyncHandler from "../middleware/asyncHandler.js";
import { connection, OUT_FORMAT_OBJECT } from "../database/connection.js";

export const topMenu = asyncHandler(async (req, res) => {
    const { start_date, end_date, limit = 5 } = req.query;

    // Validasi parameter
    if (!start_date || !end_date) {
        throw new Error("start_date dan end_date diperlukan");
    }
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate) || isNaN(endDate)) {
        throw new Error("Format tanggal tidak valid, gunakan YYYY-MM-DD");
    }
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum <= 0) {
        throw new Error("Limit harus angka positif");
    }

    const conn = await connection();
    try {
        const sql = `
            SELECT 
                m.ID_MENU,
                m.NAME,
                m.CATEGORY,
                SUM(dt.QUANTITY) AS TOTAL_QUANTITY,
                SUM(dt.SUBTOTAL) AS TOTAL_REVENUE
            FROM RESTO.DETAIL_TRANSACTION dt
            JOIN RESTO.TRANSACTION t ON dt.ID_TRANSACTION = t.ID_TRANSACTION
            JOIN RESTO.MENU m ON dt.ID_MENU = m.ID_MENU
            WHERE t.IS_VALID = 1
                AND t.STATUS = 'SELESAI'
                AND t.DATETIME BETWEEN TO_TIMESTAMP(:start_date, 'YYYY-MM-DD')
                    AND TO_TIMESTAMP(:end_date, 'YYYY-MM-DD') + INTERVAL '1' DAY - INTERVAL '1' SECOND
            GROUP BY m.ID_MENU, m.NAME, m.CATEGORY
            ORDER BY TOTAL_QUANTITY DESC
            FETCH FIRST :limit ROWS ONLY
        `;
        const result = await conn.execute(
            sql,
            { start_date, end_date, limit: limitNum },
            { outFormat: OUT_FORMAT_OBJECT }
        );

        return res.status(200).json({
            message: "Berhasil menampilkan laporan menu terlaris",
            data: result.rows
        });
    } catch (error) {
        console.error('Error in topMenu:', error.message, error.stack);
        throw error;
    } finally {
        await conn.close();
    }
});

export const dailyRevenue = asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;

    // Validasi parameter
    if (!start_date || !end_date) {
        throw new Error("start_date dan end_date diperlukan");
    }
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate) || isNaN(endDate)) {
        throw new Error("Format tanggal tidak valid, gunakan YYYY-MM-DD");
    }

    const conn = await connection();
    try {
        const sql = `SELECT TO_CHAR(t.DATETIME, 'YYYY-MM-DD') AS REPORT_DATE, SUM(t.SUBTOTAL) AS REVENUE
                    FROM RESTO.TRANSACTION t
                    WHERE t.IS_VALID = 1 AND t.STATUS = 'SELESAI'
                    AND t.DATETIME BETWEEN TO_TIMESTAMP(:start_date, 'YYYY-MM-DD')
                        AND TO_TIMESTAMP(:end_date, 'YYYY-MM-DD') + INTERVAL '1' DAY - INTERVAL '1' SECOND
                    GROUP BY TO_CHAR(t.DATETIME, 'YYYY-MM-DD')
                    ORDER BY REPORT_DATE`;
        console.log('Executing dailyRevenue query:', sql, { start_date, end_date });
        const result = await conn.execute(
            sql,
            { start_date, end_date },
            { outFormat: OUT_FORMAT_OBJECT }
        );

        return res.status(200).json({
            message: "Berhasil menampilkan laporan pendapatan harian",
            data: result.rows
        });
    } catch (error) {
        console.error('Error in dailyRevenue:', error.message, error.stack);
        throw error;
    } finally {
        await conn.close();
    }
});