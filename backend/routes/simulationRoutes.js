const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  saveSimulation,
  updateSimulation,
  getMySimulations,
  getSimulationById,
  deleteSimulation
} = require('../controllers/simulationController');

router.post('/', authMiddleware, saveSimulation);
router.put('/:id', authMiddleware, updateSimulation);
router.get('/', authMiddleware, getMySimulations);
router.get('/:id', authMiddleware, getSimulationById);
router.delete('/:id', authMiddleware, deleteSimulation);

module.exports = router;
