import express from 'express'
import { createPesan, allPesan, detailPesan, updatePesan, deletePesan } from '../controllers/pesanController.js'

const router = express.Router()

// post /api/v1/pesan/
router.post('/', createPesan)

// get /api/v1/pesan/
router.get('/', allPesan)

// get /api/v1/pesan/
router.get('/:id', detailPesan)

// put /api/v1/pesan/
router.put('/:id', updatePesan)

// delete /api/v1/pesan/
router.delete('/:id', deletePesan)


export default router