var process = require('process')
var http = require('http')
var fs = require('fs')

function download(url, dest) {
    var file = fs.createWriteStream(dest)

    var request = http.get(url, function (response) {

        response.pipe(file)

        response.on('finish', function () {
            file.close(function (err) {
                if (err) {
                    process.exit(1)
                } else {
                    process.exit(0)
                }
            })
        })

        response.on('error', function () {
            file.close(function (err) {
                process.exit(1)
            })
        })

    })
}

var URL = process.argv[2]
var DEST = process.argv[3]
console.log(URL + ' => ' + DEST)
download(URL, DEST)
