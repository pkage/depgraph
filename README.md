# depgraph

## Purpose

Depgraph is a analysis toolkit for your codebase, intended to aid refactoring. It can create a dependency graph of your project, highlighting circular dependencies and cross dependencies as well as showing the usage of specific files in a project. Built with [esprima](https://esprima.org/) and [d3.js](https://d3js.org/).

## Getting started

```
$ git clone https://github.com/quadnix/depgraph && cd depgraph
$ npm i -g
```

## Usage

```
depgraph <command>

Commands:
  depgraph graph <root>         Graph the project
  depgraph describe <file>      Show all classes and associated methods in a
                                file
  depgraph track <file> <root>  Show what functions from a file are used
                                throughout the project

Options:
  --help        Show help                                              [boolean]
  --version     Show version number                                    [boolean]
  --output, -o  file to output to, omit or '-' for stdout         [default: "-"]
```

The core depgraph CLI spits out JSON, which you can then use to power your own visualizations. It also comes with a default visualizer for the graph (see below).

## File description

Simply spits out a text representation of a class:

```
$ depgraph describe Model/model.js
Model
        constructor(0)
        hasData(0)
        setActiveModel(1)
        getActiveModel(0)
        ...
```

## File usage tracking

This returns a JSON representation of the number of times a file is used.

```
$ depgraph track Controller/controller.js index.js
{
    "Controller": {
        "constructor": [],
        "setPanel": [
            {
                "file": {
                    "path": "/a/b/c/Panel.js",
                    "basename": "Panel.js",
                    "deps": [...]
                },
                "count": 2
            },
            ...
        ],
        ...
    }
}

```

## Dependency graphing


Depgraph's graph feature comes in two parts - a CLI and a visualization. The cli is very easy to use, and returns a tree of the import declarations of a project.

```
$ depgraph graph src/index.js
{
    "path": "/absolute/path/to/index.js",
    "basename": "index.js",
    "type": "file",
    "deps": [...]
}
```

Available node types:

Label | meaning
--- | ---
`file` | A regular project file
`asset` | A static asset (CSS, img, etc.)
`library` | A library file
`error` | An error node, indicating a parse error
`seen` | A regular project file, seen elsewhere in the project
`circular` | Like a `seen` node, except seen directly in the ancestry of that node

All nodes will have a `path` and `type` atttributes. A full table is available below:

Type | Available fields | Notes
--- | --- | ---
`file` | `path`, `type`, `basename`, `deps` | `deps` _is an array of nodes_
`asset` | `path`, `type`, `basename` | 
`library` | `path`, `type` | `path` _is the name of the library_
`error` | `path`, `type`, `error` | `error` _is the error message_
`seen` | `path`, `type`, `basename` | `path` _is the previously seen path_
`circular` | `path`, `type`, `basename` | `path` _is the previously seen path_


For the visualisation, copy (or symlink) the output to the root of the `viz/` folder, and name it `depgraph.json`. Then simply serve it behind an HTTP server. I like [this one](https://www.npmjs.com/package/http-server).


