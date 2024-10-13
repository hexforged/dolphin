/**
 * $KYAULabs: logger.mjs,v 1.0.1 2024/10/12 22:41:15 -0700 kyau Exp $
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

/**
 * RFC5424: logging severity levels
 *
 * 0	error
 * 1	warn
 * 2	info
 * 3	http
 * 4	verbose
 * 5	debug
 * 6	silly
 *
 */

const {
	format,
	createLogger,
	transports,
	config: {
		npm: { levels },
	},
} = winston;

/**
 * Combines the message with additional arguments (splat) if any, and uppercases the log level.
 * 
 * @function combineMessageAndSplat
 * @param {Object} info - The log information object containing message, level, and splat arguments.
 * @param {Object} opts - Optional formatting options (not used in this implementation).
 * @returns {Object} The modified log info with the combined message and uppercase level.
 */
const combineMessageAndSplat = format((info, opts) => {
	// combine message and args if any
	info.message = util.format(
		info.message,
		...(info[Symbol.for('splat')] || [])
	);
	// uppercase levels
	info.level = info.level.replace(
		/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').toUpperCase();
	return info;
});

/**
 * Creates a console transport for logging to the console with various formatting options.
 * 
 * @constant
 * @type {winston.transports.ConsoleTransportInstance}
 */
const consoleTransport = new transports.Console({
	level: 'silly',
	handleExceptions: true,
	json: true,
	format: format.combine(format.colorize(), format.combine(
		format.errors({ stack: true }),
		combineMessageAndSplat(),
		format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		format.label({ label: '[dolphin]' }),
		format.printf(
			({ level, message, timestamp, stack }) =>
				`[${timestamp}] [${level}] ${message} ${stack || ''}`
		),
		format.colorize({ all: true }),
	)),
});

/**
 * Creates a file transport using DailyRotateFile for logging to rotating log files.
 * 
 * @constant
 * @type {winston.transports.DailyRotateFileTransportInstance}
 */
const fileTransport = new transports.DailyRotateFile({
	level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
	colorize: false,
	createSymlink: true,
	dirname: 'logs',
	auditFile: './logs/.audit.json',
	filename: 'dolphin-%DATE%.log',
	datePattern: 'YYYY-MM-DD',
	maxSize: '20m',
	maxFiles: '14d',
	symlinkName: 'dolphin.log',
	utc: true,
	zippedArchive: true,
});

/**
 * Creates an error-specific file transport using DailyRotateFile for logging error messages to rotating files.
 * 
 * @constant
 * @type {winston.transports.DailyRotateFileTransportInstance}
 */
const errorTransport = new transports.DailyRotateFile({
	level: 'error',
	colorize: false,
	createSymlink: true,
	dirname: 'logs',
	auditFile: './logs/.audit-error.json',
	filename: 'dolphin-error-%DATE%.log',
	handleExceptions: true,
	datePattern: 'YYYY-MM-DD',
	maxSize: '20m',
	maxFiles: '14d',
	symlinkName: 'dolphin-error.log',
	utc: true,
	zippedArchive: true,
});

/**
 * Logger configuration using winston with file, console, and error transports.
 * 
 * @constant
 * @type {winston.Logger}
 */
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
export default logger;