// ── LOGS ──────────────────────────────────────────────────
// information logging and printing; mostly for debugging
// ──────────────────────────────────────────────────────────

const { getHawaiiTimeNow, startTimer, endTimer } = require("./time.js");

/**
// ErrorMessage
//   custom error class that formats an array of errors into a readable message.
//   @param {string} message - header message
//   @param {Object[]} errors - [{error: ''}]
//   @param {int} indent - tab indent of message
// */
class ErrorMessage extends Error {
    constructor(message, errors, indent = 0) {
        const indentStr = (n) => ' '.repeat(n * 2);
        const errorLines = errors.map(e => `${indentStr(indent + 1)}${e.error}`).join('\n');
        super(`${indentStr(indent)}${message}:\n${errorLines}`);
        this.errors = errors;
    }
}

function printToLog(message, indent = 0) {
    const text = `[${getHawaiiTimeNow()}] ${getIndentString(indent)}${message}`;
    console.log(text);
}

function printTimerStart(message = null, indent = 0) {
    const timer = startTimer();
    if (message) {
        printToLog(message, indent);
    }
    
    return timer;
}

function printTimerEnd(timer, message = null, indent = 0) {
    const elapsed = endTimer(timer);
    if (message) {
        printToLog(`${message} took ${Math.round(elapsed)}ms`, indent);
    }
}


/**
// getIndentString
//   prints out all errors in the error array
//   @param {string} message - header message
//   @param {Object[]} errors - [{error: ''}]
//   @param {int} indent - tab indent of message
// */
function getIndentString(indent) {
    return ' '.repeat(indent * 2);
}

function printErrorArray(message, errors, indent = 0) {
    console.error(`[${getHawaiiTimeNow()}] ${getIndentString(indent)}${message}:`);
    errors.forEach((error) => {
        console.error(`[${getHawaiiTimeNow()}] ${getIndentString(indent + 1)}${error.error}`)
    });
}

module.exports = {
    ErrorMessage,
    printToLog,
    printTimerStart,
    printTimerEnd,
    printErrorArray
};