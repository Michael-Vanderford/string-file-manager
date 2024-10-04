const { parentPort, threadId, workerData, isMainThread } = require('worker_threads');
const { execSync, exec } = require('child_process')
const fs = require('fs');
const path = require('path');
const gio = require('../gio/build/Release/obj.target/gio')

let isCancelled = 0;

class FileOperation {

    constructor() {
        this.progress_id = 0;
        this.isCancelled = 0;
        this.sharedArray = new Int32Array(workerData);

    }

    get_files_arr(source, destination, callback) {

        cp_recursive++
        file_arr.push({ type: 'directory', source: source, destination: destination })
        gio.ls(source, (err, dirents) => {

            if (err) {
                return callback(err);
            }

            for (let i = 0; i < dirents.length; i++) {

                let file = dirents[i]

                if (file.filesystem.toLocaleLowerCase() === 'ntfs') {
                    // sanitize file name
                    file.name = file.name.replace(/[^a-z0-9]/gi, '_');
                }

                if (!file.is_symlink) {
                    if (file.is_dir) {
                        this.get_files_arr(file.href, path.format({ dir: destination, base: file.name }), callback)
                    } else {
                        let file_obj = {
                            type: 'file',
                            source: file.href,
                            destination: path.format({ dir: destination, base: file.name }),
                            size: file.size,
                            is_symlink: file.is_symlink,
                            file: file
                        }
                        file_arr.push(file_obj)
                    }
                }

            }

            if (--cp_recursive == 0 || cancel_get_files) {
                // parentPort.postMessage({cmd: 'msg', msg: ``})

                let file_arr1 = file_arr;
                file_arr = []
                return callback(null, file_arr1);
            }
        })
    }

    getIsCancelled() {
        console.log('getIsCancelled', this.isCancelled);
        return this.isCancelled;
    }

    setIsCancelled(val) {
        console.log('setIsCancelled', val);
        this.isCancelled = val;
    }

