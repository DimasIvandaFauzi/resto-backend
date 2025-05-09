import express from 'express'
import { createMenu, allMenu, detailMenu, updateMenu, deleteMenu } from '../controllers/menuController.js'

const router = express.Router()

// post /api/v1/menu/
router.post('/', createMenu)

// get /api/v1/menu/
router.get('/', allMenu)

// get /api/v1/menu/
router.get('/:id', detailMenu)

// // put /api/v1/menu/
router.put('/:id', updateMenu)

// delete /api/v1/menu/
router.delete('/:id', deleteMenu)


export default router