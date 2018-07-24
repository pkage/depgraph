const track = require('./src/track')
const depgraph = require('./src/depgraph')

module.exports = {
    depgraph,
    showFunctions: track.showFunctions,
    trackFileUsage: track.trackFileUsage
}
