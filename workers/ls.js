const { parentPort, workerData, isMainThread } = require('worker_threads');
const path = require('path');
const gio_utils = require('../utils/gio');
// const gio = require('node-gio');
const gio = require('../gio/build/Release/obj.target/gio')
// const gio = require('/home/michael/source/repos/node-gio/build/Release/obj.target/gio');


// Handle Worker Messages
parentPort.on('message', data => {
    // List Files
    if (data.cmd === 'ls') {
        try {
            if (gio.exists(data.source)) {
                try {
                    gio.ls(data.source, (err, dirents) => {
                        if (err) {
                            parentPort.postMessage({cmd: 'ls_err', err: err});
                            return;
                        }
                        parentPort.postMessage({cmd: 'ls_done', dirents: dirents, source: data.source, tab: data.tab});
                    })
                } catch (err) {
                    parentPort.postMessage({cmd: 'ls_err', err: err.message});
                }
            } else {
                parentPort.postMessage({cmd: 'msg', msg: 'Error: Getting Directory'});
            }
        } catch (err) {
            console.log(err)
        }

    }

})