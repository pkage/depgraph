#! /usr/bin/env node
const dg    = require('./src/depgraph')
const track = require('./src/track')
const path  = require('path')
const fs    = require('fs')
const yargs = require('yargs')

const output = (data, dest) => {
    if (dest !== '-') {
        fs.writeFileSync(dest, data)
    } else {
        console.log(data)
    }
}

yargs
    .command('graph <root>',
        'Graph the project',
        (desc) => {
            desc.positional('root', {
                describe: 'project root'
            })
        },
        (argv) => {
            // create graph
            const graph = dg(path.resolve(process.cwd(), argv.root))
            output(JSON.stringify(graph), argv.output)

        })
    .command('describe <file>',
        'Show all classes and associated methods in a file',
        (desc) => {
            desc.positional('file', {
                describe: 'file to track functions from'
            })
        },
        (argv) => {
            const desc = track.showFunctions(path.resolve(process.cwd(), argv.file))
            output(JSON.stringify(desc), argv.output)
            
        })
    .command('track <file> <root>',
        'Show what functions from a file are used throughout the project',
        (desc) => {
            desc.positional('file', {
                describe: 'file to track functions from'
            })
            desc.positional('root', {
                describe: 'project root'
            })
            desc.option('internal', {
                default: false,
                describe: 'search for internal uses as well'
            })
        },
        (argv) => {
            const usage = track.trackFileUsage(
                path.resolve(process.cwd(), argv.root),
                path.resolve(process.cwd(), argv.file),
                argv.internal
            )
            output(JSON.stringify(usage), argv.output)
        })
    .option('output', {
        alias: 'o',
        describe: 'file to output to, omit or \'-\' for stdout',
        default: '-'
    })
    .demandCommand()
    .recommendCommands()
    .argv
