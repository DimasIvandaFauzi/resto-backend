import asyncHandler from "../middleware/asyncHandler.js"
import { connection, OUT_FORMAT_OBJECT } from "../database/connection.js"
import moment from "moment"

export const createTransaction = asyncHandler(async (req, res) => {
    const { id, subtotal, money } = req.body

    let refund = money - subtotal

    const conn = await connection()
    const sql = `INSERT INTO transaction (id_transaction, subtotal, money, refund, status, datetime)
                VALUES (:id_transaction, :subtotal, :money, ${refund}, 'PROSES', SYSDATE)`

    await conn.execute(
        sql,
        [id, subtotal, money],
        {
            autoCommit: true,
        }
    )

    const getData = `SELECT id_transaction, subtotal, money, refund, status, datetime 
                        FROM transaction 
                        WHERE id_transaction = :id_transaction`
        
    const data = await conn.execute(
        getData,
        [id],
        {
            outFormat: OUT_FORMAT_OBJECT
        }
    )

    await conn.close()

    return res.status(201).json({
        message: "Berhasil membuat transaksi",
        data: data.rows[0],
    })
})

export const allTransaction = asyncHandler(async (req, res) => {
    const conn = await connection()
    
    let {
        subtotal = 0,
        status = "",
        datetime,
        page = 1,
        limit = 7,
        sortBy = "id_transaction",
        sortOrder = "ASC"
    } = req.query
    
    // Validasi parameter sorting
    const allowedSortFields = ["id_transaction", "subtotal", "money", "refund", "status", "datetime"]
    const allowedSortOrders = ["ASC", "DESC"]
    
    if (!allowedSortFields.includes(sortBy)) sortBy = "id_transaction"
    if (!allowedSortOrders.includes(sortOrder.toUpperCase())) sortOrder = "ASC"
    
    const pageInt = parseInt(page)
    const limitInt = parseInt(limit)
    const offset = (pageInt - 1) * limitInt
    const totalHargaInt = parseInt(subtotal || 0)
    
    let whereConditions = []
    let countBindParams = {}
    let dataBindParams = {
        offset: offset,
        limit: limitInt
    }
    
    if (totalHargaInt > 0) {
        whereConditions.push("subtotal >= :subtotal")
        countBindParams.subtotal = totalHargaInt
        dataBindParams.subtotal = totalHargaInt
    }
    
    if (status && status.trim() !== "") {
        whereConditions.push("LOWER(status) LIKE LOWER(:status)")
        countBindParams.status = `%${status}%`
        dataBindParams.status = `%${status}%`
    }
    
    if (datetime) {
        try {
            const parseddatetime = moment(datetime).format('YYYY-MM-DD')
            whereConditions.push("datetime <= TO_DATE(:datetime, 'YYYY-MM-DD')")
            countBindParams.datetime = parseddatetime
            dataBindParams.datetime = parseddatetime
        } catch (err) {
            console.log("Error parsing date:", err)
        }
    }
    
    const whereClause = whereConditions.length > 0 
        ? "WHERE " + whereConditions.join(" AND ") 
        : ""
    
    const countSql = `SELECT COUNT(*) AS total FROM transaction ${whereClause}`
    
    const dataSql = `
        SELECT * FROM transaction
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `
        
        const countResult = await conn.execute(
            countSql,
            countBindParams,
            { outFormat: OUT_FORMAT_OBJECT }
        )
        
        const data = await conn.execute(
            dataSql,
            dataBindParams,
            { outFormat: OUT_FORMAT_OBJECT }
        )
        
        await conn.close()
        
        const totalRecords = countResult.rows[0].TOTAL
        const totalPages = Math.ceil(totalRecords / limitInt)
        
        return res.status(200).json({
            message: "Berhasil menampilkan transaksi",
            data: data.rows,
            pagination: {
                page: pageInt,
                limit: limitInt,
                totalRecords,
                totalPages,
                hasNextPage: pageInt < totalPages,
                hasPrevPage: pageInt > 1
            }
        })
})

export const detailTransaction = asyncHandler(async (req, res) => {
    const id = req.params.id

    const conn = await connection()
    const sql = `SELECT * FROM transaction WHERE id_transaction = :id_transaction`
    const data = await conn.execute(
        sql,
        [id],
        {
            outFormat: OUT_FORMAT_OBJECT
        }
    )

    if(data.rows.length === 0) {
        return res.status(404).json({
            message: "Transaksi tidak ditemukan",
        })
    }

    await conn.close()

    return res.status(200).json({
        message: "Berhasil menampilkan detail transaksi",
        data: data.rows[0],
    })
})

export const updateTransaction = asyncHandler(async (req, res) => {
    const { status } = req.body
    const id = req.params.id

    const conn = await connection()
    const sql = `UPDATE transaction SET status = :status, datetime = SYSDATE  WHERE id_transaction = :id_transaction`
    await conn.execute(
        sql,
        [status, id],
        {
            autoCommit: true,
            outFormat: OUT_FORMAT_OBJECT
        }
    )

    const getData = `SELECT id_transaction, subtotal, money, refund, status, datetime 
                        FROM transaction 
                        WHERE id_transaction = :id_transaction`
        
    const data = await conn.execute(
        getData,
        [id],
        {
            outFormat: OUT_FORMAT_OBJECT
        }
    )

    await conn.close()

    if(data.rows.length === 0) {
        return res.status(404).json({
            message: "Transaksi tidak ditemukan",
        })
    }

    return res.status(201).json({
        message: "Berhasil mengubah status transaksi",
        data: data.rows[0],
    })
})

export const deleteTransaction = asyncHandler(async (req, res) => {
    const id = req.params.id

    const conn = await connection()
    // Cek apakah transaksi dengan id tersebut ada
    const checkSql = `SELECT COUNT(*) AS count FROM transaction WHERE id_transaction = :id_transaction`
    const checkResult = await conn.execute(
        checkSql,
        [id],
        {
            outFormat: OUT_FORMAT_OBJECT
        }
    )
    if (checkResult.rows[0].COUNT === 0) {
        await conn.close()
        return res.status(404).json({
            message: "Transaksi tidak ditemukan",
        })
    }

    const sql = `DELETE FROM transaction WHERE id_transaction = :id_transaction`
    await conn.execute(
        sql,
        [id],
        {
            autoCommit: true,
        }
    )

    await conn.close()

    return res.status(200).json({
        message: "Berhasil menghapus transaksi",
    })
})