const { parentPort, workerData, isMainThread } = require('worker_threads');
const path = require('path');
const gio = require('../gio/build/Release/obj.target/gio')

// Handle Worker Messages
parentPort.on('message', data => {
    // List Files
    if (data.cmd === 'ls') {

        try {

            // get start time
            let start = Date.now();

            gio.ls(data.source, (err, dirents) => {

                if (err) {
                    parentPort.postMessage({cmd: 'msg', err: err});
                    return;
                }
                let cmd = {
                    cmd: 'ls_done',
                    dirents: dirents,
                    source: data.source,
                    display_name: path.basename(data.source), //file.display_name, // for tab name
                    tab: data.tab
                }
                parentPort.postMessage(cmd);

                // get end time
                let end = Date.now();
                let elapsed = (end - start) / 1000;
                // console.log('ls elapsed time', elapsed);

            })


        } catch (err) {

            let msg = {
                cmd: 'msg',
                msg: err.message
            }
            parentPort.postMessage(msg);

            let cmd = {
                cmd: 'remove_history',
                href: data.source
            }
            parentPort.postMessage(cmd);

            cmd = {
                cmd: 'clear'
            }
            parentPort.postMessage(cmd);
            return;

        }

    }

})