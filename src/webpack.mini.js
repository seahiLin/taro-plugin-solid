const { getLoaderMeta } = require('./loader-meta')

function modifyMiniWebpackChain(chain) {

    chain.plugin('miniPlugin')
        .tap(args => {
            args[0].loaderMeta = getLoaderMeta()
            return args
        })
}

exports.modifyMiniWebpackChain = modifyMiniWebpackChain
