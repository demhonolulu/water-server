// ── LOGS ──────────────────────────────────────────────────
// information logging and printing; mostly for debugging
// ──────────────────────────────────────────────────────────

const { getHawaiiTimeNow, startTimer, endTimer } = require("./time.js");

const fs = require('fs');

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

function printToLog(message, indent = 0, visible = true) {
    const text = `[${getHawaiiTimeNow()}] ${getIndentString(indent)}${message}`;
    if (visible) {
        console.log(text);
    }

    return text;
}

function printTimerStart(message = null, indent = 0, visible = true) {
    const timer = startTimer();
    if (message && visible) {
        printToLog(message, indent);
    }
    
    return timer;
}

function printTimerEnd(timer, message = null, indent = 0, visible = true) {
    const elapsed = endTimer(timer);
    if (message && visible) {
        printToLog(`${message} took ${Math.round(elapsed)}ms`, indent);
    }
}

function addToOutputLog(message) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const filename = `${year}-${month}-server-logs.txt`;

    fs.appendFileSync(`../../logs/${filename}`, message + '\n');
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
    addToOutputLog,
    printErrorArray
};