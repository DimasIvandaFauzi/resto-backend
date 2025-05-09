import express from 'express'
import { createMenu, allMenu } from '../controllers/menuController.js'

const router = express.Router()

// post /api/v1/menu/
router.post('/', createMenu)

// get /api/v1/menu/
router.get('/', allMenu)

// // get /api/v1/menu/
// router.get('/:id', protectedMiddleware, detailMenu)

// // put /api/v1/menu/
// router.put('/:id', protectedMiddleware, updateMenu)

// // delete /api/v1/menu/
// router.delete('/:id', protectedMiddleware, deleteMenu)


export default router