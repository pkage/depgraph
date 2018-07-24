const fs = require('graceful-fs')

const getStrFromFile = path => {
    try {
        return {
            path: path,
            str: fs.readFileSync(path).toString()
        }
    } catch (e) {
        return {
            path: path + '.js',
            str: fs.readFileSync(path + '.js').toString()
        }
    }
}

module.exports = {
    getStrFromFile
}
