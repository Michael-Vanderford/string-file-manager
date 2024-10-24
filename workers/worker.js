const { parentPort, workerData, isMainThread } = require('worker_threads');
const { execSync, exec } = require('child_process')
const fs = require('fs');
const path = require('path');
const gio = require('../gio/build/Release/obj.target/gio')

let isCancelled = 0;

class FileOperation {

    constructor() {
        this.progress_id = 0;
        this.isCancelled = 0;
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
        let bytes_copied = 0;
        let bytes_copied0 = 0;
        let max = 0;
        let copy_arr = [];
        let data_arr = data.copy_arr;
        // let progress_id = Math.floor(Math.random() * 100);
        let progress_id = data.id;

        let msg = {
            cmd: 'msg',
            msg: `<img src="assets/icons/spinner.gif" style="width: 12px; height: 12px" alt="loading" />   Getting files for copy operation...`,
            has_timeout: 0
        }
        parentPort.postMessage(msg);

        if (data_arr.length > 0) {

            let start = Date.now();

            for (let i = 0; i < data_arr.length; i++) {

                let f = f.data_arr[i]; //gio.get_file(data_arr[i].source);
                f.destination = data_arr[i].destination;

                // process directory
                if (f.is_dir) {

                    function get_next() {

                        if (idx === data_arr.length) {
                            return;
                        }

                        let copy_item = data_arr[idx];
                        idx++

                        let is_dir = f.is_dir;
                        if (is_dir) {

                            get_files_arr(copy_item.source, copy_item.destination, (err, dirents) => {

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
                                    get_next();
                                }

                            })

                        } else {

                            if (copy_item.size) {
                                max += copy_item.size;
                            }

                            // sanitize file name
                            copy_item.destination = copy_item.destination.replaceAll(':', '_');

                            // add to copy array
                            copy_arr.push({ source: copy_item.source, destination: copy_item.destination, is_dir: 0})

                        }

                    }

                    get_next();

                // process files
                } else {

                    if (f.size) {
                        max += f.size;
                    }

                    if (f.href === f.destination) {

                        // todo: this needs work
                        // while (f.href === f.destination) {
                        while (gio.exists(f.destination)) {

                            // let file = gio.get_file(destination);
                            let ext = path.extname(f.destination);
                            let base = path.basename(f.destination, ext);
                            let dir = path.dirname(f.destination);

                            let new_base = base + ' (Copy)';
                            f.destination = path.join(dir, new_base + ext);

                        }

                    }

                    // sanitize file name
                    f.destination = f.destination.replaceAll(':', '_');
                    f.source = f.href;
                    f.href = f.destination;
                    f.name = path.basename(f.destination);
                    f.display_name = path.basename(f.destination);
                    copy_arr.push(f);

                    if (i === data_arr.length - 1) {
                        let copy_data = {
                            cmd: 'copy_arr_data',
                            copy_arr: copy_arr
                        }
                        parentPort.postMessage(copy_data);
                    }

                }

            }

            let end = Date.now();
            console.log('get_files_arr', (end - start) / 1000);

        }

        let start = Date.now();

        // // send array to main thread
        // let copy_data = {
        //     cmd: 'copy_arr_data',
        //     copy_arr: copy_arr
        // }
        // parentPort.postMessage(copy_data);

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

                    // add watcher for progress

