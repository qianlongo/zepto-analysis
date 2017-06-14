//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.
// https://juejin.im/post/587f8dbd570c3522011c0f59(回顾一下ajax请求的好文章)

; (function ($) {
  var jsonpID = +new Date(),
    document = window.document,
    key,
    name,
    rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    scriptTypeRE = /^(?:text|application)\/javascript/i,
    xmlTypeRE = /^(?:text|application)\/xml/i,
    jsonType = 'application/json',
    htmlType = 'text/html',
    blankRE = /^\s*$/,
    originAnchor = document.createElement('a')

  originAnchor.href = window.location.href

  // 触发自定义事件
  // 当默认事件被阻止时，返回false

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.isDefaultPrevented()
  }

  // 触发ajax中的全局事件(比如ajaxStart事件)

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    // (context || document)当没有传入context(可以认为是绑定于哪个元素上)时，默认触发document上的eventName事件
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // 当前的ajax请求的数量

  // Number of active Ajax requests
  $.active = 0

  // 触发全局的ajaxStart事件

  function ajaxStart(settings) {
    // settings.global默认为true， $.active为0(即当前没有其他的请求被触发)该事件才触发
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }

  // 触发全局的ajaxStop事件

  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // 发送请求前执行的函数，如果返回false那么取消该次请求

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    // context决定回调函数的内部this指向
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
      triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false
    // 如果两天回调函数都没有返回false,那么触发全局的钩子ajaxSend 
    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }

  // 请求成功的回调

  function ajaxSuccess(data, xhr, settings, deferred) {
    var context = settings.context, status = 'success'
    // 执行成功的回调
    settings.success.call(context, data, status, xhr)
    if (deferred) deferred.resolveWith(context, [data, status, xhr])
    // 触发全局钩子ajaxSuccess
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    // 触发全局钩子ajaxComplete
    ajaxComplete(status, xhr, settings)
  }

  // 请求失败的回调函数

  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings, deferred) {
    var context = settings.context
    // 执行失败的回调
    settings.error.call(context, xhr, type, error)
    if (deferred) deferred.rejectWith(context, [xhr, type, error])
    // 触发全局的钩子ajaxError
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error || type])
    ajaxComplete(type, xhr, settings)
  } 

  // 请求完成的回调函数成功或者失败都会执行该函数

  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  function ajaxDataFilter(data, type, settings) {
    if (settings.dataFilter == empty) return data
    var context = settings.context
    return settings.dataFilter.call(context, data, type)
  }

  // Empty function, used as default callback
  function empty() { }

  // jsonp请求处理

  $.ajaxJSONP = function (options, deferred) {
    // 直接调ajaxJSONP没有传入type，去走$.ajax
    if (!('type' in options)) return $.ajax(options)
    // 获取callback函数名，此时未指定为undefined
    var _callbackName = options.jsonpCallback,
      // jsonpCallback可以是一个函数或者一个字符串
      // 是函数时，执行该函数拿到其返回值作为callback函数
      // 为字符串时直接赋值
      // 没有传入jsonpCallback，那么使用类似'Zepto3726472347'作为函数名
      callbackName = ($.isFunction(_callbackName) ?
        _callbackName() : _callbackName) || ('Zepto' + (jsonpID++)),
      // 创建一个script标签用来发送请求  
      script = document.createElement('script'),
      // 先读取全局的callbackName函数，因为后面会对该函数重写，所以需要先保存一份
      originalCallback = window[callbackName],
      responseData,
      // 中止请求，触发script元素上的error事件, 后面带的参数是回调函数接收的参数
      abort = function (errorType) {
        $(script).triggerHandler('error', errorType || 'abort')
      },
      xhr = { abort: abort }, abortTimeout

    if (deferred) deferred.promise(xhr)
    // 给script元素添加load和error事件
    $(script).on('load error', function (e, errorType) {
      // 清除超时定时器
      clearTimeout(abortTimeout)
      // 移除添加的元素(注意这里还off了，不然超时这种情况，请求回来了，还是会走回调)
      $(script).off().remove()
      // 请求出错或后端没有给callback中塞入数据，将触发error
      if (e.type == 'error' || !responseData) {
        ajaxError(null, errorType || 'error', xhr, options, deferred)
      } else {
        // 请求成功，调用成功回调，请塞入数据responseData[0]
        ajaxSuccess(responseData[0], xhr, options, deferred)
      }
      // 将originalCallback重新赋值回去
      window[callbackName] = originalCallback
      // 并且判断originalCallback是不是个函数，如果是函数，便执行
      if (responseData && $.isFunction(originalCallback))
        originalCallback(responseData[0])
      // 清空闭包，释放空间
      originalCallback = responseData = undefined
    })

    if (ajaxBeforeSend(xhr, options) === false) {
      abort('abort')
      return xhr
    }
    // 重写全局上的callbackName
    window[callbackName] = function () {
      responseData = arguments
    }
    // 将重写后的回调函数名追加到?后面
    script.src = options.url.replace(/\?(.+)=\?/, '?$1=' + callbackName)
    // 添加script元素
    document.head.appendChild(script)
    // 超时处理函数
    if (options.timeout > 0) abortTimeout = setTimeout(function () {
      abort('timeout')
    }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // 请求类型
    // Default type of request
    type: 'GET',
    // 请求发送前执行的函数
    // Callback that is executed before request
    beforeSend: empty,
    // 请求成功后的回调
    // Callback that is executed if the request succeeds
    success: empty,
    // 请求出错后的回调(具体有哪些出错愿意呢？)
    // Callback that is executed the the server drops error
    error: empty,
    // 请求成功or失败都执行的回调
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    // 指定请求成功or失败等回调中的this指定，默认是window
    context: null,
    // 是否触发全局的ajax事件，默认是true
    // Whether to trigger "global" Ajax events
    global: true,
    // 底层请求api
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // 新补充 在请求时会被写入请求中，以告知服务器期望的文件类型
    // 请求接受的数据类型(看下面的链接了解相关知识点)
    // https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Basics_of_HTTP/MIME_Types
    // MIME types mapping
    // IIS returns Javascript as "application/x-javascript"
    accepts: {
      script: 'text/javascript, application/javascript, application/x-javascript',
      json: jsonType,
      xml: 'application/xml, text/xml',
      html: htmlType,
      text: 'text/plain'
    },
    // 请求是否跨域，默认false，内部会进行跨域判断
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    // 超时设置
    timeout: 0,
    // 控制数据是否需要被序列化
    // Whether data should be serialized to string
    processData: true,
    // 是否接受缓存请求(如何缓存？缓存哪些类型的请求？)
    // Whether the browser should be allowed to cache GET responses
    cache: true,
    // 暂时还不知道干什么用
    //Used to handle the raw response data of XMLHttpRequest.
    //This is a pre-filtering function to sanitize the response.
    //The sanitized response should be returned
    dataFilter: empty
  }
  // application/json; charset=utf-8
  function mimeToDataType(mime) {
    if (mime) mime = mime.split(';', 2)[0]
    return mime && (mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
        scriptTypeRE.test(mime) ? 'script' :
          xmlTypeRE.test(mime) && 'xml') || 'text'
  }
  // 给url后添加查询字符串
  // appendQuery('abc.com', 'a=b') => abc.com?a=b
  function appendQuery(url, query) {
    if (query == '') return url
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // 序列化options中的data参数
  // {name: 'qianlongo', sex: 'boy'} => name=qianlongo&sex=boy

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    // 是否需要序列化 && data字段存在 && 不是字符串(为毛不直接判断是否为对象呢？)
    if (options.processData && options.data && $.type(options.data) != "string")
      // 底层还是用的$.param进行的序列化
      options.data = $.param(options.data, options.traditional)
    // get请求，jsonp请求将序列化后的data追加到url后
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET' || 'jsonp' == options.dataType))
      options.url = appendQuery(options.url, options.data), options.data = undefined
  }

  // 请求获取的基础模块$.ajax
  // 请求的资源可以是 1、本地的 2、网络请求 3、跨域请求

  $.ajax = function (options) {
    // 数据不变性，先复制一份参数
    var settings = $.extend({}, options || {}),
      // 如果引入了Deferred，将支持then,catch等方式触发回调
      deferred = $.Deferred && $.Deferred(),
      urlAnchor, hashIndex
    // 将默认的参数合并到settings上(这里不直接使用$.extend(settings, $.ajaxSettings)估计是不想后者覆盖前者)
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]
    // 触发全局自定义事件ajaxStart => $(element).on('ajaxStart', () => {})
    ajaxStart(settings)
    // 对请求是否跨域进行判断
    // 主要判断协议(http: or https:)和域名(www.runoob.com)是否相等
    // 为什么不需要判断端口是否相同呢？
    // http://www.cnblogs.com/hustskyking/archive/2013/03/31/CDS-introduce.html(跨域文章)
    if (!settings.crossDomain) {
      urlAnchor = document.createElement('a')
      urlAnchor.href = settings.url
      // 对ie做了点兼容
      // cleans up URL for .href (IE only), see https://github.com/madrobby/zepto/pull/1049
      urlAnchor.href = urlAnchor.href
      settings.crossDomain = (originAnchor.protocol + '//' + originAnchor.host) !== (urlAnchor.protocol + '//' + urlAnchor.host)
    }
    // 对请求的url进行合法化
    // 1 为空则取当前页面url地址
    // 2 去除url上的hash值
    if (!settings.url) settings.url = window.location.toString()
    if ((hashIndex = settings.url.indexOf('#')) > -1) settings.url = settings.url.slice(0, hashIndex)
    // 参数序列化，所谓序列化也是将settings中的data字段从对象变成字符串的形式
    // {name: 'qianlongo', sex: 'boy'} => name=qianlongo&sex=boy
    serializeData(settings)
    // 遇到请求地址类似 abc.com?a=xxx&b=xxx的时候手动设置预期返回数据类型为jsonp
    var dataType = settings.dataType, hasPlaceholder = /\?.+=\?/.test(settings.url)
    if (hasPlaceholder) dataType = 'jsonp'
    // 不适用缓存，添加时间戳,以下情况不走缓存
    // cache为false 
    // options.cache不为true
    // dataType为jsonp 或 script
    if (settings.cache === false || (
      (!options || options.cache !== true) &&
      ('script' == dataType || 'jsonp' == dataType)
    ))
      settings.url = appendQuery(settings.url, '_=' + Date.now())
    // 当判断到是jsonp请求的时候，适用$.ajaxJSONP发送请求  
    if ('jsonp' == dataType) {
      if (!hasPlaceholder)
        // 对是否提供了默认的回调函数名称进行处理，后端往该函数中塞入数据并返回
        settings.url = appendQuery(settings.url,
          settings.jsonp ? (settings.jsonp + '=?') : settings.jsonp === false ? '' : 'callback=?')
      return $.ajaxJSONP(settings, deferred)
    }
    // 媒体类型(查看一下链接了解相关知识)
    // https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Basics_of_HTTP/MIME_Types
    var mime = settings.accepts[dataType],
      headers = {},
      // 往headers {} 中添加属性{name: [name, value]}
      setHeader = function (name, value) { headers[name.toLowerCase()] = [name, value] },
      // 如何url中没有设置协议部分，便读取本地协议（比如file:）协议(/^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 拿到一个url的协议部分正则可以了解一下)
      protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
      // 获取原生的xml对象，注意这里并没有对低版本的ie做兼容
      xhr = settings.xhr(),
      // 获取原生的setRequestHeader函数
      nativeSetHeader = xhr.setRequestHeader,
      abortTimeout

    if (deferred) deferred.promise(xhr)
    // 请求同步与异步设置
    // x-requested-with  XMLHttpRequest 异步
    // x-requested-with  null 同步
    if (!settings.crossDomain) setHeader('X-Requested-With', 'XMLHttpRequest')
    // 设置接受相应数据的类型
    setHeader('Accept', mime || '*/*')
    // 注意这里，是先进行后面的|| 运算，再进行赋值操作？(运算符优先级问题，|| 运算优先级高于=赋值运算)
    // 可以看这篇文章(http://www.cnblogs.com/ygm125/archive/2011/11/09/2242427.html)
    // 更新注释：mime = (settings.mimeType || mime)类似进行了该操作
    if (mime = settings.mimeType || mime) {
      // 'text/javascript, application/javascript, application/x-javascript'
      // 取第三个值
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    // Content-Type指定后端想赢的文件类型，方便浏览器处理对应的文件
    // 如果不是get类型请求，并且指定了数据data，则默认类型为application/x-www-form-urlencoded
    /*
      application/x-www-form-urlencoded：是一种编码格式，窗体数据被编码为名称/值对，是标准的编码格式。
      当action为get时候，浏览器用x-www-form-urlencoded的编码方式把form数据转换成一个字串（name1=value1&name2=value2...）
      然后把这个字串append到url后面，用?分割，加载这个新的url。 
      当action为post时候，浏览器把form数据封装到http body中，然后发送到server

    */
    if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET'))
      setHeader('Content-Type', settings.contentType || 'application/x-www-form-urlencoded')
    // 设置请求头  
    if (settings.headers) for (name in settings.headers) setHeader(name, settings.headers[name])
    // 将原生的设置请求头的函数重写为自己定义的
    xhr.setRequestHeader = setHeader
    // 监听请求状态
    // 0：请求未初始化（还没有调用 open()）。
    // 1：请求已经建立，但是还没有发送（还没有调用 send()）。
    // 2：请求已发送，正在处理中（通常现在可以从响应中获取内容头）。
    // 3：请求在处理中；通常响应中已有部分数据可用了，但是服务器还没有完成响应的生成。
    // 4：响应已完成；您可以获取并使用服务器的响应了。
       
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        // 将监听的回调置空
        xhr.onreadystatechange = empty
        // 清除定时器
        clearTimeout(abortTimeout)
        var result, error = false
        // 200 <= xhr.status < 300 表示请求已经成功
        // 304 便是没有被修改
        // 或者是本地的文件
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          // mimeToDataType对后端返回的数据进行数据转化(一般后端返回的是字符串，如果没有指定dataType，会读取后端返回的content-type进行酌情转化)
          dataType = dataType || mimeToDataType(settings.mimeType || xhr.getResponseHeader('content-type'))

          if (xhr.responseType == 'arraybuffer' || xhr.responseType == 'blob')
            result = xhr.response
          else {
            // 返回的内容
            result = xhr.responseText

            try {
              // http://perfectionkills.com/global-eval-what-are-the-options/
              // sanitize response accordingly if data filter callback provided
              result = ajaxDataFilter(result, dataType, settings)
              if (dataType == 'script') (1, eval)(result)
              else if (dataType == 'xml') result = xhr.responseXML
              else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
            } catch (e) { error = e }
            // 如果解析出错，调用parsererror
            if (error) return ajaxError(error, 'parsererror', xhr, settings, deferred)
          }
          // 请求成功
          ajaxSuccess(result, xhr, settings, deferred)
        } else {
          // 请求失败
          ajaxError(xhr.statusText || null, xhr.status ? 'error' : 'abort', xhr, settings, deferred)
        }
      }
    }
    // 一个请求的钩子函数，在发送请求前可以终止进行
    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      ajaxError(null, 'abort', xhr, settings, deferred)
      return xhr
    }
    // 默认async为true，若用户自己设置读取用户的
    var async = 'async' in settings ? settings.async : true
    // 开始准备请求
    xhr.open(settings.type, settings.url, async, settings.username, settings.password)

    if (settings.xhrFields) for (name in settings.xhrFields) xhr[name] = settings.xhrFields[name]

    for (name in headers) nativeSetHeader.apply(xhr, headers[name])
    // 超时处理
    if (settings.timeout > 0) abortTimeout = setTimeout(function () {
      xhr.onreadystatechange = empty
      xhr.abort()
      ajaxError(null, 'timeout', xhr, settings, deferred)
    }, settings.timeout)
    // 发送请求
    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  // handle optional data/success arguments
  function parseArguments(url, data, success, dataType) {
    if ($.isFunction(data)) dataType = success, success = data, data = undefined
    if (!$.isFunction(success)) dataType = success, success = undefined
    return {
      url: url
      , data: data
      , success: success
      , dataType: dataType
    }
  }

  $.get = function (/* url, data, success, dataType */) {
    return $.ajax(parseArguments.apply(null, arguments))
  }

  $.post = function (/* url, data, success, dataType */) {
    var options = parseArguments.apply(null, arguments)
    options.type = 'POST'
    return $.ajax(options)
  }

  $.getJSON = function (/* url, data, success */) {
    var options = parseArguments.apply(null, arguments)
    options.dataType = 'json'
    return $.ajax(options)
  }

  $.fn.load = function (url, data, success) {
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector,
      options = parseArguments(url, data, success),
      callback = options.success
    if (parts.length > 1) options.url = parts[0], selector = parts[1]
    options.success = function (response) {
      self.html(selector ?
        $('<div>').html(response.replace(rscript, "")).find(selector)
        : response)
      callback && callback.apply(self, arguments)
    }
    $.ajax(options)
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope) {
    var type, array = $.isArray(obj), hash = $.isPlainObject(obj)
    $.each(obj, function (key, value) {
      type = $.type(value)
      if (scope) key = traditional ? scope :
        scope + '[' + (hash || type == 'object' || type == 'array' ? key : '') + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (type == "array" || (!traditional && type == "object"))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function (obj, traditional) {
    var params = []
    params.add = function (key, value) {
      if ($.isFunction(value)) value = value()
      if (value == null) value = ""
      this.push(escape(key) + '=' + escape(value))
    }
    serialize(params, obj, traditional)
    return params.join('&').replace(/%20/g, '+')
  }
})(Zepto)
