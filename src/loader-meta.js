function getLoaderMeta() {
    return {
      importFrameworkStatement: `
        import * as Solid from 'solid-js'
        import * as SolidjsWeb from 'solid-js/web'
        `,
      mockAppStatement: '',
      frameworkArgs: 'Solid, SolidjsWeb, config',
      creator: 'createSolidApp',
      creatorLocation: 'taro-plugin-solid/src/runtime',
      importFrameworkName: '',
      isNeedRawLoader: true
    }
}

module.exports.getLoaderMeta = getLoaderMeta
