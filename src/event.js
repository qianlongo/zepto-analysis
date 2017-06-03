//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

// 注意zepto是不写分号的，但是这个立即执行函数前面为什么要写一个分号呢？
// 其实是用来结束之前的语句，反之出错

; (function ($) {
  // 生成标志元素和回调函数的唯一id
  var _zid = 1,
    undefined,
    slice = Array.prototype.slice,
    isFunction = $.isFunction,
    isString = function (obj) { return typeof obj == 'string' },

    // 保存着应用程序中所有的handler
    /*
    {
      0: [
        {
          e: 'click', // 事件名称
          fn: function () {}, // 用户传入的回调函数
          i: 0, // 该对象在该数组中的索引
          ns: 'qianlongo', // 命名空间
          proxy: function () {}, // 真正给dom绑定事件时执行的事件处理程序， 为del或者fn
          sel: '.qianlongo', // 进行事件代理时传入的选择器
          del: function () {} // 事件代理函数
        },
        {
          e: 'click', // 事件名称
          fn: function () {}, // 用户传入的回调函数
          i: 1, // 该对象在该数组中的索引
          ns: 'qianlongo', // 命名空间
          proxy: function () {}, // 真正给dom绑定事件时执行的事件处理程序， 为del或者fn
          sel: '.qianlongo', // 进行事件代理时传入的选择器
          del: function () {} // 事件代理函数
        }
      ]
    }
    */

    handlers = {}, 
    specialEvents = {},
    focusinSupported = 'onfocusin' in window,
    focus = { focus: 'focusin', blur: 'focusout' },
    hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' }

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  // 取元素的标识符，有就直接读取，没有的话，先设置后读取

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function (handler) {
      return handler
        && (!event.e || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }

  // 解析注册事件时的字符串，将事件名和命名空间分离出来分别赋值给e和ns
  // 并且命名空间做了一下默认排序

  function parse(event) {
    var parts = ('' + event).split('.')
    return { e: parts[0], ns: parts.slice(1).sort().join(' ') }
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eventCapture(handler, captureSetting) {
    return handler.del &&
      (!focusinSupported && (handler.e in focus)) ||
      !!captureSetting
  }

  function realEvent(type) {
    return hover[type] || (focusinSupported && focus[type]) || type
  }

  // 注册事件的关键函数
  // element   =>   要监听的元素
  // events    =>   要注册的事件列表
  // fn        =>   事件处理程序
  // data      =>   附加的数据对象
  // selector  =>   进行事件委托时实际要监听的元素的选择器
  // delegator =>   事件委托函数
  // capture   =>   事件捕获 or 非事件捕获

  function add(element, events, fn, data, selector, delegator, capture) {
    // 为每个元素的事件分配一个唯一的id
    var id = zid(element), 
        set = (handlers[id] || (handlers[id] = []))

    events.split(/\s/).forEach(function (event) {
      if (event == 'ready') return $(document).ready(fn)
      var handler = parse(event)
      handler.fn = fn
      handler.sel = selector
      // emulate mouseenter, mouseleave
      if (handler.e in hover) fn = function (e) {
        var related = e.relatedTarget
        if (!related || (related !== this && !$.contains(this, related)))
          return handler.fn.apply(this, arguments)
      }
      handler.del = delegator
      var callback = delegator || fn
      handler.proxy = function (e) {
        e = compatible(e)
        if (e.isImmediatePropagationStopped()) return
        e.data = data
        var result = callback.apply(element, e._args == undefined ? [e] : [e].concat(e._args))
        if (result === false) e.preventDefault(), e.stopPropagation()
        return result
      }
      handler.i = set.length
      set.push(handler)
      if ('addEventListener' in element)
        element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
    })
  }
  function remove(element, events, fn, selector, capture) {
    var id = zid(element)
      ; (events || '').split(/\s/).forEach(function (event) {
        findHandlers(element, event, fn, selector).forEach(function (handler) {
          delete handlers[id][handler.i]
          if ('removeEventListener' in element)
            element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
        })
      })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function (fn, context) {
    var args = (2 in arguments) && slice.call(arguments, 2)
    if (isFunction(fn)) {
      var proxyFn = function () { return fn.apply(context, args ? args.concat(slice.call(arguments)) : arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (isString(context)) {
      if (args) {
        args.unshift(fn[context], fn)
        return $.proxy.apply(null, args)
      } else {
        return $.proxy(fn[context], fn)
      }
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function (event, data, callback) {
    return this.on(event, data, callback)
  }
  $.fn.unbind = function (event, callback) {
    return this.off(event, callback)
  }
  $.fn.one = function (event, selector, data, callback) {
    return this.on(event, selector, data, callback, 1)
  }

  var returnTrue = function () { return true },
    returnFalse = function () { return false },
    ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$|webkitMovement[XY]$)/,
    eventMethods = {
      preventDefault: 'isDefaultPrevented',
      stopImmediatePropagation: 'isImmediatePropagationStopped',
      stopPropagation: 'isPropagationStopped'
    }

  function compatible(event, source) {
    if (source || !event.isDefaultPrevented) {
      source || (source = event)

      $.each(eventMethods, function (name, predicate) {
        var sourceMethod = source[name]
        event[name] = function () {
          this[predicate] = returnTrue
          return sourceMethod && sourceMethod.apply(source, arguments)
        }
        event[predicate] = returnFalse
      })

      try {
        event.timeStamp || (event.timeStamp = Date.now())
      } catch (ignored) { }

      if (source.defaultPrevented !== undefined ? source.defaultPrevented :
        'returnValue' in source ? source.returnValue === false :
          source.getPreventDefault && source.getPreventDefault())
        event.isDefaultPrevented = returnTrue
    }
    return event
  }

  // 创建事件代理对象
  // proxy存储原始的event
  // 并且将event上ignoreProperties之外的属性赋值到proxy上

  function createProxy(event) {
    var key, proxy = { originalEvent: event }
    for (key in event)
      if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]

    return compatible(proxy, event)
  }

  $.fn.delegate = function (selector, event, callback) {
    return this.on(event, selector, callback)
  }
  $.fn.undelegate = function (selector, event, callback) {
    return this.off(event, selector, callback)
  }

  $.fn.live = function (event, callback) {
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function (event, callback) {
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  // 添加事件前的参数处理，参数处理结束后交给add函数处理

  $.fn.on = function (event, selector, data, callback, one) {
    var autoRemove, delegator, $this = this
    // {click: callback, enter: callback},针对这种调用方式，分别再绑定
    // 既然循环调用on函数的话，还可以这样用 {'click enter': callback}
    if (event && !isString(event)) {
      $.each(event, function (type, fn) {
        $this.on(type, selector, data, fn, one)
      })
      return $this
    }

    // 总共有三个if分支，产生的可能情况有8种
    /*
    //1.全部不进入
     $.fn.on('click' , '.class' , {data:'success'} , function(){
       console.log('done')
     }[, true|false] )

    2. selector没有传人
    $.fn.on('click' , {data:'success'} , function(){
        console.log('done')
    } [, true] )

    //3. 结合实际环境  callback === undefined 才会只进入第2个if
    $.fn.on('click' , '.class' , {data:'success'} , undefined [, true|false] )

    //4.callback 没有传人 one = false
    $.fn.on('click' , '.class' , {data:'success'} , false)

    //5.selector 和 data 都没有传人
    $.fn.on('click' , function(){
        console.log('done')
    })

    //6. selector没有传人 callback = false
    $.fn.on('click' , {data:'success'} , false)

    //7. 这个就好比没有添加 return false
    $.fn.on('click' , '.class' , false)

    //8.就传了event
    $.fn.on('click')

    */
    // 一般常见的使用方式是上面的1 2 5

    if (!isString(selector) && !isFunction(callback) && callback !== false)
      callback = data, data = selector, selector = undefined
    if (callback === undefined || data === false)
      callback = data, data = undefined

    if (callback === false) callback = returnFalse

    return $this.each(function (_, element) {
      // 如果只绑定一次事件，那么先移除事件及其对应的事件处理程序，再执行一次事件处理函数
      if (one) autoRemove = function (e) {
        remove(element, e.type, callback)
        return callback.apply(this, arguments)
      }
      // 如果传了选择器，那么需要进行事件代理操作
      if (selector) delegator = function (e) {
        // 这里用了closest函数，查找到最先符合selector条件的元素
        var evt, match = $(e.target).closest(selector, element).get(0)
        // 查找到的最近的符合selector条件的节点不能是element元素
        if (match && match !== element) {
          // 然后将match节点和element节点，扩展到事件对象上去
          evt = $.extend(createProxy(e), { currentTarget: match, liveFired: element })
          // 最后便是执行回调函数
          return (autoRemove || callback).apply(match, [evt].concat(slice.call(arguments, 1)))
        }
      }

      add(element, event, callback, data, selector, delegator || autoRemove)
    })
  }
  $.fn.off = function (event, selector, callback) {
    var $this = this
    if (event && !isString(event)) {
      $.each(event, function (type, fn) {
        $this.off(type, selector, fn)
      })
      return $this
    }

    if (!isString(selector) && !isFunction(callback) && callback !== false)
      callback = selector, selector = undefined

    if (callback === false) callback = returnFalse

    return $this.each(function () {
      remove(this, event, callback, selector)
    })
  }

  $.fn.trigger = function (event, args) {
    event = (isString(event) || $.isPlainObject(event)) ? $.Event(event) : compatible(event)
    event._args = args
    return this.each(function () {
      // handle focus(), blur() by calling them directly
      if (event.type in focus && typeof this[event.type] == "function") this[event.type]()
      // items in the collection might not be DOM elements
      else if ('dispatchEvent' in this) this.dispatchEvent(event)
      else $(this).triggerHandler(event, args)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function (event, args) {
    var e, result
    this.each(function (i, element) {
      e = createProxy(isString(event) ? $.Event(event) : event)
      e._args = args
      e.target = element
      $.each(findHandlers(element, event.type || event), function (i, handler) {
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

    // shortcut methods for `.bind(event, fn)` for each event type
    ; ('focusin focusout focus blur load resize scroll unload click dblclick ' +
      'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' +
      'change select keydown keypress keyup error').split(' ').forEach(function (event) {
        $.fn[event] = function (callback) {
          return (0 in arguments) ?
            this.bind(event, callback) :
            this.trigger(event)
        }
      })

  $.Event = function (type, props) {
    if (!isString(type)) props = type, type = props.type
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true)
    return compatible(event)
  }

})(Zepto)
