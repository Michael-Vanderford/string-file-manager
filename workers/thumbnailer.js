const { parentPort, workerData, isMainThread } = require('worker_threads');
const { execSync, exec } = require('child_process')
const path          = require('path');
const gio_utils     = require('../utils/gio');
const gio           = require('../gio/build/Release/obj.target/gio')

parentPort.on('message', data => {

    if (data.cmd === 'create_thumbnail') {
        let thumbnail = `${path.join(data.thumb_dir, path.basename(data.href))}`
        if (!gio.exists(thumbnail)) {
            console.log('creating thumbnail', thumbnail);
            gio.thumbnail(data.href, thumbnail);
        }
    }

})