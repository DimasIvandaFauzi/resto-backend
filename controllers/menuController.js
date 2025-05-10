import asyncHandler from "../middleware/asyncHandler.js"
import { connection, OUT_FORMAT_OBJECT } from "../database/connection.js"

export const createMenu = asyncHandler(async (req, res) => {
    const { id, name, category, description, price, stock } = req.body

    const conn = await connection()
    const sql = `INSERT INTO menu (id_menu, name, category, description, price, stock)
                VALUES (:id_menu, :name, :category, :description, :price, :stock)`

    const newMenu = await conn.execute(
        sql,
        [id, name, category, description, price, stock],
        {
            autoCommit: true,
        }
    )

    const getData = `SELECT id_menu, name, category, description, price, stock 
                        FROM menu 
                        WHERE id_menu = :id_menu`
        
    const data = await conn.execute(
        getData,
        [id],
        {
            outFormat: OUT_FORMAT_OBJECT
        }
    )

    await conn.close()

    return res.status(201).json({
        message: "Berhasil menambah menu",
        data: data.rows[0],
    })
})

export const allMenu = asyncHandler(async (req, res) => {
    const conn = await connection()
    let {
        name = "",
        category = "",
        limit = 10,
        sortBy = "id_menu",
        sortOrder = "ASC",
        price = 1,
        stock = 1,
    } = req.query

    const sql = `
    SELECT * FROM (
        SELECT * FROM menu
        WHERE LOWER(name) LIKE LOWER(:name)
        AND LOWER(category) LIKE LOWER(:category)
        AND LOWER(price) >= ${price}
        AND LOWER(stock) >= ${stock}
        ORDER BY ${sortBy} ${sortOrder}
    ) WHERE ROWNUM <= :limit
`

    const binds = {
        name: `%${name}%`,
        category: `%${category}%`,
        limit: parseInt(limit),
    };

    const data = await conn.execute(
        sql,
        binds,
        {
            outFormat: OUT_FORMAT_OBJECT
        }
    )
    await conn.close();

    return res.status(200).json({
        message: "Berhasil menampilkan seluruh menu",
        data: data.rows
    })
})

export const detailMenu = asyncHandler(async (req, res) => {
    const id = req.params.id

    const conn = await connection()
    const sql = `SELECT * FROM menu WHERE id_menu = :id_menu`
    const data = await conn.execute(
        sql,
        [id]
    )

    await conn.close()

    return res.status(201).json({
        message: "Berhasil menampilkan detail menu",
        data: data.rows[0],
    })
})

export const updateMenu = asyncHandler(async (req, res) => {
    const { name, category, description, price, stock } = req.body
    const id = req.params.id

    const conn = await connection()
    const sql = `UPDATE menu SET name = :name, category = :category, description = :description, price = :price, stock = :stock  WHERE id_menu = :id_menu`
    const updateMenu = await conn.execute(
        sql,
        [name, category, description, price, stock, id],
        {
            autoCommit: true,
            outFormat: OUT_FORMAT_OBJECT
        }
    )

    const getData = `SELECT id_menu, name, category, description, price, stock 
                        FROM menu 
                        WHERE id_menu = :id_menu`
        
    const data = await conn.execute(
        getData,
        [id],
        {
            outFormat: OUT_FORMAT_OBJECT
        }
    )

    await conn.close()

    return res.status(201).json({
        message: "Berhasil mengubah menu",
        data: data.rows[0],
    })
})

export const deleteMenu = asyncHandler(async (req, res) => {
    const id = req.params.id

    const conn = await connection()
    const sql = `DELETE FROM menu WHERE id_menu = :id_menu`
    const deleteMenu = await conn.execute(
        sql,
        [id],
        {
            autoCommit: true,
        }
    )

    await conn.close()

    return res.status(201).json({
        message: "Berhasil menghapus menu",
    })
})