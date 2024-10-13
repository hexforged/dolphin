/**
 * $KYAULabs: dolphin.js,v 1.0.2 2024/10/12 22:25:02 -0700 kyau Exp $
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
import { logger } from './logger.mjs';
import { MySQLHandler } from './sql.mjs';
import { Server } from 'socket.io';

const PORT = process.env.port || 4242;
const io = new Server(PORT, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? 'https://hexforged.com' : '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/dolphin/',
  pingInterval: 2000,
  pingTimeout: 5000,
  transports: [ 'websocket', 'polling' ]
});

console.log(`\x1b[0;36m\udb86\udcb4  \x1b[0;35mdolphin\x1b[0m \x1b[2;37m(${process.env.NODE_ENV})\x1b[0m`);
console.log(`\x1b[3C\x1b[38;5;214mhttps://hexforged.com/dolphin\x1b[0m`);
logger.info('Server started.');

const sql = new MySQLHandler();
try {
  await sql.connect();
} catch (error) {
  logger.error(error);
}

let socketList = {};
// Handle connections
io.on('connection', async (socket) => {
  socket.on('*', (packet) => {
    const [eventName, eventData] = packet.data;
    logger.info({ eventName, eventData, socketId: socket.id, });
  });

  socketList[socket.id] = socket;

  let _io_emit = io.emit;
  let _socket_emit = socket.emit;

  io.emit = function () {
    _io_emit.apply(io, arguments);
    let { 0: eventName, 1: eventData } = arguments;
    logger.debug(`[Global Emit] name:${eventName}`, eventData);
  };
    
  socket.emit = function () {
    _socket_emit.apply(socket, arguments);
    let { 0: eventName, 1: eventData } = arguments;
    logger.debug(`[Emit] name:${eventName} data:`, eventData, `socketId: ${socket.id}`);
  };

  // get user token from cookie
  let ip = socket.handshake.headers['x-real-ip'];
  const cookies = socket.handshake.headers['cookie'].split('; ');
  const hexToken = cookies.find(cookie => cookie.startsWith('hex_token='));

  // user verification via token
  const userInfo = await sql.getOne('SELECT id, username, BIN_TO_UUID(token) AS token, permissions, INET_NTOA(`lastip`) AS lastip FROM users WHERE token = UUID_TO_BIN(?)', hexToken.split('=')[1]);
  if (userInfo !== null) {
    if (userInfo.lastip === ip) {
      logger.http(`${userInfo.username}@${ip} connected. token: ${userInfo.token}`);
    } else {
      logger.warn(`${userInfo.lastip} !== ${ip}`);
      socket.emit('error', 'ip address mismatch');
      socket.disconnect(true);
    }
    logger.verbose(`Database: username=${userInfo.username}, permissions=${userInfo.permissions}`);
  } else {
    logger.error(`${hexToken} not found!`);
    socket.emit('error', 'authentication failed');
    socket.disconnect(true);
  }

  // general events
  socket.on('disconnect', (socket) => {
    delete socketList[socket.id];
    logger.info('User disconnected!');
  });
  socket.on('ping', (cb) => {
    if (typeof cb === 'function')
      cb();
  });
  socket.on('pong', (pong) => {
    //logger.info({ pong, socketId: socket.id, });
  })

  /**
   * User has authenticated
   */
  if (userInfo !== null) {
    socket.emit('hello', { hello: userInfo.username });
  }

  /*socket.on('custom_event', (data) => {
    logger.info(`\x1b[31mError: ${err.message}\x1b[0m`);
  });*/
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Caught exception: ${error}\n` + `Exception origin: ${error.stack}`);
});

// graceful shutdown
process.on('SIGINT', () => {
  logger.error('SIGINT received, shutting down.');
  let conn = typeof Object.keys(socketList).length !== 'undefined' ? Object.keys(socketList).length : 0
  logger.info(`Closing out remaining connections (${conn})`);
  io.close(async () => {
    // additional cleanup tasks, e.g., close database connection
    await sql.disconnect();
    process.exit(0);
  });
});
process.on('SIGTERM', () => {
  logger.error('SIGTERM received, shutting down.');
  let conn = typeof Object.keys(socketList).length !== 'undefined' ? Object.keys(socketList).length : 0
  logger.info(`Closing out remaining connections (${conn})`);
  io.close(async () => {
    // additional cleanup tasks, e.g., close database connection
    await sql.disconnect();
    process.exit(0);
  });
});