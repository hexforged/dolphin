import { logger } from '../logger.mjs';
import { readFile, unlink } from 'node:fs/promises';

const hexmap = async (socket, sql) => {
  socket.on('get-worldmap', async (callback) => {
    logger.debug(`[Ack] { worldmap } socket: ${socket.id}`);
    let mapData = await readFile('./maps/worldmap.json', 'utf8');
    callback(mapData);
  });
};

export { hexmap };