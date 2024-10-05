/**
 * $KYAULabs: logger.js,v 0.1.0 2024/10/04 17:29:26 kyau Exp $
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

import * as util from 'util';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const {
	format,
	createLogger,
	transports,
	config: {
		npm: { levels },
	},
} = winston;

const combineMessageAndSplat = format((info, opts) => {
	// combine message and args if any
	info.message = util.format(
		info.message,
		...(info[Symbol.for('splat')] || [])
	);
	return info;
});

const consoleTransport = new transports.Console({
	level: 'silly',
	handleExceptions: true,
	json: true,
	format: format.combine(
		format.errors({ stack: true }),
		combineMessageAndSplat(),
		format.timestamp({ format: 'HH:mm:ss.SSS' }),
		format.colorize(),
		format.printf(
			({ level, message, timestamp, stack }) =>
				`${timestamp} ${level}: ${message} ${stack || ""}`
		)
	),
});

const fileTransport = new transports.DailyRotateFile({
	level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
	filename: './logs/dolphin-%DATE%.log',
	colorize: false,
	json: true,
	datePattern: 'YYYY-MM-DD-HH',
	zippedArchive: true,
	maxSize: '20m',
	maxFiles: '1d'
});

const errorTransport = new transports.DailyRotateFile({
	level: 'error',
	filename: './logs/dolphin-error-%DATE%.log',
	colorize: false,
	handleExceptions: true,
	json: true,
	datePattern: 'YYYY-MM-DD-HH',
	zippedArchive: true,
	maxSize: '20m',
	maxFiles: '1d'
});

const logger = createLogger({
	levels: levels,
	defaultMeta: {
		environment: process.env.NODE_ENV || 'local',
	},
	transports: [fileTransport, errorTransport, consoleTransport],
	format: format.combine(
		format.errors({ stack: true }),
		format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
		format.json({ space: 2, replacer: null }),
		format.prettyPrint()
	),
});

export { logger };

/**
 * vim: ft=javascript sts=2 sw=2 ts=2 noet:
 */
