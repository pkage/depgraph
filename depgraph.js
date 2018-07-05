const esprima = require('esprima')
const fs      = require('graceful-fs')
const path    = require('path')
const isValid = require('is-valid-path')

// finding depgraphs
// ImportDeclaration

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

const buildTree = (entry, seen=[], ancestry=[], depth = 0) => {
    if (!path.isAbsolute(entry)) {
        throw new Error(`path must be absolute!: ${entry}`)
    }

    // output object
    const out = {
        path: entry,
        basename: path.basename(entry),
        type: 'file'
    }

    // try reading the file, excepting errors
    let file = null
    try {
        file = getStrFromFile(entry)
        out.path = file.path
        out.basename = path.basename(out.path)
        file = esprima.parseModule(file.str, {jsx: true})
    } catch (e) {
        //console.warn(`errored at ${entry}`)
        out.type = 'error'
        out.error = e
        return out
    }

    // create the path and basename

    // create the output dep list
    out.deps = []

    // loop through all statements looking for imports
    for (let stmt of file.body) {
        if (stmt.type === 'ImportDeclaration') {
            // basic information already
            let fileinfo = {
                path: stmt.source.value
            }

            // bounce things that look like libraries
            if (stmt.source.value.indexOf(path.sep) === -1
                || stmt.source.value[0] !== '.'
                || !isValid(stmt.source.value)) {
                //console.log(`skipping ${stmt.source.value}`)
                fileinfo.type = 'library'
                out.deps.push(fileinfo)
                continue
            }

            fileinfo.basename = path.basename(fileinfo.path)

            // bounce assets
            if (path.extname(stmt.source.value) === '.css') {
                fileinfo.type = 'asset'
                out.deps.push(fileinfo)
                continue
            }

            // figure out the absolute path
            let inclpath = path.resolve(path.dirname(entry), stmt.source.value)
            fileinfo.path = inclpath

            // before we check if we've included that path,
            // check that it's not a dependency
            if (ancestry.includes(inclpath) || ancestry.includes(inclpath + '.js')) {
                console.warn(`circular depedency detected! ${inclpath}`)
                fileinfo.type = 'circular'
                out.deps.push(fileinfo)
                continue
            }

            // check if we've included that path already
            if (seen.includes(inclpath) || seen.includes(inclpath + '.js')) {
                console.warn(`seen dependency detected! ${inclpath}`)
                fileinfo.type = 'seen'
                out.deps.push(fileinfo)
                continue
            }

            seen.push(inclpath)

            // breadth-first recursion
            fileinfo.type = 'file'
            out.deps.push(fileinfo);
            
        }
    }

    // compute recursive elements
    ancestry.push(out.path)
    seen.push(out.path)
    out.deps = out.deps.map(d => {
        if (d.type !== 'file') {return d}

        return buildTree(
            d.path,
            seen,
            ancestry.slice(),
            depth + 1
        )
    })

    return out
}

module.exports = buildTree
