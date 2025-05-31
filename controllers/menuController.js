import asyncHandler from "../middleware/asyncHandler.js";
import { connection, OUT_FORMAT_OBJECT } from "../database/connection.js";
import oracledb from "oracledb";

export const createMenu = asyncHandler(async (req, res) => {
    const { name, category, description, price, stock } = req.body;

    // Validasi input
    if (!name || !category || !price || stock === undefined) {
        throw new Error("Semua field wajib diisi kecuali description");
    }
    if (!["Makanan", "Minuman", "Dessert"].includes(category)) {
        throw new Error("Category harus Makanan, Minuman, atau Dessert");
    }
    if (price < 0 || stock < 0) {
        throw new Error("Price dan stock tidak boleh negatif");
    }
    if (name.length > 100 || (description && description.length > 100)) {
        throw new Error("Name atau description terlalu panjang");
    }

    const conn = await connection();
    try {
        const sql = `INSERT INTO RESTO.MENU (ID_MENU, NAME, CATEGORY, DESCRIPTION, PRICE, STOCK)
                     VALUES (RESTO.SEQ_MENU.NEXTVAL, :name, :category, :description, :price, :stock)
                     RETURNING ID_MENU INTO :id_menu`;
        const result = await conn.execute(
            sql,
            {
                name,
                category,
                description: description || null,
                price: Number(price),
                stock: Number(stock),
                id_menu: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            },
            { autoCommit: true }
        );

        console.log('Inserted ID_MENU:', result.outBinds.id_menu);

        const getData = `SELECT ID_MENU, NAME, CATEGORY, DESCRIPTION, PRICE, STOCK 
                         FROM RESTO.MENU 
                         WHERE ID_MENU = :id_menu`;
        const data = await conn.execute(
            getData,
            { id_menu: Number(result.outBinds.id_menu) },
            { outFormat: OUT_FORMAT_OBJECT }
        );

        if (data.rows.length === 0) {
            throw new Error("Gagal mengambil data menu yang baru dibuat");
        }

        return res.status(201).json({
            message: "Berhasil menambah menu",
            data: data.rows[0]
        });
    } catch (error) {
        console.error('Error in createMenu:', error.message);
        throw error;
    } finally {
        await conn.close();
    }
});

export const allMenu = asyncHandler(async (req, res) => {
    const conn = await connection();
    try {
        let {
            name = "",
            category = "",
            limit = 10,
            page = 1,
            sortBy = "ID_MENU",
            sortOrder = "ASC",
            price = 0,
            stock = 0
        } = req.query;

        // Validasi query parameter
        limit = Number(limit);
        page = Number(page);
        price = Number(price);
        stock = Number(stock);
        if (isNaN(limit) || limit < 1) limit = 10;
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(price) || price < 0) price = 0;
        if (isNaN(stock) || stock < 0) stock = 0;

        const allowedSortFields = ["ID_MENU", "NAME", "CATEGORY", "PRICE", "STOCK"];
        const allowedSortOrders = ["ASC", "DESC"];
        if (!allowedSortFields.includes(sortBy)) sortBy = "ID_MENU";
        if (!allowedSortOrders.includes(sortOrder.toUpperCase())) sortOrder = "ASC";

        const offset = (page - 1) * limit;
        const binds = {
            name: `%${name}%`,
            category: `%${category}%`,
            price,
            stock,
            offset,
            limit
        };

        const sql = `
            SELECT ID_MENU, NAME, CATEGORY, DESCRIPTION, PRICE, STOCK 
            FROM RESTO.MENU
            WHERE LOWER(NAME) LIKE LOWER(:name)
            AND LOWER(CATEGORY) LIKE LOWER(:category)
            AND PRICE >= :price
            AND STOCK >= :stock
            ORDER BY ${sortBy} ${sortOrder}
            OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `;

        const countSql = `
            SELECT COUNT(*) AS TOTAL
            FROM RESTO.MENU
            WHERE LOWER(NAME) LIKE LOWER(:name)
            AND LOWER(CATEGORY) LIKE LOWER(:category)
            AND PRICE >= :price
            AND STOCK >= :stock
        `;

        const countResult = await conn.execute(countSql, binds, { outFormat: OUT_FORMAT_OBJECT });
        const data = await conn.execute(sql, binds, { outFormat: OUT_FORMAT_OBJECT });

        const totalRecords = countResult.rows[0].TOTAL;
        const totalPages = Math.ceil(totalRecords / limit);

        return res.status(200).json({
            message: "Berhasil menampilkan seluruh menu",
            data: data.rows,
            pagination: {
                page,
                limit,
                totalRecords,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error in allMenu:', error.message);
        throw error;
    } finally {
        await conn.close();
    }
});

export const detailMenu = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        throw new Error("ID menu tidak valid");
    }

    const conn = await connection();
    try {
        const sql = `SELECT ID_MENU, NAME, CATEGORY, DESCRIPTION, PRICE, STOCK 
                     FROM RESTO.MENU 
                     WHERE ID_MENU = :id_menu`;
        const data = await conn.execute(
            sql,
            { id_menu: id },
            { outFormat: OUT_FORMAT_OBJECT }
        );

        if (data.rows.length === 0) {
            throw new Error("Menu tidak ditemukan");
        }

        return res.status(200).json({
            message: "Berhasil menampilkan detail menu",
            data: data.rows[0]
        });
    } catch (error) {
        console.error('Error in detailMenu:', error.message);
        throw error;
    } finally {
        await conn.close();
    }
});