                    gio.cp_async(f.source, f.destination, (err, res) => {

                        if (err) {
                            console.log('error', err, f.source, f.destination);
                            return;
                        }

                        // console.log('bytes_copied', res, max);

                        // const current_time = Date.now();
                        bytes_copied0 = bytes_copied;
                        if (res.bytes_copied > 0) {
                            bytes_copied += parseInt(res.bytes_copied);
                        }
                        // bytes_copied0 = bytes_copied;
                        // if (res.bytes_read > 0) {
                        //     bytes_copied += parseInt(res.bytes_read);
                        // }

                        // update progress
                        let progress_data = {
                            id: progress_id,
                            cmd: 'progress',
                            msg: `Copying ${path.basename(f.destination)}`,
                            max: max,
                            value: bytes_copied
                        }
                        parentPort.postMessage(progress_data);

                        // console.log('bytes_copied', bytes_copied, max);
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

                            let copy_done = {
                                cmd: 'copy_done',
                                destination: f.destination
                            }
                            parentPort.postMessage(copy_done);

                            max = 0;

                        }

                    })

                    // gio.cp_async(f.source, f.destination, (err, res) => {

                    //     if (err) {
                    //         console.log('error', err, f.source, f.destination);
                    //         return;
                    //     }

                    //     // const current_time = Date.now();

                    //     bytes_copied0 = bytes_copied;
                    //     if (res.bytes_copied > 0) {
                    //         bytes_copied += parseInt(res.bytes_copied);
                    //     }

                    //     // update progress
                    //     let progress_data = {
                    //         id: progress_id,
                    //         cmd: 'progress',
                    //         msg: `Copying ${path.basename(f.destination)}`,
                    //         max: 1,
                    //         value: 1
                    //     }
                    //     parentPort.postMessage(progress_data);

                    //     // console.log('bytes_copied', bytes_copied, max);
                    //     // File Copy done
                    //     if (bytes_copied >= max && bytes_copied > 0) {

                    //         let progress_done = {
                    //             id: progress_id,
                    //             cmd: 'progress',
                    //             msg: '',
                    //             max: 0,
                    //             value: 0
                    //         }
                    //         parentPort.postMessage(progress_done);
                    //         bytes_copied = 0;

                    //         let copy_done = {
                    //             cmd: 'copy_done',
                    //             destination: f.destination
                    //         }
                    //         parentPort.postMessage(copy_done);

                    //         max = 0;

                    //     }

                    // })

                }

            } catch (err) {
                console.log(err);
                return;
            }

        }

        let end = Date.now();
        console.log('duration', (end - start) / 1000);

    }

    // Delete
    delete(del_arr) {

        this.progress_id += 1;

        let idx = 0;
        function delete_next() {

            if (idx === del_arr.length) {
                // Callback goes here
                return;
            }

            let del_item = del_arr[idx];
            idx++

            gio.get_file(del_item, file => {

                if (file.type === 'directory') {

                    get_files_arr(del_item, del_item, dirents => {

                        let data = {};
                        let cpc = 0;

                        // Delete files
                        for (let i = 0; i < dirents.length; i++) {
                            let f = dirents[i]
                            if (f.type == 'file') {
                                cpc++
                                try {
                                    gio.rm(f.source)
                                } catch (err) {
                                    console.log(err)
                                }

                                data = {
                                    id: this.progress_id,
                                    cmd: 'progress',
                                    msg: `Deleted File  ${i} of ${dirents.length}`,
                                    max: dirents.length,
                                    value: cpc
                                }
                                parentPort.postMessage(data)

                            }
                        }

                        // Sort directories
                        dirents.sort((a, b) => {
                            return b.source.length - a.source.length;
                        })

                        // Delete directories
                        for (let i = 0; i < dirents.length; i++) {
                            let f = dirents[i]
                            if (f.type == 'directory') {
                                cpc++

                                try {
                                    gio.rm(f.source)
                                } catch (err) {
                                    console.log(err)
                                }

                                data = {
                                    id: this.progress_id,
                                    cmd: 'progress',
                                    msg: `Deleted Folder ${i} of ${dirents.length}`,
                                    max: dirents.length,
                                    value: cpc
                                }
                                parentPort.postMessage(data)
                            }
                        }

                        if (cpc === dirents.length) {
                            // console.log('done deleting files');
                            data = {
                                cmd: 'delete_done',
                                source: del_item
                            }
                            parentPort.postMessage(data)
                            delete_next();
                        }

                    })

                } else {

                    try {
                        gio.rm(del_item);
                    } catch (err) {
                        console.log(err)
                    }

                    // data = {
                    //     cmd: 'delete_done',
                    //     source: del_item
                    // }
                    // parentPort.postMessage(data)
                    delete_next();

                }
            })

        }
        delete_next();

    }

}

const fileOperation = new FileOperation();

let file_arr = [];
let cp_recursive = 0;
let progress_id = 0;

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

