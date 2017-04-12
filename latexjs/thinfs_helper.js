var process = require('process')
var http = require('http')
var fs = require('fs')
var path = require('path')
var crypto = require('crypto')

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


function download(url, dest, sha256) {
    console.log('  Downloading:')
    console.log('  ' + url + ' => ' + dest)
    if (sha256) {
        console.log('  SHA256 checksum: ' + sha256)
    }

    var destDir = path.dirname(dest)
    if (!fs.existsSync(path.dirname(dest))) {
        console.log('  Creating ' + destDir)
        mkdir(destDir)
    }
    if (sha256 !== undefined) {
        var hash = crypto.createHash('sha256')
    }
    var file = fs.createWriteStream(dest)

    var request = http.get(url, function (response) {

        var totalLength = response.headers['content-length']
        var processedLength = 0
        
        response.pipe(file)

        file.on('finish', function () {
            console.log('')
            if (sha256 !== undefined && sha256 !== hash.digest('hex')) {
                console.log('  ERROR - checksum does not match:')
                console.log('    Expected: ' + sha256)
                console.log('      Actual: ' + hash.digest('hex'))
                console.log('  Clearing up compromised file...')
                fs.unlinkSync(dest)
                console.log('  Exiting with failure code (1)')
                process.exit(1)
            }
            file.close(function (err) {
                if (err) {
                    console.log('  Error closing file: ' + err)
                    console.log('  Exiting with failure code (1)')
                    process.exit(1)
                } else {
                    console.log('  Download finished successfully ' + ((sha256 !== undefined) ? '(checksum validated).' : '(no checksum).'))
                    process.exit(0)
                }
            })
        })

        response.on('data', function(d) {
            processedLength += d.byteLength
            var prop = processedLength / totalLength
            var pc = Math.round(prop * 100)
            process.stdout.write('    ...downloading: ' + pc + '%\r')
            if (sha256 !== undefined) {
                hash.update(d)
            }
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
if (process.argv.length >= 5) {
    SHA256 = process.argv[4]
}
else {
    SHA256 = undefined
}
download(URL, DEST, SHA256)

