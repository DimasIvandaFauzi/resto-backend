import asyncHandler from "../middleware/asyncHandler.js"
import { connection, OUT_FORMAT_OBJECT } from "../database/connection.js"
import moment from "moment"

export const createPesan = asyncHandler(async (req, res) => {
    const { id, total_harga } = req.body

    const conn = await connection()
    const sql = `INSERT INTO pesan (id_pesan, total_harga, status, tanggal)
                VALUES (:id_pesan, :total_harga, 'PENDING', SYSDATE)`

    const newPesan = await conn.execute(
        sql,
        [id, total_harga],
        {
            autoCommit: true,
        }
    )

    const getData = `SELECT id_pesan, total_harga, status, tanggal 
                        FROM pesan 
                        WHERE id_pesan = :id_pesan`
        
    const data = await conn.execute(
        getData,
        [id],
        {
            outFormat: OUT_FORMAT_OBJECT
        }
    )

    await conn.close()

    return res.status(201).json({
        message: "Berhasil membuat pesanan",
        data: data.rows[0],
    })
})

export const allPesan = asyncHandler(async (req, res) => {
    const conn = await connection()
    
    let {
        total_harga = 0,
        status = "",
        tanggal,
        page = 1,
        limit = 7,
        sortBy = "id_pesan",
        sortOrder = "ASC"
    } = req.query
    
    // Validasi parameter sorting
    const allowedSortFields = ["id_pesan", "total_harga", "status", "tanggal"]
    const allowedSortOrders = ["ASC", "DESC"]
    
    if (!allowedSortFields.includes(sortBy)) sortBy = "id_pesan"
    if (!allowedSortOrders.includes(sortOrder.toUpperCase())) sortOrder = "ASC"
    
    const pageInt = parseInt(page)
    const limitInt = parseInt(limit)
    const offset = (pageInt - 1) * limitInt
    const totalHargaInt = parseInt(total_harga || 0)
    
    let whereConditions = []
    let countBindParams = {}
    let dataBindParams = {
        offset: offset,
        limit: limitInt
    }
    
    if (totalHargaInt > 0) {
        whereConditions.push("total_harga >= :total_harga")
        countBindParams.total_harga = totalHargaInt
        dataBindParams.total_harga = totalHargaInt
    }
    
    if (status && status.trim() !== "") {
        whereConditions.push("LOWER(status) LIKE LOWER(:status)")
        countBindParams.status = `%${status}%`
        dataBindParams.status = `%${status}%`
    }
    
    if (tanggal) {
        try {
            const parsedTanggal = moment(tanggal).format('YYYY-MM-DD')
            whereConditions.push("tanggal <= TO_DATE(:tanggal, 'YYYY-MM-DD')")
            countBindParams.tanggal = parsedTanggal
            dataBindParams.tanggal = parsedTanggal
        } catch (err) {
            console.log("Error parsing date:", err)
        }
    }
    
    const whereClause = whereConditions.length > 0 
        ? "WHERE " + whereConditions.join(" AND ") 
        : ""
    
    const countSql = `SELECT COUNT(*) AS total FROM pesan ${whereClause}`
    
    const dataSql = `
        SELECT * FROM pesan
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
            message: "Berhasil menampilkan pesanan",
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

export const detailPesan = asyncHandler(async (req, res) => {
    const id = req.params.id

    const conn = await connection()
    const sql = `SELECT * FROM pesan WHERE id_pesan = :id_pesan`
    const data = await conn.execute(
        sql,
        [id],
        {
            outFormat: OUT_FORMAT_OBJECT
        }
    )

    await conn.close()

    return res.status(201).json({
        message: "Berhasil menampilkan detail pesan",
        data: data.rows[0],
    })
})

export const updatePesan = asyncHandler(async (req, res) => {
    const { total_harga, status } = req.body
    const id = req.params.id

    const conn = await connection()
    const sql = `UPDATE pesan SET total_harga = :total_harga, status = :status, tanggal = SYSDATE  WHERE id_pesan = :id_pesan`
    const updatePesan = await conn.execute(
        sql,
        [total_harga, status, id],
        {
            autoCommit: true,
            outFormat: OUT_FORMAT_OBJECT
        }
    )

    const getData = `SELECT id_pesan, total_harga, status, tanggal 
                        FROM pesan 
                        WHERE id_pesan = :id_pesan`
        
    const data = await conn.execute(
        getData,
        [id],
        {
            outFormat: OUT_FORMAT_OBJECT
        }
    )

    await conn.close()

    return res.status(201).json({
        message: "Berhasil mengubah pesan",
        data: data.rows[0],
    })
})

export const deletePesan = asyncHandler(async (req, res) => {
    const id = req.params.id

    const conn = await connection()
    const sql = `DELETE FROM Pesan WHERE id_Pesan = :id_Pesan`
    const deletePesan = await conn.execute(
        sql,
        [id],
        {
            autoCommit: true,
        }
    )

    await conn.close()

    return res.status(201).json({
        message: "Berhasil menghapus pesanan",
    })
})