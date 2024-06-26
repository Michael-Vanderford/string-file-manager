const { parentPort, workerData, isMainThread } = require('worker_threads');
const path = require('path');
const gio_utils = require('../utils/gio');
// const gio = require('node-gio');
const gio = require('../gio/build/Release/obj.target/gio')

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

parentPort.on('message', data => {

    if (data.cmd === 'find') {
        try {
            execPromise(data.find_cmd).then(res => {
                let arr = []
                res.forEach(item => {
                    try {
                        arr.push(gio.get_file(item));
                    } catch (err) {
                        win.send('msg', err);
                    }
                })

                let cmd = {
                    cmd: 'search_results',
                    results_arr: arr
                }
                parentPort.postMessage(cmd);

            }).catch(err => {
                parentPort.postMessage({cmd: 'msg', msg: err});
            })
            // return res;
            // win.send('search_results', res);
        } catch (err) {
            parentPort.postMessage({cmd: 'msg', msg: err});
            throw err;
        }
    }

})

// let file_arr1 = [];
// let cp_recursive = 0;
// function get_search_arr (source, search, depth, callback) {

//     cp_recursive++

//     if (path.basename(source).toLocaleLowerCase().indexOf(search) > -1) {
//         file_arr1.push(gio.get_file(source));
//     }

//     let dirs = source.split(path.sep)
//     let num_of_dirs = dirs.length
//     if (cp_recursive == 1) {
//         depth = (num_of_dirs + depth)
//     }

//     if (num_of_dirs <= depth) {
//         gio.ls(source, (err, dirents) => {
//             for (let i = 0; i < dirents.length; i++) {
//                 let file = dirents[i]
//                 parentPort.postMessage({cmd: 'msg', msg: `Searching...`});
//                 if (file.is_dir) {
//                     get_search_arr(file.href, search, depth, callback)
//                 } else {
//                     if (path.basename(file.href).toLocaleLowerCase().indexOf(search) > -1) {
//                         file_arr1.push(file)
//                     }
//                 }

//             }

//         })
//     }

//     if (--cp_recursive == 0) {
//         parentPort.postMessage({cmd: 'msg', msg: ``})

//         let file_arr2 = file_arr1;
//         file_arr1 = []
//         return callback(file_arr2);
//     }
// }

// // Handle Worker Messages
// parentPort.on('message', data => {

//     if (data.cmd === 'search') {
//         get_search_arr(data.location, data.search, data.depth, dirents => {
//             parentPort.postMessage({cmd: 'search_done', results_arr: dirents});
//         })
//     }

// })