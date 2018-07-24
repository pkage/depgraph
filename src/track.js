const esprima  = require('esprima')
const fs       = require('graceful-fs')
const path     = require('path')
const depgraph = require('./depgraph')
const common   = require('./common')

// extractNodes and extractParentNodes ported from Python

/**
 * Extract a list of nodes matching a test
 *
 * @param node root node
 * @param test function containing test
 * @returns a list of file nodes
 */
const extractNodes = (node, test) => {
    // local case
    let out = test(node) ? [node] : []

    if (!('deps' in node)) {
        // we've bottomed out
        return out
    }

    // recursive step
    for (let dep of node.deps) {
        out = out.concat(extractNodes(dep, test))
    }

    return out
}


/**
 * Extract a list of nodes whose direct children match a test
 *
 * @param node root node
 * @param test function containing test
 * @returns a list of file nodes
 */
const extractParentNodes = (node, test) => {
    // if there are no deps, we can't possibly match
    if (!('deps' in node)) {
        return []
    }

    // scan children
    let matched = false
    for (let dep of node.deps) {
        if (test(dep)) {
            matched = true
        }
    }

    // if we've matched then return the node later
    let out = matched ? [node] : []

    // recurse again
    for (let dep of node.deps) {
        out = out.concat(extractParentNodes(dep, test))
    }

    return out
}

/**
 * Extract the list of files on that depend on a file
 * @param root depgraph tree root
 * @param file path of tracked file
 * @returns a flat array of file nodes that depend on a file
 */
const extractDependents = (root, file) => {
    const filename = path.basename(file, '.js')
    return extractParentNodes(root, n => n.path.indexOf(filename) != -1)
}

/**
 * Parse a module, returning an Esprima parse tree
 * @param filename path to file to load
 * @returns parse tree
 */
const parseModule = (filename) => {
    const file = common.getStrFromFile(filename)
    return esprima.parseModule(file.str, {jsx: true})
}

/**
 * Extract a list of nodes that match a condition
 * @param node root node of esprima parse tree
 * @param test test condition
 */
const extractNodeTypes = (node, test) => {
    // bounce
    if ((typeof node !== 'object') || (node === null)) {
        return []
    }

    // return if we match
    let out = test(node) ? [node] : [] 

    // do some hack stuff to really recurse here
    for (let key in node) {
        out = out.concat(extractNodeTypes(node[key], test))
    }

    return out
}

/**
 * Extract a list of class declarations in a tree
 * @param node root node of esprima parse tree
 * @returns a flat list of class definitions
 */
const extractDefinedClasses = (node) => {
    return extractNodeTypes(node, n => n.type === 'ClassDeclaration')
}


/**
 * Extract a list of functions from all classes in a tree
 * @param node root node of esprima parse tree
 * @returns a flat list of method definitions
 */
const extractDefinedMethods = (node) => {
    return extractNodeTypes(node, n => n.type === 'MethodDefinition')
}


/**
 * Pretty print a list of classes / definitions
 * @param filename file to load from
 * @returns a dict of classes with an array of methods
 */
const showFunctions = (filename) => {
    const tree = parseModule(filename)
    const classes = extractDefinedClasses(tree)
    const out = {}
    
    for (let c of classes) {
        out[c.id.name] = []
        let methods = extractDefinedMethods(c)
        for (let m of methods) {
            out[c.id.name].push({
                name: m.key.name,
                params: m.value.params.map(p => p.name)
            })
        }
    }

    return out
}

/**
 * Check if a function call matches a function definition
 * @param def function definition
 * @param call function call
 */
const checkFunctionMatch = (def, call) => {
    try {
        return (call.callee.type === 'MemberExpression'
             && call.callee.property.name === def.key.name)
    } catch (e) {
        return false
    }
}

/**
 * Search for call expressions matching any of a list of expressions
 * @param node file node of search
 * @param fns  list of functions to search for
 * @returns an object of each hit
 */
const searchForFunctionCalls = (node, fns) => {
    // get all call expressions
    const calls = extractNodeTypes(node, n => n.type === 'CallExpression')

    // simple "have we seen it" count
    const matches = {}
    for (let call of calls) {
        for (let fn of fns) {
            if (checkFunctionMatch(fn, call)) {
                if (!(fn.key.name in matches)) {
                    matches[fn.key.name] = 1
                } else {
                    matches[fn.key.name]++
                }
            }
        }
    }

    return matches
}

/**
 * Track function calls from a single node in a full project tree
 * @param root root file with nodes
 * @param node target file with definitions
 * @returns an object with the files/number of calls in each row
 */
const trackFileUsage = (rootfile, nodefile) => {
    // load the module
    const root = depgraph(rootfile)
    const node = parseModule(nodefile)

    // get a list of nodes to search
    const searchNodes = extractDependents(root, nodefile)
    
    // get module class definitions
    const classes = extractDefinedClasses(node)

    // set up output
    const out = {}
    for (let c of classes) {
        out[c.id.name] = {}
        // kind of ugly, but for efficiency we're going to save
        // the extracted method definition nodes directly onto the class object
        // for easier iteration
        c._methods = extractDefinedMethods(c)

        for (let m of c._methods) {
            out[c.id.name][m.key.name] = []
        }
    }

    // perform the search 
    for (let c of classes) {
        for (let dep of searchNodes) {
            let depNode = parseModule(dep.path)
            // search in each node for each method on each class
            let result = searchForFunctionCalls(depNode, c._methods)
            for (let m of c._methods) {
                for (let key in result) {
                    // if the function is seen in that file, then save that
                    // we've seen it.
                    if (key === m.key.name && result[key] > 0) {
                        out[c.id.name][m.key.name].push({
                            file: dep,
                            count: result[key]
                        })
                    }
                }
            }
        }
    }

    return out
}

// TODO: eta reduce
//module.exports = (root, f) => trackFileUsage(root, f)

module.exports = {
    showFunctions,
    trackFileUsage
}
