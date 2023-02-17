const { modifyMiniWebpackChain } = require('./webpack.mini')

try {
  const configSchema = require('@tarojs/cli/dist/doctor/configSchema')
  const Joi = require('joi')

  configSchema.default.$_terms.keys.forEach(term => {
      if (term.key === 'framework') {
          term.schema = Joi.any().valid('nerv', 'react', 'preact', 'vue', 'vue3', 'solid').required()
      }
  })
} catch {
  // ignore
}

module.exports = ctx => {
    const { framework } = ctx.initialConfig
    if (framework !== 'solid') {
      console.error("framework field should be solid")
      return
    }

    ctx.modifyWebpackChain(({ chain }) => {
        chain
            .plugin('definePlugin')
            .tap(args => {
                const config = args[0]
                config.__TARO_FRAMEWORK__ = `"${framework}"`
                return args
            })

        if (process.env.TARO_ENV === 'h5') {
            console.error("not support h5 yet, please process compilation by yourself")
        } else {
            modifyMiniWebpackChain(chain)
        }
    })

    ctx.modifyRunnerOpts(({ opts }) => {
        if (!opts.compiler) {
            return
        }

        if (typeof opts.compiler === 'string') {
          opts.compiler = {
            type: opts.compiler
          }
        }

        const { compiler } = opts

        if (compiler.type === 'webpack5') {
            compiler.prebundle ||= {}
            const prebundleOptions = compiler.prebundle
            prebundleOptions.include ||= []
            prebundleOptions.exclude ||= []

            // TODO：暂时关闭 prebundle
            prebundleOptions.enable = false
            if (prebundleOptions.enable === false) {
                return
            }

            prebundleOptions.esbuild ||= {}
            const esbuildConfig = prebundleOptions.esbuild
            esbuildConfig.plugins ||= []
        }
    })
}
