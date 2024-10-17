import { logger } from './logger.mjs';

class Queue {
  #queue = [];
  constructor(interval) {
    this.interval = interval;
    this.start();
    logger.verbose('Database queue waiting.');
  }

  // returns the last item of an array
  lastItem(arr) {
    return arr[arr.length - 1];
  }

  // returns true if array is empty
  isEmpty(arr) {
    return arr.length == 0;
  }

  // responsible for executing the function at the head of the queue
  async run(arr) {
    // remove the function at the head of the queue
    const func = arr.pop();

    // adding "false" placeholder at the head to indicate that a
    // function is being executed:
    arr.push(false);

    // execute the function
    await func();

    // remove the "false" placeholder at the head to indicate that
    // the run function is ready to execute the next function in
    // the queue
    arr.pop();
  }

  // add to the tail end of the queue
  addToQueue(func) {
    this.#queue.unshift(func);
  }

  // start the event loop
  start() {
    return setInterval(() => {
      // check if the run method is free by checking if the item at the
      // head is "false" and if the array is not empty
      if (this.lastItem(this.#queue) !== false && !this.isEmpty(this.#queue)) {
        this.run(this.#queue);
      }
    }, this.interval);
  }

  // stop the event loop
  stop() {
    clearInterval(this.start());
  }
}

export { Queue };
export default Queue;