function copy_async(source, destination) {
    return new Promise((resolve, reject) => {
        gio.cp_async(source, destination, (err, res) => {
        if (err) {
            reject(err);
        } else {
            resolve(res);
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

function get_files_arr(source, destination, callback) {

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
                    get_files_arr(file.href, path.format({ dir: destination, base: file.name }), callback)
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

function execPromise(cmd) {
    return new Promise((resolve, reject) => {
        gio.exec(cmd, (err, res) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(res);
        });
    });
}

let cancel_data = {
    cancel: 0,
    href: ''
}

// Handle Worker Messages
parentPort.on('message', data => {

    // console.log('worker', data);
    switch (data.cmd) {

        case 'cancel_operation': {
            isCancelled = 1;
            console.log('cancel_operation', isCancelled);
            break;
        }

        case 'merge_files': {

            let idx = 0;
            let merge_arr = [];

            data.copy_arr.forEach((item, idx) => {

                if (gio.exists(item.destination)) {

                    let src_file = gio.get_file(item.source);
                    let dest_file = gio.get_file(item.destination);

                    // Permission Denied
                    if (!dest_file.is_writable) {
                        parentPort.postMessage({ cmd: 'msg', msg: `Error: Permission Denied` });
                        return;
                    }

                    let msg = {
                        cmd: 'msg',
                        msg: `Getting files for merge operation`,
                        has_timeout: 0
                    }
                    parentPort.postMessage(msg);
                    parentPort.postMessage({ cmd: 'show_loader' });

                    // Directory
                    if (src_file.is_dir) {

                        get_files_arr(item.source, item.destination, (err, dirents) => {

                            if (err) {
                                console.log(err);
                                parentPort.postMessage({ cmd: 'msg', msg: `Merge err: ${err}` });
                                // return;
                            }

                            let files = dirents.filter(x => x.type === 'file');
                            for (let i = 0; i < files.length; i++) {

                                let f = files[i]
                                let src = gio.get_file(f.source);
                                let dest = ''; // gio.get_file(f.destination);

                                let merge_obj = {
                                    source: '',
                                    destination: '',
                                    source_date: '',
                                    destination_date: '',
                                    action: 0,
                                    id_dir: 0,
                                    content_type: '',
                                    is_writable: 0
                                }

                                merge_obj.source = src.href;
                                merge_obj.source_date = src.mtime;
                                merge_obj.is_dir = 1;
                                merge_obj.content_type = src.content_type;


                                if (gio.exists(f.destination)) {

                                    dest = gio.get_file(f.destination);

                                    merge_obj.destination = dest.href;
                                    merge_obj.destination_date = dest.mtime

                                    merge_obj.is_writable = dest.is_writable;
                                    if (!dest.is_writable) {
                                        // console.log(dest.href, 'not writable');
                                    }

                                    if (src.mtime > dest.mtime) {
                                        merge_obj.action = 1;
                                        merge_arr.push(merge_obj);
                                    } else if (src.mtime < dest.mtime) {
                                        merge_obj.action = 0;
                                        merge_arr.push(merge_obj);
                                    } else if (!dest_file.file_exists) {
                                        merge_obj.action = 0;
                                        merge_arr.push(merge_obj);
                                    } else if (src.mtime === dest.mtime) {

                                    }



                                } else {
                                    // New File
                                    merge_obj.is_writable = 1;
                                    merge_obj.destination = f.destination;
                                    merge_obj.action = 2;
                                    merge_arr.push(merge_obj);
                                }

                            }


                        })

                        // Files
                    } else {

                        let merge_obj = {
                            source: '',
                            destination: '',
                            source_date: '',
                            destination_date: '',
                            action: 0,
                            id_dir: 0,
                            content_type: '',
                            is_writable: 0
                        }

                        merge_obj.is_writable = dest_file.is_writable;

                        if (src_file.mtime > dest_file.mtime) {
                            merge_obj.action = 1;
                        } else if (src_file.mtime < dest_file.mtime) {
                            merge_obj.action = 0;
                        } else if (!dest_file.file_exists) {
                            merge_obj.action = 0;
                        } else if (src_file.mtime === dest_file.mtime) {

                        }

                        merge_obj.source = item.source
                        merge_obj.destination = item.destination;
                        merge_obj.source_date = src_file.mtime
                        merge_obj.destination_date = dest_file.mtime
                        merge_obj.is_dir = 0;
                        merge_obj.content_type = src_file.content_type;

                        merge_arr.push(merge_obj);

                    }
                }

            })

            merge_arr.sort((a, b) => {
                return b.source_date - a.source_date;
            })

            parentPort.postMessage({ 'cmd': 'merge_files', merge_arr: merge_arr });
            parentPort.postMessage({ cmd: 'msg', msg: '' });
            merge_arr = [];
            parentPort.postMessage({ cmd: 'hide_loader' });

            break;
        }

        // Folder Size
        case 'folder_size': {

            try {
                let cmd = 'cd "' + data.source + '"; du -b -s';
                exec(cmd, (err, stdout, stderr) => {
                    if (err) {
                        // console.error(stderr, cmd);
                        // return 0;
                    }
                    let size = parseFloat(stdout.replace(/[^0-9.]/g, ''));
                    size = size;
                    let worker_data = {
                        cmd: 'folder_size',
                        source: data.source,
                        size: size
                    }
                    parentPort.postMessage(worker_data);
                    // console.log(`Folder Size: ${data.source} ${size} bytes ${Date.now() - ts}ms`);
                })
            } catch (error) {
                console.error('folder_size', error);
                return 0;
            }
            break;
        }

        case 'cancel_get_files': {

            cancel_get_files = true;
            break;

        }

        // Folder Count
        case 'folder_count': {
            try {
                let cmd = 'cd "' + data.source + '"; find . | wc -l';
                const du = exec(cmd, (err, stdout, stderr) => {
                    if (err) {
                        return 0;
                    }
                    let folder_count = stdout;
                    let worker_data = {
                        cmd: 'folder_count',
                        source: data.source,
                        folder_count: parseInt(folder_count).toLocaleString()
                    }
                    parentPort.postMessage(worker_data);
                })

            } catch (error) {
                console.error('folder_size', error);
                return 0;
            }
            break;
        }

        // Get Folder Size for properties view
        case 'get_folder_size': {

            let cmd = `du -s "${data.source}"`;
            gio.exec(cmd, (err, res) => {

                if (err) {
                    console.error(err);
                    let msg = {
                        cmd: 'msg',
                        msg: err.message
                    }
                    parentPort.postMessage(msg);
                    return;
                }

                let size = parseFloat(res.toString().replace(/[^0-9.]/g, ''));
                size = size * 1024;
                // console.log('size', size);

                let worker_data = {
                    cmd: 'folder_size_done',
                    source: data.source,
                    folder_size: size
                }
                parentPort.postMessage(worker_data);

            });
            break;
        }

        case 'count':{
            try {
                let item_count = gio.count(data.source)
                if (item_count === undefined) {
                    item_count = ''
                }
                parentPort.postMessage({ cmd: 'count', source: data.source, count: item_count });
            } catch (err) {
                parentPort.postMessage({ cmd: 'msg', 'msg': err })
            }
            break;
        }

        case 'exists': {
            let exists = gio.exists(data.source);
            parentPort.postMessage({ cmd: 'exists', exists: exists });
            break;
        }

        case 'mv': {
            let merge_arr = [];
            let selected_files_arr = data.selected_items;

            let bytes_copied = 0;
            let max = 0;
            progress_id = Math.floor(Math.random() * 100);

            for (let i = 0; i < selected_files_arr.length; i++) {
                max += selected_files_arr[i].size;
            }

            for (let i = 0; i < selected_files_arr.length; i++) {
                try {
                    let f = selected_files_arr[i];

                    let src = gio.get_file(f.source);
                    let dest = ''; // gio.get_file(f.destination);

                    let merge_obj = {
                        source: '',
                        destination: '',
                        source_date: '',
                        destination_date: '',
                        action: '',
                        id_dir: 1,
                        content_type: ''
                    }

                    merge_obj.source = src.href;
                    merge_obj.source_date = src.mtime;
                    merge_obj.content_type = src.content_type;

                    if (gio.exists(f.destination)) {

                        dest = gio.get_file(f.destination);

                        merge_obj.destination = dest.href;
                        merge_obj.destination_date = dest.mtime

                        if (src.mtime > dest.mtime) {
                            merge_obj.action = 1;
                            merge_arr.push(merge_obj);
                        } else if (src.mtime < dest.mtime) {
                            merge_obj.action = 0;
                            merge_arr.push(merge_obj);
                        } else if (src.mtime === dest.mtime) {
                            merge_obj.action = 0;
                            merge_arr.push(merge_obj);
                        }

                    } else {
                        gio.mv(f.source, f.destination, (err, progress_data) => {

                            if (err) {
                                parentPort.postMessage({ cmd: 'msg', msg: err.message, has_timeout: 0 });
                                return;
                            }

                            bytes_copied += parseInt(progress_data.bytes_copied);

                            // update progress
                            let progress = {
                                id: progress_id,
                                cmd: 'progress',
                                msg: `Moving ${path.basename(f.source)}`,
                                max: max,
                                value: bytes_copied
                            }
                            parentPort.postMessage(progress);

                            // update card
                            if (bytes_copied >= progress_data.total_bytes) {

                                let move_done = {
                                    cmd: 'move_done',
                                    source: f.source,
                                    destination: f.destination
                                }
                                parentPort.postMessage(move_done);

                            }

                            // progress done
                            if (bytes_copied >= max) {

                                // close progress
                                let progress_done = {
                                    id: progress_id,
                                    cmd: 'progress',
                                    msg: '',
                                    max: 0,
                                    value: 0
                                }
                                parentPort.postMessage(progress_done);

                                bytes_copied = 0;
                                parentPort.postMessage({ cmd: 'msg', msg: `Done moving files` });

                            }

                        });
                    }

                } catch (err) {
                    parentPort.postMessage({ cmd: 'msg', msg: err.message });
                }

            }

            if (merge_arr.length > 0) {
                parentPort.postMessage({ cmd: 'merge_files_move', merge_arr: merge_arr });
                merge_arr = []
            }
            break;
        }

        // Rename
        case 'rename': {
            try {

                if (data.destination.indexOf('mtp:') > -1) {
                    let copy_arr = [{ source: data.source, destination: data.destination }];
                    fileOperation.paste(copy_arr);

                    let delete_arr = [data.source];
                    fileOperation.delete(delete_arr);
                } else {
                    gio.mv(data.source, data.destination, () => {});
                }

                parentPort.postMessage({ cmd: 'rename_done', source: data.source, destination: data.destination });
                parentPort.postMessage({ cmd: 'msg', msg: `Renamed "${path.basename(data.source)}" to "${path.basename(data.destination)}"` });

            } catch (err) {
                parentPort.postMessage({ cmd: 'clear' });
                parentPort.postMessage({ cmd: 'msg', msg: err.message });
            }
            break;
        }

        // New Folder
        case 'mkdir': {
            try {
                gio.mkdir(data.destination);
                parentPort.postMessage({ cmd: 'mkdir_done', destination: data.destination });
            } catch (err) {
                console.log(err);
            }
            break;
        }

        // Copy File for Overwrite
        case 'cp': {
            if (gio.exists(data.destination)) {
                try {
                    gio.cp(data.source, data.destination, data.overwrite_flag);
                    parentPort.postMessage({ cmd: 'copy_done', destination: data.destination });
                } catch (err) {
                    parentPort.postMessage({ cmd: 'msg', msg: err.message });
                }
            } else {
                try {
                    gio.cp(data.source, data.destination, 0);
                    parentPort.postMessage({ cmd: 'copy_done', destination: data.destination });
                } catch (err) {
                    parentPort.postMessage({ cmd: 'msg', msg: err.message });
                }
            }
            break;
        }

        case 'cp_template': {
            if (gio.exists(data.destination)) {
                //  todo: implement file cp with copy appended
                // try {
                //     gio.cp(data.source, data.destination, data.overwrite_flag);
                //     parentPort.postMessage({cmd: 'copy_template_done', destination: data.destination});
                // } catch (err) {
                //     parentPort.postMessage({cmd: 'msg', msg: err.message});
                // }
            } else {
                try {
                    gio.cp(data.source, data.destination, 0);
                    parentPort.postMessage({ cmd: 'cp_template_done', destination: data.destination });
                } catch (err) {
                    parentPort.postMessage({ cmd: 'msg', msg: err.message });
                }
            }
            break;
        }

        // Delete Confirmed
        case 'delete_confirmed': {

            let idx = 0;
            let data_arr = data.files_arr
            let del_arr = [];

            progress_id += 1;

            // show getting files message
            let msg = {
                cmd: 'msg',
                msg: `<img src="assets/icons/spinner.gif" style="width: 12px; height: 12px" alt="loading" />   Getting files for delete operation...`,
                has_timeout: 0
            }
            parentPort.postMessage(msg);

            // recursive function to get files array
            function get_next() {

                if (idx === data_arr.length) {
                    return;
                }

                let del_item = data_arr[idx];
                idx++

                let is_dir = gio.is_dir(del_item);
                if (is_dir) {
                    get_files_arr(del_item, del_item, (err, dirents) => {

                        if (err) {
                            console.log(err);
                            return;
                        }
                        let cpc = 0;

                        for (let i = 0; i < dirents.length; i++) {

                            // short cut
                            let f = dirents[i];

                            if (f.type == 'directory') {
                                cpc++
                                // copy_arr.push({ source: f.source, destination: f.destination, is_dir: 1})
                                del_arr.push({source: f.source, is_dir: 1})
                            } else {
                                cpc++
                                // copy_arr.push({ source: f.source, destination: f.destination, is_dir: 0})
                                del_arr.push({source: f.source, is_dir: 0})
                            }

                        }

                        if (cpc === dirents.length) {
                            get_next();
                        }

                    })
                } else {

                    if (del_item.size) {
                        max += del_item.size;
                    }

                    // add to copy array
                    del_arr.push({ source: del_item, is_dir: 0})
                    get_next();
                }

            }

            // start recursive function
            get_next();

            // Sort directories
            del_arr.sort((a, b) => {
                return b.source.length - a.source.length;
            })

            // clear message
            msg = {
                cmd: 'msg',
                msg: '',
            }
            parentPort.postMessage(msg);

            // delete files
            let progress_data;
            for (let i = 0; i < del_arr.length; i++) {

                let f = del_arr[i];
                // try {
                gio.rm(f.source)
                // } catch (err) {
                    // console.log(err)
                // }

                progress_data = {
                    id: data.id,
                    cmd: 'progress',
                    msg: `Deleted File ${i} of ${del_arr.length}`,
                    max: del_arr.length,
                    value: i
                }
                parentPort.postMessage(progress_data)

            }

            progress_data = {
                id: data.id,
                cmd: 'progress',
                msg: ``,
                max: 0,
                value: 0
            }
            parentPort.postMessage(progress_data);

            del_arr = [];

            break;

        }

        case 'paste_recursive': {

            console.log('running paste_recursive')
            fileOperation.paste_recursive(data);

            // let idx = 0;
            // let bytes_copied0 = 0;
            // let bytes_copied = 0;
            // let max = 0;
            // let copy_arr = [];
            // let data_arr = data.copy_arr;
            // // let destination = data.destination
            // let progress_id = Math.floor(Math.random() * 100);

            // let msg = {
            //     cmd: 'msg',
            //     msg: `<img src="assets/icons/spinner.gif" style="width: 12px; height: 12px" alt="loading" />   Getting files for copy operation...`,
            //     has_timeout: 0
            // }
            // parentPort.postMessage(msg);

            // if (data_arr.length > 0) {

            //     for (let i = 0; i < data_arr.length; i++) {

            //         let f = gio.get_file(data_arr[i].source);
            //         f.destination = data_arr[i].destination;

            //         // process directory
            //         if (f.is_dir) {

            //             function get_next() {

            //                 if (idx === data_arr.length) {
            //                     return;
            //                 }

            //                 let copy_item = data_arr[idx];
            //                 idx++

            //                 let is_dir = f.is_dir;
            //                 if (is_dir) {

            //                     get_files_arr(copy_item.source, copy_item.destination, (err, dirents) => {

            //                         if (err) {
            //                             console.log(err);
            //                             return;
            //                         }
            //                         let cpc = 0;

            //                         for (let i = 0; i < dirents.length; i++) {

            //                             // short cut
            //                             let f = dirents[i];

            //                             // sanitize file name
            //                             f.destination = f.destination.replaceAll(':', '_');

            //                             // calculate max
            //                             if (f.size) {
            //                                 max += f.size;
            //                             }

            //                             if (f.type == 'directory') {
            //                                 cpc++
            //                                 copy_arr.push({ source: f.source, destination: f.destination, is_dir: 1})
            //                             } else {
            //                                 cpc++
            //                                 copy_arr.push({ source: f.source, destination: f.destination, is_dir: 0})
            //                             }

            //                         }

            //                         if (cpc === dirents.length) {
            //                             get_next();
            //                         }

            //                     })

            //                 } else {

            //                     if (copy_item.size) {
            //                         max += copy_item.size;
            //                     }

            //                     // sanitize file name
            //                     copy_item.destination = copy_item.destination.replaceAll(':', '_');

            //                     // add to copy array
            //                     copy_arr.push({ source: copy_item.source, destination: copy_item.destination, is_dir: 0})

            //                 }

            //             }

            //             get_next();

            //         // process files
            //         } else {

            //             if (f.size) {
            //                 max += f.size;
            //             }

            //             if (f.href === f.destination) {

            //                 // todo: this needs work
            //                 while (f.href === f.destination) {

            //                     // let file = gio.get_file(destination);
            //                     let ext = path.extname(f.destination);
            //                     let base = path.basename(f.destination, ext);
            //                     let dir = path.dirname(f.destination);

            //                     let new_base = base + ' (Copy)';
            //                     f.destination = path.join(dir, new_base + ext);

            //                 }

            //             }

            //             // sanitize file name
            //             f.destination = f.destination.replaceAll(':', '_');

            //             // add to copy array
            //             copy_arr.push({ source: f.href, destination: f.destination, is_dir: 0})


            //             let file = f;
            //             file.display_name = path.basename(f.destination);
            //             file.name = path.basename(f.destination);
            //             file.href = f.destination;

            //             let file_data = {
            //                 cmd: 'file_data',
            //                 file_data: file
            //             }
            //             parentPort.postMessage(file_data);


            //         }

            //     }

            // }

            // // sort so we create all the directories first
            // copy_arr.sort((a, b) => {
            //     return a.source.length - b.source.length;
            // })

            // // clear message
            // msg = {
            //     cmd: 'msg',
            //     msg: '',
            // }
            // parentPort.postMessage(msg);

            // // copy files
            // for (let i = 0; i < copy_arr.length; i++) {

            //     let f = copy_arr[i];
            //     try {

            //         if (f.is_dir) {
            //             gio.mkdir(f.destination)
            //         } else {

            //             gio.cp_async(f.source, f.destination, (err, res) => {

            //                 if (err) {
            //                     console.log('error', err, f.source, f.destination);
            //                     return;
            //                 }

            //                 // const current_time = Date.now();
            //                 bytes_copied0 = bytes_copied;

            //                 if (res.bytes_copied > 0) {
            //                     bytes_copied += parseInt(res.bytes_copied);
            //                 }

            //                 // update progress
            //                 let progress_data = {
            //                     id: progress_id,
            //                     cmd: 'progress',
            //                     msg: `Copying`,  // ${path.basename(f.source)}`,
            //                     max: max,
            //                     value: bytes_copied
            //                 }
            //                 parentPort.postMessage(progress_data);

            //                 // console.log('bytes_copied', bytes_copied, max);
            //                 // File Copy done
            //                 if (bytes_copied >= max && bytes_copied > 0) {

            //                     let progress_done = {
            //                         id: progress_id,
            //                         cmd: 'progress',
            //                         msg: '',
            //                         max: 0,
            //                         value: 0
            //                     }
            //                     parentPort.postMessage(progress_done);
            //                     bytes_copied = 0;

            //                     let copy_done = {
            //                         cmd: 'copy_done',
            //                         destination: f.destination
            //                     }
            //                     parentPort.postMessage(copy_done);

            //                     max = 0;

            //                 }

            //             })

            //         }

            //     } catch (err) {
            //         console.log(err);
            //         return;
            //     }

            // }

            // clearInterval(interval);

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

        case 'cp_cancel': {
            cancel_data.cancel = 1;
            cancel_data.href = data.href;
            break;
        }

        // Compress Files
        case 'compress': {

            let location = data.location;
            let type = data.type;
            let size = data.size;
            let selected_files_arr = data.files_arr;
            let progress_id = data.id;

            let c = 0;
            let cmd = '';
            let file_list = selected_files_arr.map(item => `'${path.basename(item)}'`).join(' ');

            // Create command for compressed file
            let destination = path.basename(selected_files_arr[0]);
            selected_files_arr = [];

            let watcher;
            let setinterval_id;

            if (type === 'zip') {

                destination = destination.substring(0, destination.length - path.extname(destination).length) + '.zip';
                cmd = `cd '${location}'; zip -r -q '${destination}' ${file_list}`;

                // Watch for temporary files created by zip
                let tmpFileNamePattern = /zi\w+/;
                let tmpFilePath;
                watcher = fs.watch(location, (eventType, filename) => {
                    if (eventType === 'rename' && tmpFileNamePattern.test(filename)) {
                        tmpFilePath = path.join(location, filename);
                    }
                });

                setinterval_id = setInterval(() => {
                    fs.stat(tmpFilePath, (err, stats) => {
                        if (!err) {

                            let progress_data = {
                                id: progress_id,
                                cmd: 'progress',
                                msg: `Compressing "${path.basename(file_path)}"`,
                                max: Math.round(parseInt(size)),
                                value: stats.size
                            }
                            parentPort.postMessage(progress_data);

                        }

                    });

                }, 1000);

            } else {

                destination = destination.substring(0, destination.length - path.extname(destination).length) + '.tar.gz';
                cmd = `cd '${location}'; tar czf '${destination}' ${file_list}`;

                const compressionRatio = 0.5;
                setinterval_id = setInterval(() => {
                    let file = gio.get_file(file_path);
                    if (file) {
                        let progress_opts = {
                            id: progress_id,
                            cmd: 'progress',
                            value: file.size,
                            max: Math.round(parseInt(size) * compressionRatio),
                            msg: `Compressing "${path.basename(file_path)}"`
                        }
                        parentPort.postMessage(progress_opts);

                        if (file.size >= Math.round(parseInt(size) * compressionRatio)) {

                            clearInterval(setinterval_id);

                            let compress_done = {
                                cmd: 'compress_done',
                                id: progress_id,
                                file_path: file_path,
                            }
                            parentPort.postMessage(compress_done);
                            size = 0;
                            c = 0;

                        }

                    } else {
                        let msg = {
                            cmd: 'msg',
                            msg: `Error: File ${file_path} not found`
                        }
                        parentPort.postMessage(msg);
                    }

                }, 1000);

            }

            let file_path = path.format({ dir: location, base: destination });

            let msg = {
                cmd: 'msg',
                msg: `Compressing "${path.basename(file_path)}"`,
                has_timeout: 0
            }
            parentPort.postMessage(msg);

            // execute cmd
            let process = exec(cmd);

            // listen for data
            process.stdout.on('data', (data) => {
                console.log(data);
            });

            // listen for errors
            process.stderr.on('data', (data) => {

                clearInterval(setinterval_id);
                watcher.close();

                let msg = {
                    cmd: 'msg',
                    msg: data
                }

                parentPort.postMessage(msg);

            })

            // listen for process exit
            process.on('close', (code) => {

                clearInterval(setinterval_id);
                watcher.close();

                let compress_done = {
                    cmd: 'compress_done',
                    id: progress_id,
                    file_path: file_path,
                }
                parentPort.postMessage(compress_done);
                size = 0;
                c = 0;

            });

            break;
        }

        // Extract
        case 'extract': {

            // console.log('running extract')

            let location = data.location;
            // let selected_files_arr = data.files_arr;
            let progress_id = data.id;
            let source = data.source; //selected_files_arr[i];
            let ext = '' //path.extname(source).toLowerCase();

            let cmd = '';
            let filename = '';
            let make_dir = 1;

            let c = 0;

            switch (true) {
                case source.indexOf('.zip') > -1:
                    filename = source.replace('.zip', '')
                    c = 0
                    while (gio.exists(filename) && c < 5) {
                        filename = filename + ' Copy'
                        ++c;
                    }
                    cmd = "unzip '" + source + "' -d '" + filename + "'"
                    break;
                case source.indexOf('.tar.gz') > -1:
                    filename = source.replace('.tar.gz', '')
                    c = 0
                    while (gio.exists(filename) && c < 5) {
                        filename = filename + ' Copy'
                        ++c;
                    }
                    cmd = `cd "${location}"; /usr/bin/tar -xzf "${source}" -C "${filename}"`;
                    break;
                case source.indexOf('.tar') > -1:
                    filename = source.replace('.tar', '')
                    c = 0
                    while (gio.exists(filename) && c < 5) {
                        filename = filename + ' Copy'
                        ++c;
                    }
                    cmd = 'cd "' + location + '"; /usr/bin/tar --strip-components=1 -xzf "' + source + '"'
                    break;
                case source.indexOf('.gz') > -1:
                    filename = source.replace('.gz', '')
                    c = 0
                    while (gio.exists(filename) && c < 5) {
                        filename = filename + ' Copy'
                        ++c;
                    }
                    cmd = `cd "${location}"; /usr/bin/gunzip -d -k "${source}"` // | tar -x -C ${filename}"`;
                    make_dir = 0;
                    break;
                case source.indexOf('.xz') > -1:
                    filename = source.replace('tar.xz', '')
                    filename = filename.replace('.img.xz', '')
                    c = 0
                    while (gio.exists(filename) && c < 5) {
                        filename = filename + ' Copy'
                        ++c;
                    }
                    if (source.indexOf('img.xz') > -1) {
                        make_dir = 0;
                        cmd = 'cd "' + location + '"; /usr/bin/unxz -k "' + source + '"';
                    } else {
                        cmd = 'cd "' + location + '"; /usr/bin/tar -xf "' + source + '" -C "' + filename + '"';
                    }
                    break;
                case source.indexOf('.bz2') > -1:
                    ext = '.bz2';
                    filename = source.replace('.bz2', '')
                    c = 0
                    while (gio.exists(filename) && c < 5) {
                        filename = filename + ' Copy'
                        ++c;
                    }
                    cmd = 'cd "' + location + '"; /usr/bin/bzip2 -dk "' + source + '"'
                    break;
            }

            if (make_dir) {
                gio.mkdir(filename)
                // fs.mkdirSync(filename);
            }

            // GET UNCOMPRESSED SIZE
            // win.send('msg', `Calculating uncompressed size of ${path.basename(source)}`, 0);
            // let setinterval_id = 0;
            let file = gio.get_file(source)
            let ratio = 0.5;
            let max = (parseInt(file.size / 1024) / ratio);
            let current_size = 0;

            let setinterval_id = setInterval(() => {

                current_size = parseInt(execSync(`du -s '${filename}' | awk '{print $1}'`).toString().replaceAll(',', ''))
                // console.log(current_size, filename)
                let progress_opts = {
                    id: progress_id,
                    cmd: 'progress',
                    value: (current_size),
                    max: max,
                    msg: `Extracting "${path.basename(filename)}"`
                }
                parentPort.postMessage(progress_opts);

            }, 1000);

            // THIS NEEDS WORK. CHECK IF DIRECTORY EXIST. NEED OPTION TO OVERWRITE
            exec(cmd, { maxBuffer: Number.MAX_SAFE_INTEGER }, (err, stdout, stderr) => {
                // execSync(cmd, { maxBuffer: Number.MAX_SAFE_INTEGER })

                if (err) {

                    let msg = {
                        cmd: 'msg',
                        msg: err.message
                    }
                    parentPort.postMessage(msg);
                    gio.rm(filename);
                    clearInterval(setinterval_id);
                    return;
                }

                console.log('done extracting files');

                clearInterval(setinterval_id);
                let extract_done = {
                    id: progress_id,
                    cmd: 'extract_done',
                    source: source,
                    destination: filename
                }
                parentPort.postMessage(extract_done);
                // clearInterval(setinterval_id);

            })

            break;
        }

        // Properties
        case 'properties': {
            let properties_arr = [];
            if (data.selected_files_arr.length > 0) {
                data.selected_files_arr.forEach(item => {
                    let properties = gio.get_file(item);
                    // console.log(properties);
                    properties_arr.push(properties);
                })
            } else {
                let properties = gio.get_file(location);
                properties_arr.push(properties);
            }
            let cmd = {
                cmd: 'properties',
                properties_arr: properties_arr
            }
            parentPort.postMessage(cmd);

            break;
        }

        case 'get_devices': {

            try {

                gio.get_drives((err, data_arr) => {
                    if (err) {
                        console.log('error getting drives', err);
                        return;
                    }
                    let filter_arr = data_arr.filter(x => x.name != 'mtp')
                    for (let i = 0; i < filter_arr.length; i++) {
                        try {
                            // remove file://
                            if (filter_arr[i].path.indexOf('file://') > -1) {
                                filter_arr[i].path = filter_arr[i].path.replace('file://', '');
                                let cmd = `df "${filter_arr[i].path}"`;
                                let size = execSync(cmd).toString().split('\n')[1].split(' ').filter(x => x !== '').slice(1, 4).join(' ');
                                filter_arr[i].size_total = size.split(' ')[0];
                                filter_arr[i].size_used = size.split(' ')[1];
                            }
                        } catch (err) {
                            console.log('');
                        }
                    }

                    let cmd = {
                        cmd: 'devices',
                        devices: filter_arr
                    }
                    parentPort.postMessage(cmd);
                })

                // gio.get_mounts((err, device_arr) => {
                //     console.log(device_arr)
                //     if (err) {
                //         console.log(err);
                //         return;
                //     }
                //     let filter_arr = device_arr.filter(x => x.name != 'mtp')
                //     for (let i = 0; i < filter_arr.length; i++) {
                //         try {
                //             let cmd = `df "${filter_arr[i].path}"`;
                //             let size = execSync(cmd).toString().split('\n')[1].split(' ').filter(x => x !== '').slice(1, 4).join(' ');
                //             filter_arr[i].size_total = size.split(' ')[0];
                //             filter_arr[i].size_used = size.split(' ')[1];
                //         } catch(err) {
                //             // console.log(err);
                //         }
                //     }
                //     let cmd ={
                //         cmd: 'devices',
                //         devices: filter_arr
                //     }
                //     parentPort.postMessage(cmd);
                //     console.log(devices);
                // })
                // let device_arr = gio.get_mounts();
                // let filter_arr = device_arr.filter(x => x.name != 'mtp')
                // // console.log('filter_arr', filter_arr);
                // for (let i = 0; i < filter_arr.length; i++) {
                //     // if (filter_arr[i].root === '') {
                //         try {
                //             let cmd = `df "${filter_arr[i].path}"`;
                //             let size = execSync(cmd).toString().split('\n')[1].split(' ').filter(x => x !== '').slice(1, 4).join(' ');
                //             filter_arr[i].size_total = size.split(' ')[0];
                //             filter_arr[i].size_used = size.split(' ')[1];
                //         } catch(err) {
                //             // console.log(err);
                //         }
                //     // }
                // }
                // let cmd ={
                //     cmd: 'devices',
                //     devices: filter_arr
                // }
                // parentPort.postMessage(cmd);

            } catch (err) {
                console.log(err);
                return;
            }

            break;
        }

        case 'connect_network': {
            let network_settings = data.network_settings; //networkManager.getNetworkSettings();
            if (network_settings.length > 0) {
                network_settings.forEach(cmd => {

                    const mount_data = execSync('mount').toString();
                    if (cmd.mount_point.endsWith('/')) {
                        cmd.mount_point = cmd.mount_point.slice(0, -1);
                    }
                    let is_mounted = mount_data.includes(cmd.server);

                    if (is_mounted == '') {

                        if (cmd.type.toLocaleLowerCase() === 'sshfs') {
                            let sshfs_cmd = `sshfs ${cmd.username}@${cmd.server}:/ ${cmd.mount_point}`;
                            try {
                                execSync(sshfs_cmd);
                                let msg = {
                                    cmd: 'msg_connection',
                                    msg: `Connected to ${cmd.server}`,
                                    error: 0
                                }
                                parentPort.postMessage(msg);

                                if (cmd.save_connection) {
                                    let connection_cmd = {
                                        cmd: 'save_connection',
                                        network_settings: cmd
                                    }
                                    parentPort.postMessage(connection_cmd);
                                }

                            } catch (err) {
                                let connection_err = {
                                    cmd: 'connection_error',
                                    msg: err.message,
                                    error: 1
                                }
                                parentPort.postMessage(connection_err);
                                console.log(err.message);
                            }
                        } else {
                            try {

                                // gio.connect_network_drive(cmd.server, cmd.username, cmd.password, cmd.use_ssh_key, cmd.type, (err, data) => {
                                //     if (err) {
                                //         let connection_err = {
                                //             cmd: 'connection_error',
                                //             msg: err.message,
                                //             error: 1
                                //         }
                                //         parentPort.postMessage(connection_err);
                                //         console.log(err.message);
                                //         return;
                                //     }
                                //     let msg = {
                                //         cmd: 'msg_connection',
                                //         msg: `Connected to ${cmd.server}`,
                                //         error: 0
                                //     }
                                //     parentPort.postMessage(msg);

                                //     if (cmd.save_connection) {

                                //         let connection_cmd = {
                                //             cmd: 'save_connection',
                                //             network_settings: cmd
                                //         }
                                //         parentPort.postMessage(connection_cmd);
                                //     }
                                // });

                                // create a mount command using gio mount
                                let mount_cmd = `gio mount ssh://${cmd.username}@${cmd.server}`;
                                execSync(mount_cmd);

                                let msg = {
                                    cmd: 'msg_connection',
                                    msg: `Connected to ${cmd.server}`,
                                    error: 0
                                }
                                parentPort.postMessage(msg);




                            } catch (err) {
                                let connection_err = {
                                    cmd: 'connection_error',
                                    msg: err.message,
                                    error: 1
                                }
                                parentPort.postMessage(connection_err);
                                console.log(err.message);
                            }
                        }
                    }

                })
            }

            break;
        }

    }

})
