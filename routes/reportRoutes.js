import express from 'express';
import { topMenu, dailyRevenue } from '../controllers/reportController.js';

const router = express.Router();

router.get('/top-menu', topMenu); // Get top-selling menu items
router.get('/daily-revenue', dailyRevenue); // Get daily revenue

export default router;