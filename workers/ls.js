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

        // console.log('data', data)
        // let thumb_dir = path.join(app.getPath('userData'), 'thumbnails');
        // if (data.source.indexOf('mtp') > -1 || data.source.indexOf('thumbnails') > -1) {
        //     thumb.postMessage({ cmd: 'create_thumbnail', source: data.source, destination: thumb_dir, sort: sort });
        // } else {
        //     thumb.postMessage({ cmd: 'create_thumbnail', source: href, destination: thumb_dir, sort: sort });
        // }

        try {
            gio.ls(data.source, (err, dirents) => {
                if (err) {
                    parentPort.postMessage({cmd: 'msg', err: err});
                    return;
                }
                let file = gio.get_file(data.source);
                let cmd = {
                    cmd: 'ls_done',
                    dirents: dirents,
                    source: data.source,
                    display_name: file.display_name, // for tab name
                    tab: data.tab
                }
                parentPort.postMessage(cmd);
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