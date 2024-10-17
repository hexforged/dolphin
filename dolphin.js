/**
 * $KYAULabs: dolphin.js,v 1.0.3 2024/10/17 14:28:45 -0700 kyau Exp $
 * ▄▄▄▄ ▄▄▄▄▄▄ ▄▄▄▄▄▄▄▄ ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * █ ▄▄ ▄ ▄▄▄▄ ▄▄ ▄ ▄▄▄▄ ▄▄▄▄ ▄▄▄▄ ▄▄▄▄▄ ▄▄▄▄ ▄▄▄  ▀
 * █ ██ █ ██ ▀ ██ █ ██ ▀ ██ █ ██ █ ██    ██ ▀ ██ █ █
 * ▪ ██▄█ ██▀  ▀█▄▀ ██▀  ██ █ ██▄▀ ██ ▄▄ ██▀  ██ █ ▪
 * █ ██ █ ██ █ ██ █ ██   ██ █ ██ █ ██ ▀█ ██ █ ██ █ █
 * ▄ ▀▀ ▀ ▀▀▀▀ ▀▀ ▀ ▀▀   ▀▀▀▀ ▀▀ ▀ ▀▀▀▀▀ ▀▀▀▀ ▀▀▀▀ █
 * ▀▀▀▀▀▀▀▀▀▀▀▀▀▀ ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀ ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
 *
 * Hexforged
 * Copyright (C) 2024 KYAU Labs (https://kyaulabs.com)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import 'dotenv/config';
import { logger } from './src/logger.mjs';
import { Queue } from './src/queue.mjs';
import { MySQLHandler } from './src/sql.mjs';
import { character } from './src/controller/character.mjs';
import { hexmap } from './src/controller/map.mjs';
import { Server } from 'socket.io';

console.log(` \x1b[0;34m\udb86\udcb4 \x1b[0;37mdolphin\x1b[0m \x1b[2;37m(${process.env.NODE_ENV})\x1b[0m`);
console.log(`\x1b[4C\x1b[38;5;214mhttps://hexforged.com/dolphin\x1b[0m`);
logger.info('Server started.');

/**
 * TCP port that the server runs on.
 * @constant {number}
 */
const PORT = process.env.port || 4242;
/**
 * Socket.io server object.
 * @constant {Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>}
 */
const io = new Server(PORT, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? 'https://hexforged.com' : '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/dolphin/',
  pingInterval: 2000,
  pingTimeout: 6000,
  transports: [ 'websocket', 'polling' ]
});
const queue = new Queue(500);
/**
 * SQL handler object (asynchronous).
 * @constant {MySQLHandler}
 */
const sql = new MySQLHandler(queue);

let _league;
try {
  _league = (await sql.getOne('SELECT name FROM leagues ORDER BY id DESC LIMIT 1')).name.toLowerCase();
  logger.info(`League: ${_league[0].toUpperCase() + _league.substring(1)}`);
} catch (error) {
  logger.warn('Failed to retrieve current league in play.');
  logger.error(error);
}
/**
 * Current Hexforged league in play.
 * @constant {string}
 */
const league = _league;
let sockets = {};
// Handle connections
io.on('connection', async (socket) => {
  // log all incoming socket events
  socket.onAny((event, ...args) => {
    if (event !== 'ping' && event !== 'pong') {
      logger.debug(`[Event] ${event}:`, args, `socket: ${socket.id}`);
    }
  });

  // the original socket emitters
  let _io_emit = io.emit;
  let _socket_emit = socket.emit;

  // log all outgoing server events
  io.emit = function () {
    _io_emit.apply(io, arguments);
    let { 0: eventName, 1: eventData } = arguments;
    logger.debug(`[Global Emit] ${eventName}:`, eventData);
  };
    
  // log all outgoing socket events
  socket.emit = function () {
    _socket_emit.apply(socket, arguments);
    let { 0: eventName, 1: eventData } = arguments;
    logger.debug(`[Emit] ${eventName}:`, eventData, `socket: ${socket.id}`);
  };

  // general events
  socket.on('disconnect', (reason) => {
    delete sockets[socket.id];
    logger.info(`User disconnected (${reason})!`);
  });

  // assign the league to the socket
  socket.league = league;

  // verify the user logging in and load character and/or reroute to
  // character creation
  character(socket, sockets, sql);

  // ping? pong.
  socket.on('ping', (cb) => {
    if (typeof cb === 'function')
      cb();
  });
  socket.on('pong', (pong) => {
    //logger.info({ pong, socketId: socket.id, });
  })

  // map events
  hexmap(socket, sql);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Caught exception: ${error}\n` + `Exception origin: ${error.stack}`);
});

// Handle graceful shutdowns
const signals = [
  'SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'
];
signals.forEach((signal) => {
  process.on(signal, async (code) => {
    if (signal.substring(0, signal.length - 1) === 'SIGUSR') {
      logger.warn(`${signal} received, restarting...`);
    } else {
      logger.error(`${signal} received, shutting down.`);
    }
    // additional cleanup tasks
    try {
      await sql.disconnect();
    } catch (error) {
      logger.error(error);
    }
    let conn = typeof Object.keys(sockets).length !== 'undefined' ? Object.keys(sockets).length : 0
    logger.info(`Closing out remaining connections (${conn})`);
    io.close(() => {
      process.exit(0);
    });
  });
});
