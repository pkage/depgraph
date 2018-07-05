#! /usr/bin/env node
const dg = require('./depgraph')
const path = require('path')
const fs = require('fs')
const prog = require('commander')

prog
    .version('0.0.1')
    .option('-t, --target <file>', 'Root file of project')
    .option('-o, --output <file>', 'File to output to')
    .parse(process.argv)


if (prog.target === undefined) {
    throw new Error('Target file must be specified!')
}

if (prog.output === undefined) prog.output = '-'

const out = dg(path.resolve(process.cwd(), prog.target))

if (prog.output !== '-') {
    fs.writeFileSync(prog.output, JSON.stringify(out))
} else {
    console.log(JSON.stringify(out))
}
