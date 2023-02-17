import {
  addLeadingSlash, Current, document, eventHandler,
  incrementId, safeExecute,
} from '@tarojs/runtime'

const getNativeCompId = incrementId()

function initNativeComponentEntry (Solidjs, SolidjsWeb) {
  const {onMount, createSignal} = Solidjs
  const {createComponent, render, For} = SolidjsWeb

  const NativeComponentWrapper = (props) => {
    const root = document.createElement('root')
    const ctx = props.getCtx()

    const originProps = ((ctx || {}).data ||= {}).props
    const signals = new Map()
    Object.keys(originProps).forEach((key) => {
      signals.set(key, createSignal(originProps[key]))
    })

    ctx.component = {
      update(newProps) {
        Object.entries(newProps).forEach(([key, value]) => {
          const signal = signals.get(key)
          if (signal && value !== signal[0]()) {
            signal[1](value)
          }
        })
      }
    }

    onMount(() => {
      root.ctx = ctx
      root.performUpdate(true)
    })

    const child = props.renderComponent(ctx, {
      get props() {
        const finalProps = {}
        for(const [key, signal] of signals.entries()) {
          finalProps[key] = signal[0]()
        }
        return finalProps
      }
    })

    render(() => child, root)

    return root
  }

  const Entry = () => {
    const [comps, setComps] = createSignal([])

    onMount(() => {
      Current.app = {
        mount(Component, compId, getCtx) {
          setComps([
            ...comps(),
            {
              compId,
              element: createComponent(NativeComponentWrapper, {
                getCtx,
                renderComponent (ctx, props) {
                  return createComponent(Component, props)
                }
              })
            }
          ])
        }
      }
    })

    return createComponent(For, {
      each: comps(),
      children: ({element}) => element
    })
  }


  const app = document.getElementById('app')

  render(() => createComponent(Entry, {}), app)
}

export function createNativeComponentConfig (Component, Solidjs, SolidjsWeb, componentConfig) {
  const componentObj = {
    options: componentConfig,
    properties: {
      props: {
        type: null,
        value: null,
        observer (_newVal, oldVal) {
          oldVal && this.component?.update(_newVal)
        }
      }
    },
    created () {
      if (!Current.app) {
        initNativeComponentEntry(Solidjs, SolidjsWeb)
      }
    },
    attached () {
      const compId = this.compId = getNativeCompId()
      setCurrent(compId)
      this.config = componentConfig
      Current.app.mount(Component, compId, () => this)
    },
    ready () {
      safeExecute(this.compId, 'onReady')
    },
    detached () {
      resetCurrent()
      Current.app.unmount(this.compId)
    },
    pageLifetimes: {
      show (options) {
        safeExecute(this.compId, 'onShow', options)
      },
      hide () {
        safeExecute(this.compId, 'onHide')
      }
    },
    methods: {
      eh: eventHandler,
      onLoad (options) {
        safeExecute(this.compId, 'onLoad', options)
      },
      onUnload () {
        safeExecute(this.compId, 'onUnload')
      }
    }
  }
  
  function resetCurrent () {
    // 小程序插件页面卸载之后返回到宿主页面时，需重置Current页面和路由。否则引发插件组件二次加载异常 fix:#11991
    Current.page = null
    Current.router = null
  }

  function setCurrent (compId) {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    if (Current.page === currentPage) return

    Current.page = currentPage

    const route = (currentPage).route || (currentPage).__route__
    const router = {
      params: currentPage.options || {},
      path: addLeadingSlash(route),
      $taroPath: compId,
      onReady: '',
      onHide: '',
      onShow: ''
    }
    Current.router = router

    if (!currentPage.options) {
      // 例如在微信小程序中，页面 options 的设置时机比组件 attached 慢
      Object.defineProperty(currentPage, 'options', {
        enumerable: true,
        configurable: true,
        get () {
          return this._optionsValue
        },
        set (value) {
          router.params = value
          this._optionsValue = value
        }
      })
    }
  }

  // onShareAppMessage 和 onShareTimeline 一样，会影响小程序右上方按钮的选项，因此不能默认注册。
  if (
    Component.onShareAppMessage ||
    Component.prototype?.onShareAppMessage ||
    Component.enableShareAppMessage
  ) {
    componentObj.methods.onShareAppMessage = function (options) {
      const target = options?.target
      if (target) {
        const id = target.id
        const element = document.getElementById(id)
        if (element) {
          target.dataset = element.dataset
        }
      }
      return safeExecute(this.compId, 'onShareAppMessage', options)
    }
  }
  if (
    Component.onShareTimeline ||
    Component.prototype?.onShareTimeline ||
    Component.enableShareTimeline
  ) {
    componentObj.methods.onShareTimeline = function () {
      return safeExecute(this.compId, 'onShareTimeline')
    }
  }

  return componentObj
}