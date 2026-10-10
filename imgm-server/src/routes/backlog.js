import { Router } from 'express';
import { getBacklog, getBacklogIds, addToBacklog, removeFromBacklog } from '../controllers/backlogController.js';

const router = Router();

router.get('/', getBacklog); // your Backlog with game details
router.get('/ids', getBacklogIds); // just the game ids
router.put('/:gameId', addToBacklog); // add a game
router.delete('/:gameId', removeFromBacklog); // remove one

export default router;
