import oracledb from 'oracledb'

export const connection = async () => {
    try {
        const conn = await oracledb.getConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectionString: process.env.DB_CONNECTION_STRING
        })
        console.log('Database terhubung!')
        return conn
    } catch (error) {
        console.log('Database error: ', error)
    }
}

export const OUT_FORMAT_OBJECT = oracledb.OUT_FORMAT_OBJECT