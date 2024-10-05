/**
 * $KYAULabs: dolphin.js,v 0.1.0 2024/10/04 04:20:36 kyau Exp $
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
import { logger } from "./logger.js";
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

console.log(
  `\x1b[0;36m \ue68e \x1b[0;35mHexforged\x1b[0m \x1b[37mServer\x1b[0m \x1b[2m(${process.env.NODE_ENV})\x1b[0m`
);
console.log(
  ` - Public\x1b[4;37m:\x1b[0m \x1b[36mhttps://hexforged.com\x1b[0m`
);
console.log(
  ` - Internal\x1b[4;37m:\x1b[0m \x1b[36mhttp://localhost:${PORT}\x1b[0m`
);
logger.info(`Server running at http://127.0.0.1:${PORT}`);

let socket_list = {};
// Handle connections
io.on('connection', (socket) => {
  socket.on('*', (packet) => {
    const [eventName, eventData] = packet.data;
    logger.info({ eventName, eventData, socketId: socket.id, });
  });

  socket_list[socket.id] = socket;

  let _io_emit = io.emit;
  let _socket_emit = socket.emit;

  io.emit = function () {
    _io_emit.apply(io, arguments);
    let { 0: eventName, 1: eventData } = arguments;
    logger.info({ eventName: `[Global Emit] ${eventName}`, eventData, });
  };
    
  socket.emit = function () {
    _socket_emit.apply(socket, arguments);
    let { 0: eventName, 1: eventData } = arguments;
    logger.info({ eventName: `[Emit] ${eventName}`, eventData, socketId: socket.id, });
  };

  socket.on('disconnect', (socket) => {
    delete socket_list[socket.id];
    logger.info('Socket disconnected!');
  });

  socket.on('ping', (cb) => {
    if (typeof cb === 'function')
      cb();
  });

  socket.on('pong', (pong) => {
    //logger.info({ pong, socketId: socket.id, });
  })

  socket.emit('hello', { hello: 'world' });

  /*socket.on('custom_event', (data) => {
    logger.info(`\x1b[31mError: ${err.message}\x1b[0m`);
  });*/
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  logger.error(`Error: ${err.message}`);
  // close server and exit
  io.close(() => process.exit(1));
});

/**
 * vim: ft=javascript sts=2 sw=2 ts=2 noet:
 */