export const updateMenu = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { name, category, description, price, stock } = req.body;

    if (isNaN(id)) {
        throw new Error("ID menu tidak valid");
    }
    if (!name || !category || !price || stock === undefined) {
        throw new Error("Semua field wajib diisi kecuali description");
    }
    if (!["Makanan", "Minuman", "Dessert"].includes(category)) {
        throw new Error("Category harus Makanan, Minuman, atau Dessert");
    }
    if (Number(price) < 0 || Number(stock) < 0) {
        throw new Error("Price dan stock tidak boleh negatif");
    }
    if (name.length > 100 || (description && description.length > 100)) {
        throw new Error("Name atau description terlalu panjang");
    }

    const conn = await connection();
    try {
        const sql = `UPDATE RESTO.MENU 
                     SET NAME = :name, CATEGORY = :category, DESCRIPTION = :description, 
                         PRICE = :price, STOCK = :stock 
                     WHERE ID_MENU = :id_menu`;
        const updateMenu = await conn.execute(
            sql,
            {
                name,
                category,
                description: description || null,
                price: Number(price),
                stock: Number(stock),
                id_menu: id
            },
            { autoCommit: true }
        );

        if (updateMenu.rowsAffected === 0) {
            throw new Error("Menu tidak ditemukan");
        }

        const getData = `SELECT ID_MENU, NAME, CATEGORY, DESCRIPTION, PRICE, STOCK 
                         FROM RESTO.MENU 
                         WHERE ID_MENU = :id_menu`;
        const data = await conn.execute(
            getData,
            { id_menu: id },
            { outFormat: OUT_FORMAT_OBJECT }
        );

        if (data.rows.length === 0) {
            throw new Error("Gagal mengambil data menu yang diperbarui");
        }

        return res.status(200).json({
            message: "Berhasil mengubah menu",
            data: data.rows[0]
        });
    } catch (error) {
        console.error('Error in updateMenu:', error.message);
        throw error;
    } finally {
        await conn.close();
    }
});

export const deleteMenu = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        throw new Error("ID menu tidak valid");
    }

    const conn = await connection();
    try {
        const sql = `DELETE FROM RESTO.MENU WHERE ID_MENU = :id_menu`;
        const deleteMenu = await conn.execute(
            sql,
            { id_menu: id },
            { autoCommit: true }
        );

        if (deleteMenu.rowsAffected === 0) {
            throw new Error("Menu tidak ditemukan");
        }

        return res.status(200).json({
            message: "Berhasil menghapus menu"
        });
    } catch (error) {
        console.error('Error in deleteMenu:', error.message);
        throw error;
    } finally {
        await conn.close();
    }
});