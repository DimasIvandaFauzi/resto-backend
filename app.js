import express from 'express'
import { connection } from './database/connection.js'
import { errorHandler, pathNotFound } from './middleware/errorMiddleware.js'
import cookieParser from 'cookie-parser'
import menuRoutes from './routes/menuRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'
import cors from 'cors';
const app = express()
app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));
const port = 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Parent Routes
app.use('/api/v1/menu', menuRoutes)
app.use('/api/v1/transaction', transactionRoutes)

// Error Handler
app.use(pathNotFound)
app.use(errorHandler)

// Koneksi Database
await connection()

// Server
app.listen(port, () => {
  console.log(`Aplikasi berjalan di port: ${port}`)
})
