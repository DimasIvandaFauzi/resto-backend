import express from 'express'
import { createTransaction, allTransaction, detailTransaction, updateTransaction, deleteTransaction } from '../controllers/transactionController.js'

const router = express.Router()

// post /api/v1/transaction/
router.post('/', createTransaction)

// get /api/v1/transaction/
router.get('/', allTransaction)

// get /api/v1/transaction/
router.get('/:id', detailTransaction)

// put /api/v1/transaction/
router.put('/:id', updateTransaction)

// delete /api/v1/transaction/
router.delete('/:id', deleteTransaction)


export default router