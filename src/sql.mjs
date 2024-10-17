/**
 * $KYAULabs: sql.mjs,v 1.0.1 2024/10/17 14:29:42 -0700 kyau Exp $
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
import mysql from 'mysql';

/**
 * Class to handle MySQL database operations.
 */
class MySQLHandler {
  /**
   * Initializes the MySQLHandler instance with default properties.
   * Sets the hostname to 'localhost' and connection to null.
   */
  constructor(queue) {
    this.hostname = 'localhost';
    this.connection = null;
    this.queue = queue;
    try {
      this.connect();
    } catch (error) {
      logger.error(error);
    }
  }

  /**
   * Connects to the MySQL database using environment variables for credentials.
   * @returns {Promise<void>} A promise that resolves when the connection is successful or rejects with an error message.
   */
  connect() {
    return new Promise((resolve, reject) => {
      this.connection = mysql.createConnection({
        host: this.hostname,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWD,
        database: 'hexforged'
      });

      this.connection.connect((err) => {
        if (err) {
          return reject(`Error connecting to database: ${err.stack}`);
        }
        logger.verbose('Database connected.');
        resolve();
      });
    });
  }

  /**
   * Disconnects from the MySQL database.
   * @returns {Promise<void|string>} A promise that resolves when the disconnection is successful or with a message if there is no active connection.
   */
  disconnect() {
    return new Promise((resolve, reject) => {
      if (!this.connection) {
        return resolve('No active connection to close.');
      }
      this.connection.end((err) => {
        if (err) {
          return reject(`Error disconnecting from the database: ${err.stack}`);
        }
        logger.warn('Database disconnected!');
        this.connection = null;
        resolve();
      });
    });
  }

  /**
   * Executes a SQL query on the connected MySQL database.
   * @param {string} sql - The SQL query to execute.
   * @param {Array} [params=[]] - An optional array of parameters to pass to the SQL query.
   * @returns {Promise<Object[]>} A promise that resolves with the results of the query or rejects with an error message.
   */
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.connection) {
        return reject('Not connected to the database.');
      }

      this.connection.query(sql, params, (err, results) => {
        if (err) {
          return reject(`Error executing query: ${err.stack}`);
        }
        resolve(results);
      });
    });
  }

  /**
   * Fetches a single row from the result of a SQL query.
   * @param {string} sql - The SQL query to execute.
   * @param {Array} [params=[]] - An optional array of parameters to pass to the SQL query.
   * @returns {Promise<Object|null>} A promise that resolves with the first result row or null if no rows are found.
   * @throws {Error} Throws an error if the query fails.
   */
  async getOne(sql, params = []) {
    try {
      const results = await this.query(sql, params);
      if (results.length === 0) {
        return null;  // No result found
      }
      return results[0]; // Return first result (single row)
    } catch (err) {
      throw new Error(err);
    }
  }

  /**
   * Fetches multiple rows from the result of a SQL query.
   * @param {string} sql - The SQL query to execute.
   * @param {Array} [params=[]] - An optional array of parameters to pass to the SQL query.
   * @returns {Promise<Object[]>} A promise that resolves with an array of result rows.
   * @throws {Error} Throws an error if the query fails.
   */
  async getAll(sql, params = []) {
    try {
      const results = await this.query(sql, params);
      return results;  // Return all results (array of rows)
    } catch (err) {
      throw new Error(err);
    }
  }
}

export { MySQLHandler };
export default MySQLHandler;