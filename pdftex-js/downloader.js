var process = require('process')
var http = require('http')
var fs = require('fs')
var path = require('path')


function mkdir(dir, mode){
    try {
        fs.mkdirSync(dir, mode)
    }
    catch (e) {
        if(e.code === 'ENOENT'){
            mkdir(path.dirname(dir), mode)
            mkdir(dir, mode)
        } else {
            throw e
        }
    }
}


function download(url, dest) {
    console.log('  Downloading:')
    console.log('  ' + url + ' => ' + dest)

    var destDir = path.dirname(dest)
    if (!fs.existsSync(path.dirname(dest))) {
        console.log('  Creating ' + destDir)
        mkdir(destDir)
    }
    var file = fs.createWriteStream(dest)

    var request = http.get(url, function (response) {

        var totalLength = response.headers['content-length']
        var processedLength = 0
        
        response.pipe(file)

        file.on('finish', function () {
            file.close(function (err) {
                if (err) {
                    console.log('')
                    console.log('  Error closing file: ' + err)
                    console.log('  Exiting with failure code (1)')
                    process.exit(1)
                } else {
                    console.log('  Download finished successfully.')
                    process.exit(0)
                }
            })
        })

        response.on('data', function(d) {
            processedLength += d.byteLength
            var prop = processedLength / totalLength
            var pc = Math.round(prop * 100)
            process.stdout.write('    ...downloading: ' + pc + '%\r')
        })

        file.on('error', function (err) {
            console.log('  Error downloading file: ' + err)
            console.log('  Deleting corrupted file...')
            fs.unlinkSync(dest)
            console.log('  Exiting with failure code (1)')
            process.exit(1)
        })
    })
}

var URL = process.argv[2]
var DEST = process.argv[3]
download(URL, DEST)
