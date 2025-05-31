import express from 'express';
import { connection } from './database/connection.js';
import { errorHandler, pathNotFound } from './middleware/errorMiddleware.js';
import cookieParser from 'cookie-parser';
import menuRoutes from './routes/menuRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import cors from 'cors';

const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/transaction', transactionRoutes);
app.use('/api/v1/report', reportRoutes);

app.use(pathNotFound);
app.use(errorHandler);

try {
    await connection();
    app.listen(port, () => {
        console.log(`Aplikasi berjalan di port: ${port}`);
    });
} catch (err) {
    console.error('Gagal koneksi ke database:', err);
    process.exit(1);
}