import { Router } from 'express';
import { getBacklog, getBacklogIds, addToBacklog, removeFromBacklog, reorderBacklog, setFinished } from '../controllers/backlogController.js';

const router = Router();

router.get('/', getBacklog); // your Backlog with game details
router.get('/ids', getBacklogIds); // just the game ids
router.put('/order', reorderBacklog); // the player's own order (before /:gameId)
router.put('/:gameId', addToBacklog); // add a game
router.put('/:gameId/finished', setFinished); // finished it (or not)
router.delete('/:gameId', removeFromBacklog); // remove one

export default router;