    paste_recursive(data) {

        let idx = 0;
        // let bytes_copied = 0;
        let bytes_copied0 = 0;
        let max = 0;
        let copy_arr = [];
        let data_arr = data.copy_arr;
        let destination = data.destination;
        // let progress_id = Math.floor(Math.random() * 100);
        let progress_id = data.id;

        if (data_arr.length > 0) {

            let start = Date.now();

            for (let i = 0; i < data_arr.length; i++) {

                let f = data_arr[i];
                f.destination = f.destination;

                // process directory
                if (f.is_dir) {

                    const get_next = () => {

                        try {

                            this.get_files_arr(f.source, f.destination, (err, dirents) => {

                                if (err) {
                                    console.log(err);
                                    return;
                                }
                                let cpc = 0;

                                for (let i = 0; i < dirents.length; i++) {

                                    // short cut
                                    let f = dirents[i];

                                    // sanitize file name
                                    f.destination = f.destination.replaceAll(':', '_');

                                    // calculate max
                                    if (f.size) {
                                        max += parseInt(f.size);
                                    }

                                    if (f.type == 'directory') {
                                        cpc++
                                        copy_arr.push({ source: f.source, destination: f.destination, is_dir: 1})
                                    } else {
                                        cpc++
                                        copy_arr.push({ source: f.source, destination: f.destination, is_dir: 0})
                                    }

                                }

                            })

                        } catch (err) {
                            console.log(err);
                            return;
                        }

                    }

                    get_next();

                // process files
                } else {

                    if (f.size) {
                        max += parseInt(f.size);
                    }

                    // sanitize file name
                    let copy_item = {
                        source: f.source,
                        destination: f.destination.replaceAll(':', '_'),
                        is_dir: 0
                    }

                    copy_arr.push(copy_item);

                }

            }

            let end = Date.now();
            console.log('get_files_arr', (end - start) / 1000);

        }

        let start = Date.now();

        // sort so we create all the directories first
        copy_arr.sort((a, b) => {
            return a.source.length - b.source.length;
        })

        // clear message
        let msg = {
            cmd: 'msg',
            msg: ''
        }
        parentPort.postMessage(msg);

        // try {

        //     gio.cp_arr(copy_arr, (err, res) => {

        //         if (err) {

        //             let copy_failed = {
        //                 cmd: 'copy_failed',
        //                 msg: err
        //             }
        //             parentPort.postMessage(copy_failed);

        //             let msg = {
        //                 cmd: 'msg',
        //                 msg: err,
        //                 has_timeout: 0
        //             }
        //             parentPort.postMessage(msg);
        //             console.log(err);

        //         }

        //         bytes_copied += parseInt(res.bytes_copied);

        //         if (bytes_copied > 0) {

        //             let progress_data = {
        //                 id: progress_id,
        //                 cmd: 'progress',
        //                 msg: `Copying`, //${path.basename(f.destination)}`,
        //                 max: max,
        //                 value: bytes_copied
        //             }
        //             parentPort.postMessage(progress_data);

        //         }

        //         // // File Copy done
        //         if (bytes_copied >= max && bytes_copied > 0) {

        //             let progress_done = {
        //                 id: progress_id,
        //                 cmd: 'progress',
        //                 msg: '',
        //                 max: 0,
        //                 value: 0
        //             }
        //             parentPort.postMessage(progress_done);

        //             let copy_done = {
        //                 cmd: 'copy_done',
        //                 destination: destination
        //             }
        //             parentPort.postMessage(copy_done);

        //             // let exit = {
        //             //     cmd: 'exit'
        //             // }
        //             // parentPort.postMessage

        //             bytes_copied = 0;
        //             max = 0;

        //         }

        //     });

        // } catch (err) {
        //     console.log(err);
        //     return;
        // }

        // let interval = 0;
        // copy files
        for (let i = 0; i < copy_arr.length; i++) {
            let f = copy_arr[i];
            try {
                if (f.is_dir) {
                    gio.mkdir(f.destination)
                } else {
                    gio.cp_async(f.source, f.destination, (err, res) => {
                        if (err) {
                            console.log('error', err, f.source, f.destination);
                            return;
                        }
                        bytes_copied += parseInt(res.bytes_copied);
                        if (bytes_copied > 0) {
                            setTimeout(() => {
                            let progress_data = {
                                id: progress_id,
                                cmd: 'progress',
                                msg: `Copying`, //${path.basename(f.destination)}`,
                                max: copy_arr.length - 1,
                                value: i
                            }
                            parentPort.postMessage(progress_data);
                            }, 500);
                        }
                        // File Copy done
                        if (i === copy_arr.length - 1) {
                            let progress_done = {
                                id: progress_id,
                                cmd: 'progress',
                                msg: '',
                                max: 0,
                                value: 0
                            }
                            parentPort.postMessage(progress_done);
                            let copy_done = {
                                cmd: 'copy_done',
                                destination: f.destination
                            }
                            parentPort.postMessage(copy_done);
                            // clearInterval(interval);
                            bytes_copied = 0;
                            max = 0;
                        }
                    })
                }
            } catch (err) {
                console.log(err);
                return;
            }
        }

        let end = Date.now();
        console.log('duration', (end - start) / 1000);

    }

}

const fileOperation = new FileOperation();

let file_arr = [];
let cp_recursive = 0;
let progress_id = 0;
let bytes_copied = 0;
let number_of_files = 0;
let c = 0;


const cancel_get_files = false;

// Helper function to promisify gio.ls
function gio_ls(source) {
    return new Promise((resolve, reject) => {
        gio.ls(source, (err, dirents) => {
            if (err) {
                reject(err);
            } else {
                resolve(dirents);
            }
        });
    });
}

// get files array async
async function get_files_arr_async(source, destination) {
    cp_recursive++;
    file_arr.push({ type: 'directory', source: source, destination: destination });

    try {
        const dirents = await gio_ls(source); // Assuming gio.ls is promisified

        await Promise.all(dirents.map(async (file) => {
            if (file.filesystem.toLowerCase() === 'ntfs') {
                file.name = file.name.replace(/[^a-z0-9]/gi, '_');
            }

            if (!file.is_symlink) {
                const filePath = path.format({ dir: destination, base: file.name });

                if (file.is_dir) {
                    await get_files_arr(file.href, filePath);
                } else {
                    file_arr.push({
                        type: 'file',
                        source: file.href,
                        destination: filePath,
                        size: file.size,
                        is_symlink: file.is_symlink,
                        file: file
                    });
                }
            }
        }));

        cp_recursive--;

        if (cp_recursive === 0 || cancel_get_files) {
            const file_arr1 = file_arr;
            file_arr = [];
            return file_arr1;
        }
    } catch (err) {
        throw err;
    }
}



let cancel_data = {
    cancel: 0,
    href: ''
}

// Handle Worker Messages

