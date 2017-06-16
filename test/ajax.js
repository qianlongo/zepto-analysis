let noop = function () {}
let $ = noop
let jsonpID = Date.now()
$.isFunction = (obj) => {
  return typeof obj === 'function'
}
$.ajaxJSONP = function (options = {}) {
  let {jsonpCallback, url, timeout, error, success, compelete} = options
  let callbackName = ($.isFunction(jsonpCallback) ? 
                      jsonpCallback() : jsonpCallback || (`Zepto${jsonpID++}`))
  let script = document.createElement('script')
  let originalCallback = window.callbackName
  let responseData // 后端执行后唯一做的事就是更改数据
  let abort = (errorType) => {
    // 超时处理等问题
  }
  let xhr = {abort}
  let abortTimeout
  let scriptLoad = (e) => {
    clearTimeout(abortTimeout)
    script.parentNode.removeChild(script)
    script.removeEventListener('load', scriptLoad, false)
    if (e.type === 'error' || !responseData) {
      error && error('error', xhr, options)
    } else {
      success(responseData[0])
    }

    window[originalCallback] = originalCallback
    if (responseData && $.isFunction(originalCallback)) {
      originalCallback(responseData)
      responseData = originalCallback = void 0
    }
  }

  script.addEventListener('load', scriptLoad, false)

  window[callbackName] = function () {
    responseData = arguments
  }
  script.src = url.replace(/\?(.+)=\?/, '?$1=' + callbackName)
  document.head.appendChild(script)

  if (timeout > 0) {
    abortTimeout = setTimeout(abort.bind(null, 'timeout'), timeout)
  }

  return xhr
}

 function appendQuery(url, query) {
    if (query == '') return url
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }