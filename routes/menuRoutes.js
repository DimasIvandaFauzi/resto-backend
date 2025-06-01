import express from 'express';
import { createMenu, allMenu, detailMenu, updateMenu, deleteMenu } from '../controllers/menuController.js';

const router = express.Router();

router.post('/', createMenu); // Create a new menu
router.get('/', allMenu); // Get all menus with filters and pagination
router.get('/:id', detailMenu); // Get menu details by ID
router.put('/:id', updateMenu); // Update menu by ID
router.delete('/:id', deleteMenu); // Delete menu by ID

export default router;