parentPort.on('message', data => {

    // console.log('worker', data);
    switch (data.cmd) {

        // case 'monitor_progress': {

        //     let bytes_copied = 0;
        //     let progress_id = data.id;
        //     let max = data.max;
        //     let destination = data.destination;

        //     let dir_size_st = execSync(`du -b -s ${destination}`).toString().split('\t')[0];
        //     let dir_size = parseInt(dir_size_st);

        //     let progress_interval = setInterval(() => {

        //         exec(`du -b -s ${destination}`, (err, stdout, stderr) => {
        //             if (err) {
        //                 console.log(err);
        //             }
        //             let size = stdout.split('\t')[0];
        //             bytes_copied = parseInt(size) - dir_size;

        //             let progress_data = {
        //                 id: progress_id,
        //                 cmd: 'progress',
        //                 msg: `Copying`, //${path.basename(copy_arr[0].destination)}`,
        //                 max: max,
        //                 value: bytes_copied
        //             }

        //             win.send('set_progress', progress_data);

        //             // console.log('bytes copied', bytes_copied);
        //             // console.log('max', max);

        //             if (bytes_copied >= max) {
        //                 let progress_done = {
        //                     id: progress_id,
        //                     cmd: 'progress',
        //                     msg: '',
        //                     max: 0,
        //                     value: 0
        //                 }
        //                 win.send('set_progress', progress_done);

        //                 bytes_copied = 0;
        //                 max = 0;

        //                 clearInterval(progress_interval);
        //             }

        //         })

        //     }, 1000);

        //     break;
        // }

        case 'cancel_operation': {
            isCancelled = 1;
            console.log('cancel_operation', isCancelled);
            break;
        }

        case 'copy': {

            let idx = 0;
            let f = data;
            let copy_arr = [];
            let max = 0;
            let progress_id = data.id;
            number_of_files = data.number_of_files;

            ++c;

            // console.log('progress_id_from_worker', progress_id);

            // moved this to global scope since it causes issues with progress handling
            // let bytes_copied = 0;

            if (f.is_dir) {

                const get_next = () => {

                    fileOperation.get_files_arr(f.source, f.destination, (err, dirents) => {

                        if (err) {
                            console.log(err);
                            return;
                        }
                        let cpc = 0;

                        for (let i = 0; i < dirents.length; i++) {

                            // short cut
                            let f = dirents[i];

                            // sanitize file name
                            f.destination = f.destination.replaceAll(':', '_');

                            // calculate max
                            if (f.size) {
                                max += f.size;
                            }

                            if (f.type == 'directory') {
                                cpc++
                                copy_arr.push({ source: f.source, destination: f.destination, is_dir: 1})
                            } else {
                                cpc++
                                copy_arr.push({ source: f.source, destination: f.destination, is_dir: 0})
                            }

                        }

                        if (cpc === dirents.length) {
                            // get_next();
                            return;
                        }

                    })

                }

                get_next();


                // sort so we create all the directories first
                copy_arr.sort((a, b) => {
                    return a.source.length - b.source.length;
                })

                // clear message
                msg = {
                    cmd: 'msg',
                    msg: '',
                }
                parentPort.postMessage(msg);

                // copy files
                for (let i = 0; i < copy_arr.length; i++) {

                    let f = copy_arr[i];
                    try {

                        if (f.is_dir) {
                            gio.mkdir(f.destination)
                        } else {

                            gio.cp_async(f.source, f.destination, (err, res) => {

                                if (err) {
                                    console.log('error', err, f.source, f.destination);
                                    return;
                                }

                                if (res.bytes_copied > 0) {
                                    bytes_copied += parseInt(res.bytes_copied);
                                }

                                if (bytes_copied > 0) {
                                    let progress_data = {
                                        id: progress_id,
                                        cmd: 'progress',
                                        msg: `Copying`, //${path.basename(f.destination)}`,
                                        max: max,
                                        value: bytes_copied
                                    }
                                    parentPort.postMessage(progress_data);
                                }

                                // File Copy done
                                if (bytes_copied >= max || number_of_files === c) {

                                    let progress_done = {
                                        id: progress_id,
                                        cmd: 'progress',
                                        msg: '',
                                        max: 0,
                                        value: 0
                                    }
                                    parentPort.postMessage(progress_done);

                                    let copy_done = {
                                        cmd: 'copy_done',
                                        bytes_copied: bytes_copied,
                                        destination: f.destination
                                    }
                                    parentPort.postMessage(copy_done);

                                    // clearInterval(interval);
                                    bytes_copied = 0;
                                    max = 0;

                                }

                            })

                        }

                    } catch (err) {
                        console.log(err);
                        return;
                    }

                }


            } else {

                let msg = {
                    cmd: 'msg',
                    msg: ``,
                    // has_timeout: 0
                }
                parentPort.postMessage(msg);

                setTimeout(() => {

                    gio.cp_async(f.source, f.destination, (err, res) => {

                        if (err) {
                            console.log(err);
                            return;
                        }

                        if (res.bytes_copied > 0) {
                            bytes_copied += parseInt(res.bytes_copied);
                        }

                        // console.log('bytes_copied', bytes_copied);
                        // console.log('f.max', f.max);
                        // console.log('res.bytes_copied', res.bytes_copied);
                        // console.log('progress_id', progress_id);

                        let progress = {
                            id: progress_id,
                            cmd: 'progress',
                            msg: `Copying`, //${path.basename(f.source)}`,
                            max: f.max,
                            value: bytes_copied
                        }
                        parentPort.postMessage(progress);


                        if (bytes_copied >= f.max || number_of_files === c) {

                            // progress done
                            let progress_done = {
                                id: progress_id,
                                cmd: 'progress',
                                msg: '',
                                max: 0,
                                value: 0
                            }
                            parentPort.postMessage(progress_done);

                            let msg = {
                                cmd: 'msg',
                                msg: `Done copying files`,
                            }
                            parentPort.postMessage(msg);

                            // copy done
                            let data = {
                                cmd: 'copy_done',
                                destination: f.destination
                            }
                            parentPort.postMessage(data);

                            bytes_copied = 0;

                        }


                    })

                }, 500);

            }

            break;

        }

        case 'paste_recursive': {
            console.log('running paste_recursive')
            fileOperation.paste_recursive(data);
            break;
        }

        // Past Files
        case 'paste': {

            console.log('running paste')
            let idx = 0;
            let copy_arr = data.copy_arr

            progress_id += 1;

            function copy_next() {

                let msg = {
                    cmd: 'msg',
                    msg: `<img src="assets/icons/spinner.gif" style="width: 12px; height: 12px" alt="loading" /> Getting files for copy operation...`,
                    has_timeout: 0
                }
                parentPort.postMessage(msg);

                // Check if copy_arr is done processing
                if (idx === copy_arr.length) {

                    let close_progress = {
                        id: data.id,
                        cmd: 'progress',
                        msg: ``,
                        max: 0,
                        value: 0
                    }
                    // console.log(data)
                    parentPort.postMessage(close_progress);
                    // return;
                }

                let copy_item = copy_arr[idx];
                let source = copy_item.source;
                let destination = copy_item.destination;
                idx++

                let is_writable = 0;
                if (gio.is_writable(path.dirname(destination))) {
                    is_writable = 1;
                } else {
                    is_writable = 0;
                }

                if (is_writable) {

                    // gio_utils.get_file(copy_item.source, file => {
                    let file;
                    try {
                        file = gio.get_file(copy_item.source);
                    } catch (err) {
                        console.log(err);
                    }

                    if (file.is_dir || file.type === 'directory') {

                        let c = 0;
                        while (gio.exists(destination)) {
                            ++c;
                            var pattern = /\((\d+)\)$/;
                            var match = pattern.exec(destination);

                            if (match) {
                                let last_c = parseInt(match[1]);
                                let next_c = last_c + 1;
                                destination = destination.replace(pattern, `(${next_c})`);
                            } else {
                                destination = `${destination} (1)`
                            }

                            if (c > 10) {
                                // Bail
                                return;
                            }
                        }

                        get_files_arr(copy_item.source, destination, (err, dirents) => {

                            if (err) {
                                console.log(err);
                                parentPort.postMessage({ cmd: 'msg', msg: err });
                                return;
                            }

                            let msg = {
                                cmd: 'msg',
                                msg: '',
                            }
                            parentPort.postMessage(msg);

                            let max = 0;
                            for (let i = 0; i < dirents.length; i++) {
                                if (dirents[i].type === 'file') {
                                    max += parseInt(dirents[i].size);
                                }
                            }

                            let cpc = 0;
                            let chunk_size = 0;
                            for (let i = 0; i < dirents.length; i++) {
                                let f = dirents[i]
                                if (f.type == 'directory') {
                                    if (!gio.exists(f.destination)) {
                                        try {
                                            cpc++
                                            gio.cp(f.source, f.destination);

                                        } catch (err) {
                                            let msg = {
                                                cmd: 'msg',
                                                msg: err.message,
                                                has_timeout: 0
                                            }
                                            parentPort.postMessage(msg);
                                        }
                                    }
                                }
                            }

                            let bytes_copied0 = 0;
                            let bytes_copied = 0;
                            let cancel = 0;
                            progress_id = Math.floor(Math.random() * 100);

                            for (let i = 0; i < dirents.length; i++) {
                                let f = dirents[i]
                                if (f.type == 'file') {
                                    if (gio.exists(f.destination)) {
                                        // gio.cp(f.source, f.destination, copy_item.overwrite_flag)
                                    } else {
                                        try {

                                            gio.cp_async(f.source, f.destination, (res) => {
                                                cpc++
                                                const current_time = Date.now();
                                                bytes_copied0 = bytes_copied;

                                                if (res.bytes_copied > 0) {
                                                    bytes_copied += parseInt(res.bytes_copied);
                                                }

                                                // update progress
                                                let progress_data = {
                                                    id: progress_id,
                                                    cmd: 'progress',
                                                    msg: `Copying `,  // ${path.basename(f.source)}`,
                                                    max: max,
                                                    value: bytes_copied
                                                }
                                                parentPort.postMessage(progress_data);

                                                // File Copy done
                                                if (bytes_copied >= max && bytes_copied > 0) {

                                                    let progress_done = {
                                                        id: progress_id,
                                                        cmd: 'progress',
                                                        msg: '',
                                                        max: 0,
                                                        value: 0
                                                    }
                                                    parentPort.postMessage(progress_done);
                                                    bytes_copied = 0;

                                                }

                                            })

                                            // Cancel Copy
                                            if (cancel_data.cancel) {

                                                console.log(copy_item.source)

                                                let progress_done = {
                                                    id: progress_id,
                                                    cmd: 'progress',
                                                    msg: '',
                                                    max: 0,
                                                    value: 0
                                                }
                                                parentPort.postMessage(progress_done);

                                                let msg = {
                                                    cmd: 'msg',
                                                    msg: `Copy Cancelled`,
                                                    has_timeout: 0
                                                }
                                                parentPort.postMessage(msg);

                                                break;
                                            }


                                            // gio.cp(f.source, f.destination, 0)

                                        } catch (err) {
                                            let msg = {
                                                cmd: 'msg',
                                                msg: err.message,
                                                has_timeout: 0
                                            }
                                            parentPort.postMessage(msg);
                                        }

                                    }

                                }
                            }

                            if (cpc === dirents.length) {

                                // console.log('done copying files');
                                let data = {
                                    cmd: 'copy_done',
                                    destination: destination
                                }
                                parentPort.postMessage(data);

                                copy_next();
                            }

                        })

                    // File
                    } else {

                        try {

                            let bytes_copied = 0;
                            let file = gio.get_file(copy_item.source);
                            let max = file.size;
                            progress_id = Math.floor(Math.random() * 100);

                            let handle = gio.cp_async(copy_item.source, copy_item.destination, (res) => {

                                bytes_copied = parseInt(res.current_num_bytes);

                                let progress_data = {
                                    id: progress_id,
                                    cmd: 'progress',
                                    msg: `Copying ${path.basename(copy_item.source)}`,
                                    max: max,
                                    value: bytes_copied
                                }
                                parentPort.postMessage(progress_data);

                                if (bytes_copied >= max && bytes_copied > 0 && max > 0) {

                                    let progress_done = {
                                        id: progress_id,
                                        cmd: 'progress',
                                        msg: '',
                                        max: 0,
                                        value: 0
                                    }
                                    parentPort.postMessage(progress_done);

                                    bytes_copied = 0;

                                    let data = {
                                        cmd: 'copy_done',
                                        destination: copy_item.destination
                                    }
                                    parentPort.postMessage(data);
                                }


                            })

                        } catch (err) {
                            console.log(err.message);
                            let msg = {
                                cmd: 'msg',
                                msg: err.message,
                                has_timeout: 0
                            }
                            parentPort.postMessage(msg);
                            return;
                        }
                        copy_next();

                    }

                    // })

                } else {
                    let data = {
                        cmd: 'msg',
                        msg: 'Error: Permission Denied',
                        has_timeout: 0
                    }
                    parentPort.postMessage(data);
                    return;
                }

            }
            copy_next();

            break;
        }

    }

})
