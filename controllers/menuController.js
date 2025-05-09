import asyncHandler from "../middleware/asyncHandler.js";
import connection from "../database/connection.js";

export const createMenu = asyncHandler(async (req, res) => {
    const { id, name, category, description, price, stock } = req.body

    const conn = await connection()
    const sql = `INSERT INTO menu (id, name, category, description, price, stock) VALUES (:id, :name, :category, :description, :price, :stock)`
    const newMenu = await conn.execute(
        sql,
        [id, name, category, description, price, stock],
        {
            autoCommit: true,
        }
    );
    await conn.close()

    return res.status(201).json({
        message: "Berhasil menambah menu",
        data: newMenu,
    })
})

export const allMenu = asyncHandler(async (req, res) => {
    const conn = await connection()
    let {
        name = "",
        category = "",
        limit = 10,
        sortBy = "id",
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

    const result = await conn.execute(sql, binds);
    await conn.close();

    return res.status(200).json({
        message: "Berhasil menampilkan menu",
        data: result.rows
    })
})

export const detailMenu = asyncHandler(async (req, res) => {
    const paramId = req.params.id;
    const data = await Menu.findById(paramId);

    if (!data) {
        res.status(404);
        throw new Error("ID tidak ditemukan");
    }

    return res.status(200).json({
        message: "Berhasil menampilkan detail pola belajar",
        data,
    });
});

export const updateMenu = asyncHandler(async (req, res) => {
    const paramId = req.params.id;
    const data = await Menu.findByIdAndUpdate(paramId, req.body, {
        runValidators: false,
        new: true,
    });

    return res.status(200).json({
        message: "Berhasil memperbarui pola belajar",
        data,
    });
});

export const deleteMenu = asyncHandler(async (req, res) => {
    const paramId = req.params.id;
    await Menu.findByIdAndDelete(paramId);

    return res.status(200).json({
        message: "Berhasil menghapus pola belajar",
    });
});
