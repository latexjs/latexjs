const glob = require("glob")
const fs = require("fs")

console.log("Finding all files and directories in texlive install...")

const stats = {}

const globber = new glob.Glob("/app/texlive/**", {
    cwd: '/app/texlive',
})

globber.on('match', path => {
    const stat = fs.lstatSync(path)
    stats[path] = stat
    if (stat.isSymbolicLink()) {
        stats[path].link_to = fs.readlinkSync(path)
    }
})

globber.on('end', () => {
    console.log('Finished finding files. Writing to disk...')
    fs.writeFileSync('raw_stats.json', JSON.stringify(stats))
    console.log('File saved to disk.')
})
