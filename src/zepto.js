//     Zepto.js
//     (c) 2010-2017 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

var Zepto = (function () {
  // 初始化了一些变量，注意emptyArray
  // 其方便后面读取数组的concat，filter等方法
  var undefined, key, $, classList, 
    emptyArray = [], 
    concat = emptyArray.concat, 
    filter = emptyArray.filter, 
    slice = emptyArray.slice,
    document = window.document,
    elementDisplay = {}, classCache = {},
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1, 'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,
    singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
    tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    rootNodeRE = /^(?:body|html)$/i,
    capitalRE = /([A-Z])/g,

    // special attributes that should be get/set via method calls
    methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

    adjacencyOperators = ['after', 'prepend', 'before', 'append'],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    simpleSelectorRE = /^[\w-]*$/,
    class2type = {},
    toString = class2type.toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div'),
    propMap = {
      'tabindex': 'tabIndex',
      'readonly': 'readOnly',
      'for': 'htmlFor',
      'class': 'className',
      'maxlength': 'maxLength',
      'cellspacing': 'cellSpacing',
      'cellpadding': 'cellPadding',
      'rowspan': 'rowSpan',
      'colspan': 'colSpan',
      'usemap': 'useMap',
      'frameborder': 'frameBorder',
      'contenteditable': 'contentEditable'
    },

    // 其实我们知道这种判断方式是有缺陷的，
    // 为什么不用Object.prototype.toString.call(obj) === '[object Array]'呢

    isArray = Array.isArray ||
      function (object) { return object instanceof Array }

  // 检测指定的element元素是否匹配 选择器selector
  // (一些现代浏览器本身支持该方法 https://developer.mozilla.org/en-US/docs/Web/API/Element/matches)

  zepto.matches = function (element, selector) {
    // 确保element、selector都有传递，并且element是元素节点
    if (!selector || !element || element.nodeType !== 1) return false
    // 检测原生是都支持matches方法或者带私有前缀的matches方法
    var matchesSelector = element.matches || element.webkitMatchesSelector ||
      element.mozMatchesSelector || element.oMatchesSelector ||
      element.matchesSelector
    // 如果支持就直接调用原生的  
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    // 如果原生不支持，就模拟。
    // 如果element的父节点不存在，temp会得到true
    var match, parent = element.parentNode, temp = !parent
    // 如果element不存在父节点，就讲tempParent(一个空的div元素)赋值为parent，并且将element变成其子节点
    if (temp) (parent = tempParent).appendChild(element)
    // 再调用zepto.qsa(element, selector)进行查找，结果只有两种
    // [dom] => element匹配selector选择器
    // [] => elements不匹配selector选择器
    match = ~zepto.qsa(parent, selector).indexOf(element)
    // 最后是将tempParent中临时插进去的子节点清除掉
    temp && tempParent.removeChild(element)
    // 所以最后返回有两种情况
    // 匹配 -1
    // 不匹配 0
    // 为什么不像原生的matches一样返回true或者false呢
    return match
  }

  // 数据类型检测，依赖class2type中的数据，本质还是Object.prototype.toString.call(obj)进行的判断
  // null 和 undefined各自返回对应值
  // 其他的数据类型call之后从class2type中查找，没有找到则默认为object类型

  function type(obj) {
    return obj == null ? String(obj) :
      class2type[toString.call(obj)] || "object"
  }

  // 使用type函数判断value是否是函数类型

  function isFunction(value) { return type(value) == "function" }

  // 判断是不是window对象

  function isWindow(obj) { return obj != null && obj == obj.window }

  // 通过判断dom节点的nodeType是否为9，9即是document节点

  function isDocument(obj) { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }

  // 使用type函数判断obj是否是对象类型

  function isObject(obj) { return type(obj) == "object" }

  // 判断obj是否为纯粹的对象，必须满足
  // 首先必须是对象 isObject(obj)
  // 不是 window 对象 !isWindow(obj)
  // 并且原型要和 Object 的原型相等

  function isPlainObject(obj) {
    return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype
  }

  // 判断obj是否为类数组，可以对比underscore中类数组判断的实现，觉得这里有些过于繁杂了
  // 2017-5-31再次补充，其实function和window都有length属性，所以其实是underscore不够严谨

  function likeArray(obj) {
    // 首先obj必须要存在，!!obj 直接过滤掉了false，null，undefined，''等值
    // 然后obj必须包含length属性
    var length = !!obj && 'length' in obj && obj.length,
    // 获取obj的数据类型
      type = $.type(obj)
    // 不能是function类型，不能是window
    // 如果是array则直接返回true
    // 或者当length的数据类型是number，并且其取值范围是0到(length - 1)这里是通过判断length - 1 是否为obj的属性
    return 'function' != type && !isWindow(obj) && (
      'array' == type || length === 0 ||
      (typeof length == 'number' && length > 0 && (length - 1) in obj)
    )
  }

  // compact 去除数组中null和undefined,注意判断是用了 != 而不是 !==

  function compact(array) { return filter.call(array, function (item) { return item != null }) }

  // flatten 将数组 [1,[2,3],[4,5],6,[7,[89]] 变成 [1,2,3,4,5,6,7,[8,9]] 
  // 这个方法只能展开一层，多层嵌套也只能展开一层, 查看数组的concat的使用方式便可以知道为什么只能平铺一层

  function flatten(array) { return array.length > 0 ? $.fn.concat.apply([], array) : array }

  // 将 word-word 的形式的字符串转换成 wordWord 的形式， - 可以为一个或多个。

  camelize = function (str) { return str.replace(/-+(.)?/g, function (match, chr) { return chr ? chr.toUpperCase() : '' }) }


  function dasherize(str) {
    return str.replace(/::/g, '/')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .replace(/([a-z\d])([A-Z])/g, '$1_$2')
      .replace(/_/g, '-')
      .toLowerCase()
  }

  // 数组去重，原理是根据元素在数组中第一次出现的位置是否和item所处的位置相等，相等则是第一次出现，否则将其过滤掉

  uniq = function (array) { return filter.call(array, function (item, idx) { return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  // 得到element元素的子元素(nodeType === 1)集合
  // 如果element支持children属性则直接返回
  // 反则遍历子节点中nodeType为1的节点（即元素节点）

  function children(element) {
    return 'children' in element ?
      slice.call(element.children) :
      $.map(element.childNodes, function (node) { if (node.nodeType == 1) return node })
  }

  // 将dom数组转化为对象的形式,也是真正的zepto构造函数

  function Z(dom, selector) {
    var i, len = dom ? dom.length : 0
    for (i = 0; i < len; i++) this[i] = dom[i]
    this.length = len
    this.selector = selector || ''
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overridden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function (html, name, properties) {
    var dom, nodes, container

    // A special case optimization for a single tag
    if (singleTagRE.test(html)) dom = $(document.createElement(RegExp.$1))

    if (!dom) {
      if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
      if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
      if (!(name in containers)) name = '*'

      container = containers[name]
      container.innerHTML = '' + html
      dom = $.each(slice.call(container.childNodes), function () {
        container.removeChild(this)
      })
    }

    if (isPlainObject(properties)) {
      nodes = $(dom)
      $.each(properties, function (key, value) {
        if (methodAttributes.indexOf(key) > -1) nodes[key](value)
        else nodes.attr(key, value)
      })
    }

    return dom
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. This method can be overridden in plugins.
  zepto.Z = function (dom, selector) {
    return new Z(dom, selector)
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overridden in plugins.
  zepto.isZ = function (object) {
    return object instanceof zepto.Z
  }

  // $(selector, [context])   ⇒ collection  // 用法1
  // $(<Zepto collection>)   ⇒ same collection // 用法2
  // $(<DOM nodes>)   ⇒ collection // 用法3
  // $(htmlString)   ⇒ collection // 用法4
  // $(htmlString, attributes)   ⇒ collection v1.0+ // 用法5
  // Zepto(function($){ ... })   // 用法6

  // 通过以上几种zepto的使用方式来更好的理解init方法，下面的英文也做了介绍
  // zepto的init方法如果jQ的$.fn.int，可见其重要性

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overridden in plugins.
  zepto.init = function (selector, context) {
    var dom

    // 如果没有传入选择器，则返回一个空的Z对象

    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    
    // 如果传入的是字符串

    // Optimize for string selectors
    else if (typeof selector == 'string') {
      selector = selector.trim()
      // If it's a html fragment, create nodes from it
      // Note: In both Chrome 21 and Firefox 15, DOM error 12
      // is thrown if the fragment doesn't begin with <
      if (selector[0] == '<' && fragmentRE.test(selector))
        dom = zepto.fragment(selector, RegExp.$1, context), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // If it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
    }

    // 如果传入的selector是一个函数，那么就是当dom ready的时候执行这个方法

    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)

    // 如果传进来的是Z的实例，那么直接将其返回即可

    // If a Zepto collection is given, just return it
    else if (zepto.isZ(selector)) return selector
    else {
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // Wrap DOM nodes.
      else if (isObject(selector))
        dom = [selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
    }
    // create a new Zepto collection from the nodes found
    return zepto.Z(dom, selector)
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, which makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  // 笔记$函数定义处
  $ = function (selector, context) {
    return zepto.init(selector, context)
  }
  
  function extend(target, source, deep) {
    // 对源对象source进行遍历
    for (key in source)
      // 如果source[key]是纯对象或者数组，并且制定为深复制
      if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
        // 如果source[key]为纯对象，但是target[key]不是纯对象，则将目标对象的key设置为空对象
        if (isPlainObject(source[key]) && !isPlainObject(target[key]))
          target[key] = {}
        // 如果  如果source[key]为数组，但是target[key]不是数组，则将目标对象的key设置为数组
        if (isArray(source[key]) && !isArray(target[key]))
          target[key] = []
        // 递归调用extend函数  
        extend(target[key], source[key], deep)
      }
      // 浅复制或者source[key]不为undefined，便进行赋值
      else if (source[key] !== undefined) target[key] = source[key]
  }

  // 工具函数、可深复制或浅复制

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function (target) {
    // 将第一个参数之外的参数变成一个数组
    var deep, args = slice.call(arguments, 1)
    // 处理第一个参数是boolean值的情况，默认是浅复制，深复制第一个参数传true
    if (typeof target == 'boolean') {
      deep = target
      target = args.shift()
    }
    // $.extend(true, {}, source1, source2, source3)
    // 有可能有多个source，遍历调用内部extend方法，实现复制
    args.forEach(function (arg) { extend(target, arg, deep) })
    return target
  }

  // 一个经过了优化的类似于document.querySelectorAll的函数

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overridden in plugins.
  zepto.qsa = function (element, selector) {
    var found, // 查找到的元素
      maybeID = selector[0] == '#', // 判断是不是id选择器
      maybeClass = !maybeID && selector[0] == '.', // 如果不是id，判断是不是class选择器
      // 如果是id或者class形式的选择器，就切除.或者#只留后面部分 否直接赋值传进来的选择器
      nameOnly = maybeID || maybeClass ? selector.slice(1) : selector, // Ensure that a 1 char tag name still gets checked
      // 测试nameOnly是不是单个选择器而不是 'name sex'这种有多个的情况
      isSimple = simpleSelectorRE.test(nameOnly)
      
    return (element.getElementById && isSimple && maybeID) ? // Safari DocumentFragment doesn't have getElementById
      ((found = element.getElementById(nameOnly)) ? [found] : []) :
      (element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? [] :
        slice.call(
          isSimple && !maybeID && element.getElementsByClassName ? // DocumentFragment doesn't have getElementsByClassName/TagName
            maybeClass ? element.getElementsByClassName(nameOnly) : // If it's simple, it could be a class
              element.getElementsByTagName(selector) : // Or a tag
            element.querySelectorAll(selector) // Or it's not simple, and we need to query all
        )
  }

  function filtered(nodes, selector) {
    return selector == null ? $(nodes) : $(nodes).filter(selector)
  }

  // 工具方法，用来检查parent节点中是否包含node节点
  // 首先判断是否原生支持该方法，如果支持则使用原生的
  // 否则通过循环去判断

  $.contains = document.documentElement.contains ?
    function (parent, node) {
      // 防止parent和node传相同的节点，故先parent !== node
      // 接着就是调用原生的contains方法判断了
      return parent !== node && parent.contains(node)
    } :
    function (parent, node) {
      // 当node节点存在，就把node的父节点赋值给node
      while (node && (node = node.parentNode))
        // 如果node的父节点和parent相等就返回true，否则继续向上查找
        // 其实有一个疑问，为什么开头不先排查node === parent的情况呢
        // 不然经过循环最后却得到false，非常的浪费
        if (node === parent) return true
      return false
    }

  function funcArg(context, arg, idx, payload) {
    return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  function setAttribute(node, name, value) {
    value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
  }

  // access className property while respecting SVGAnimatedString
  function className(node, value) {
    var klass = node.className || '',
      svg = klass && klass.baseVal !== undefined

    if (value === undefined) return svg ? klass.baseVal : klass
    svg ? (klass.baseVal = value) : (node.className = value)
  }

  // "true"  => true
  // "false" => false
  // "null"  => null
  // "42"    => 42
  // "42.5"  => 42.5
  // "08"    => "08"
  // JSON    => parse if valid
  // String  => self
  function deserializeValue(value) {
    try {
      return value ?
        value == "true" ||
        (value == "false" ? false :
          value == "null" ? null :
            +value + "" == value ? +value :
              /^[\[\{]/.test(value) ? $.parseJSON(value) :
                value)
        : value
    } catch (e) {
      return value
    }
  }

  $.type = type
  $.isFunction = isFunction
  $.isWindow = isWindow
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.isEmptyObject = function (obj) {
    var name
    for (name in obj) return false
    return true
  }

  $.isNumeric = function (val) {
    var num = Number(val), type = typeof val
    return val != null && type != 'boolean' &&
      (type != 'string' || val.length) &&
      !isNaN(num) && isFinite(num) || false
  }

  // 用了原生的数组indexOf方法，判断elem在数组array中的索引位置

  $.inArray = function (elem, array, i) {
    return emptyArray.indexOf.call(array, elem, i)
  }

  // 将字符串转成驼峰的形式

  $.camelCase = camelize

  // 去除字符串首尾空格，用了原生的trim
  // 为什么不直接使用str.trim呢？原因可能是怕你传入的不是一个String那么直接调用就出问题了

  $.trim = function (str) {
    return str == null ? "" : String.prototype.trim.call(str)
  }

  // plugin compatibility
  $.uuid = 0
  $.support = {}
  $.expr = {}

  // 一个空函数，别小瞧它，非常有用

  $.noop = function () { }

  // 模仿原生的map函数，根据callback的返回值，映射一个新的数组

  $.map = function (elements, callback) {
    var value, values = [], i, key
    // 如果是类数组，则用for循环
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        // 如果callback的返回值不为null或者undefined，就push进values
        if (value != null) values.push(value)
      }
    else
      // 对象走这个逻辑
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    // 最后返回的是铺平的一维数组  
    return flatten(values)
  }

  // 工具方法,用来遍历数组或者对象，类似原生的forEach但是不同的是，可以中断遍历的执行

  $.each = function (elements, callback) {
    var i, key
    // 如果是类数组就走这个if
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        // 可以看到用.call去执行了callback，并且第一个参数是数组中的item
        // 如果用来遍历dom，那么内部的this，指的就是当前这个元素本身
        // 判断callback执行的结果，如果是false，就中断遍历
        // 中断遍历这就是和原生forEach不同的地方
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      // 否则回去走for in循环，逻辑与上面差不多
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  // 其实就是filter，具体含义看filter实现即可

  $.grep = function (elements, callback) {
    return filter.call(elements, callback)
  }

  // 将字符串转成json的方法，注意哟，浏览器不支持的情况下，不会有$.parseJSON方法

  if (window.JSON) $.parseJSON = JSON.parse

  // 为后面的$.type数据类型函数做准备，得到 class2type = { "[object Boolean]": "boolean" ...}

  // Populate the class2type map
  $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function (i, name) {
    class2type["[object " + name + "]"] = name.toLowerCase()
  })

  // $构造函数的原型上挂许多静态方法

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    // 指正构造函数指向
    constructor: zepto.Z,
    length: 0,

    // forEach、reduce、push、sort、splice、indexOf是数组的方法
    // 但是Z对象是个类数组，所以可以"借以用之"

    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    sort: emptyArray.sort,
    splice: emptyArray.splice,
    indexOf: emptyArray.indexOf,

    // 添加元素到zepto对象中形成一个新的数组
    // 为什么不直接将数组的concat方法赋值给$.fn.concat呢
    // 因为zepto对象毕竟不是一个真正的数组，如果直接赋值会导致zepto对象会变成一个item而成为数组的一员

    concat: function () {
      var i, value, args = []
      // 处理arguments参数，话说这里怎么不缓存一下length呢
      for (i = 0; i < arguments.length; i++) {
        value = arguments[i]
        // 如果集合中的某个元素师zepto对象，就将其变成一个数组
        args[i] = zepto.isZ(value) ? value.toArray() : value
      }
      // 对当前的this也进行了同样的判断
      return concat.apply(zepto.isZ(this) ? this.toArray() : this, args)
    },

    // 遍历集合中的所有的元素
    // 通过fn将数组映射成一个新的数组，fn中内部的this指向当前的元素
    // 最后得到的还是一个zepto对象，所以可以再次调用其相关方法

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function (fn) {
      return $($.map(this, function (el, i) { return fn.call(el, i, el) }))
    },

    // 提取这个数组array的子集，从start开始，如果给定end，提取从从start开始到end结束的元素，但是不包含end位置的元素
    // 注意返回的结果还是一个zepto对象

    slice: function () {
      return $(slice.apply(this, arguments))
    },

    ready: function (callback) {
      // don't use "interactive" on IE <= 10 (it can fired premature)
      if (document.readyState === "complete" ||
        (document.readyState !== "loading" && !document.documentElement.doScroll))
        setTimeout(function () { callback($) }, 0)
      else {
        var handler = function () {
          document.removeEventListener("DOMContentLoaded", handler, false)
          window.removeEventListener("load", handler, false)
          callback($)
        }
        document.addEventListener("DOMContentLoaded", handler, false)
        window.addEventListener("load", handler, false)
      }
      return this
    },

    // 类似jQ中的get，返回的是原生的dom对象
    // 如果没有传idx，那么返回的是当前元素的整体数组
    // 传入的是正数则按照索引读取dom节点
    // 负数则是从后面往前读取

    get: function (idx) {
      return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
    },

    // 调用本身的get方法，将dom集合变成一个数组

    toArray: function () { return this.get() },

    // 获取对象集合中元素的数量

    size: function () {
      return this.length
    },

    // 删除当前选中的元素
    // 原理很简单,找到当前元素的父节点
    // 使用removeChild原生方法删除子节点

    remove: function () {
      return this.each(function () {
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },

    // 遍历一个对象集合每个元素。
    // 在迭代函数中，this关键字指向当前项(作为函数的第二个参数传递)。
    // 如果迭代函数返回 false，遍历结束
    // 这里巧妙的使用到了every函数，只要有一个值不满足条件就中断遍历并返回false
    // 注意判断条件用到了 !== 因为函数执行的时候没有显示的返回值，默认是undefined，这个时候还是不能够中断执行的

    each: function (callback) {
      emptyArray.every.call(this, function (el, idx) {
        return callback.call(el, idx, el) !== false
      })
      return this
    },
    filter: function (selector) {
      if (isFunction(selector)) return this.not(this.not(selector))
      return $(filter.call(this, function (element) {
        return zepto.matches(element, selector)
      }))
    },

    // 添加元素到当前集合中
    // selector和context与$(selector, context)中一样的用法
    // 最后做了去重的操作，比如传个空数组啥的进去，就没有必要添加到当前的集合里了

    add: function (selector, context) {
      return $(uniq(this.concat($(selector, context))))
    },
    is: function (selector) {
      return this.length > 0 && zepto.matches(this[0], selector)
    },

    // 将集合中不符合条件的元素找出来,可以有以下几种调用方式，传选择器、传函数、传一个集合
    // not(selector)  ⇒ collection
    // not(collection)  ⇒ collection
    // not(function(index){ ... })  ⇒ collection

    not: function (selector) {
      var nodes = []
      // 处理函数的调用方式
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function (idx) {
          // 将函数调用的结果进行取反，即拿到了不符合的条件的dom
          if (!selector.call(this, idx)) nodes.push(this)
        })
      else {
        // 如果selector是个字符串，那么调用filter
        var excludes = typeof selector == 'string' ? this.filter(selector) :
        // 否则如果是个类似数组，并且selector.item是个函数，集合是拥有item方法用来访问集合中的元素的
        // 非类数组且没有item方法的直接调用$方法，不过最后得到的也还是个数组
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function (el) {
          // 这里就是排查符合条件的判断了
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    has: function (selector) {
      return this.filter(function () {
        return isObject(selector) ?
          $.contains(this, selector) :
          $(this).find(selector).size()
      })
    },
    eq: function (idx) {
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function () {
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function () {
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function (selector) {
      var result, $this = this
      if (!selector) result = $()
      else if (typeof selector == 'object')
        result = $(selector).filter(function () {
          var node = this
          return emptyArray.some.call($this, function (parent) {
            return $.contains(parent, node)
          })
        })
      else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
      else result = this.map(function () { return zepto.qsa(this, selector) })
      return result
    },
    closest: function (selector, context) {
      var nodes = [], collection = typeof selector == 'object' && $(selector)
      this.each(function (_, node) {
        while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
          node = node !== context && !isDocument(node) && node.parentNode
        if (node && nodes.indexOf(node) < 0) nodes.push(node)
      })
      return $(nodes)
    },
    parents: function (selector) {
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function (node) {
          if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function (selector) {
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function (selector) {
      return filtered(this.map(function () { return children(this) }), selector)
    },
    contents: function () {
      return this.map(function () { return this.contentDocument || slice.call(this.childNodes) })
    },
    siblings: function (selector) {
      return filtered(this.map(function (i, el) {
        return filter.call(children(el.parentNode), function (child) { return child !== el })
      }), selector)
    },

    // 将当前的集合元素的innerHTML都设置为空
    // 使用了$.fn的each方法

    empty: function () {
      return this.each(function () { this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function (property) {
      return $.map(this, function (el) { return el[property] })
    },
    show: function () {
      return this.each(function () {
        this.style.display == "none" && (this.style.display = '')
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function (newContent) {
      return this.before(newContent).remove()
    },
    wrap: function (structure) {
      var func = isFunction(structure)
      if (this[0] && !func)
        var dom = $(structure).get(0),
          clone = dom.parentNode || this.length > 1

      return this.each(function (index) {
        $(this).wrapAll(
          func ? structure.call(this, index) :
            clone ? dom.cloneNode(true) : dom
        )
      })
    },
    wrapAll: function (structure) {
      if (this[0]) {
        $(this[0]).before(structure = $(structure))
        var children
        // drill down to the inmost element
        while ((children = structure.children()).length) structure = children.first()
        $(structure).append(this)
      }
      return this
    },
    wrapInner: function (structure) {
      var func = isFunction(structure)
      return this.each(function (index) {
        var self = $(this), contents = self.contents(),
          dom = func ? structure.call(this, index) : structure
        contents.length ? contents.wrapAll(dom) : self.append(dom)
      })
    },
    unwrap: function () {
      this.parent().each(function () {
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function () {
      return this.map(function () { return this.cloneNode(true) })
    },
    hide: function () {
      return this.css("display", "none")
    },
    toggle: function (setting) {
      return this.each(function () {
        var el = $(this)
          ; (setting === undefined ? el.css("display") == "none" : setting) ? el.show() : el.hide()
      })
    },
    prev: function (selector) { return $(this.pluck('previousElementSibling')).filter(selector || '*') },
    next: function (selector) { return $(this.pluck('nextElementSibling')).filter(selector || '*') },
    html: function (html) {
      return 0 in arguments ?
        this.each(function (idx) {
          var originHtml = this.innerHTML
          $(this).empty().append(funcArg(this, html, idx, originHtml))
        }) :
        (0 in this ? this[0].innerHTML : null)
    },
    text: function (text) {
      return 0 in arguments ?
        this.each(function (idx) {
          var newText = funcArg(this, text, idx, this.textContent)
          this.textContent = newText == null ? '' : '' + newText
        }) :
        (0 in this ? this.pluck('textContent').join("") : null)
    },
    attr: function (name, value) {
      var result
      return (typeof name == 'string' && !(1 in arguments)) ?
        (0 in this && this[0].nodeType == 1 && (result = this[0].getAttribute(name)) != null ? result : undefined) :
        this.each(function (idx) {
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) setAttribute(this, key, name[key])
          else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function (name) {
      return this.each(function () {
      this.nodeType === 1 && name.split(' ').forEach(function (attribute) {
        setAttribute(this, attribute)
      }, this)
      })
    },
    prop: function (name, value) {
      name = propMap[name] || name
      return (1 in arguments) ?
        this.each(function (idx) {
          this[name] = funcArg(this, value, idx, this[name])
        }) :
        (this[0] && this[0][name])
    },
    removeProp: function (name) {
      name = propMap[name] || name
      return this.each(function () { delete this[name] })
    },
    data: function (name, value) {
      var attrName = 'data-' + name.replace(capitalRE, '-$1').toLowerCase()

      var data = (1 in arguments) ?
        this.attr(attrName, value) :
        this.attr(attrName)

      return data !== null ? deserializeValue(data) : undefined
    },
    val: function (value) {
      if (0 in arguments) {
        if (value == null) value = ""
        return this.each(function (idx) {
          this.value = funcArg(this, value, idx, this.value)
        })
      } else {
        return this[0] && (this[0].multiple ?
          $(this[0]).find('option').filter(function () { return this.selected }).pluck('value') :
          this[0].value)
      }
    },
    offset: function (coordinates) {
      if (coordinates) return this.each(function (index) {
        var $this = $(this),
          coords = funcArg(this, coordinates, index, $this.offset()),
          parentOffset = $this.offsetParent().offset(),
          props = {
            top: coords.top - parentOffset.top,
            left: coords.left - parentOffset.left
          }

        if ($this.css('position') == 'static') props['position'] = 'relative'
        $this.css(props)
      })
      if (!this.length) return null
      if (document.documentElement !== this[0] && !$.contains(document.documentElement, this[0]))
        return { top: 0, left: 0 }
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: Math.round(obj.width),
        height: Math.round(obj.height)
      }
    },
    css: function (property, value) {
      if (arguments.length < 2) {
        var element = this[0]
        if (typeof property == 'string') {
          if (!element) return
          return element.style[camelize(property)] || getComputedStyle(element, '').getPropertyValue(property)
        } else if (isArray(property)) {
          if (!element) return
          var props = {}
          var computedStyle = getComputedStyle(element, '')
          $.each(property, function (_, prop) {
            props[prop] = (element.style[camelize(prop)] || computedStyle.getPropertyValue(prop))
          })
          return props
        }
      }

      var css = ''
      if (type(property) == 'string') {
        if (!value && value !== 0)
          this.each(function () { this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)
      } else {
        for (key in property)
          if (!property[key] && property[key] !== 0)
            this.each(function () { this.style.removeProperty(dasherize(key)) })
          else
            css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
      }

      return this.each(function () { this.style.cssText += ';' + css })
    },
    index: function (element) {
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function (name) {
      if (!name) return false
      return emptyArray.some.call(this, function (el) {
        return this.test(className(el))
      }, classRE(name))
    },
    addClass: function (name) {
      if (!name) return this
      return this.each(function (idx) {
        if (!('className' in this)) return
        classList = []
        var cls = className(this), newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function (klass) {
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function (name) {
      return this.each(function (idx) {
        if (!('className' in this)) return
        if (name === undefined) return className(this, '')
        classList = className(this)
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function (klass) {
          classList = classList.replace(classRE(klass), " ")
        })
        className(this, classList.trim())
      })
    },
    toggleClass: function (name, when) {
      if (!name) return this
      return this.each(function (idx) {
        var $this = $(this), names = funcArg(this, name, idx, className(this))
        names.split(/\s+/g).forEach(function (klass) {
          (when === undefined ? !$this.hasClass(klass) : when) ?
            $this.addClass(klass) : $this.removeClass(klass)
        })
      })
    },
    scrollTop: function (value) {
      if (!this.length) return
      var hasScrollTop = 'scrollTop' in this[0]
      if (value === undefined) return hasScrollTop ? this[0].scrollTop : this[0].pageYOffset
      return this.each(hasScrollTop ?
        function () { this.scrollTop = value } :
        function () { this.scrollTo(this.scrollX, value) })
    },
    scrollLeft: function (value) {
      if (!this.length) return
      var hasScrollLeft = 'scrollLeft' in this[0]
      if (value === undefined) return hasScrollLeft ? this[0].scrollLeft : this[0].pageXOffset
      return this.each(hasScrollLeft ?
        function () { this.scrollLeft = value } :
        function () { this.scrollTo(value, this.scrollY) })
    },
    position: function () {
      if (!this.length) return

      var elem = this[0],
        // Get *real* offsetParent
        offsetParent = this.offsetParent(),
        // Get correct offsets
        offset = this.offset(),
        parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

      // Subtract element margins
      // note: when an element has margin: auto the offsetLeft and marginLeft
      // are the same in Safari causing offset.left to incorrectly be 0
      offset.top -= parseFloat($(elem).css('margin-top')) || 0
      offset.left -= parseFloat($(elem).css('margin-left')) || 0

      // Add offsetParent borders
      parentOffset.top += parseFloat($(offsetParent[0]).css('border-top-width')) || 0
      parentOffset.left += parseFloat($(offsetParent[0]).css('border-left-width')) || 0

      // Subtract the two offsets
      return {
        top: offset.top - parentOffset.top,
        left: offset.left - parentOffset.left
      }
    },
    offsetParent: function () {
      return this.map(function () {
        var parent = this.offsetParent || document.body
        while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
          parent = parent.offsetParent
        return parent
      })
    }
  }

  // for now
  $.fn.detach = $.fn.remove

    // Generate the `width` and `height` functions
    ;['width', 'height'].forEach(function (dimension) {
      var dimensionProperty =
        dimension.replace(/./, function (m) { return m[0].toUpperCase() })

      $.fn[dimension] = function (value) {
        var offset, el = this[0]
        if (value === undefined) return isWindow(el) ? el['inner' + dimensionProperty] :
          isDocument(el) ? el.documentElement['scroll' + dimensionProperty] :
            (offset = this.offset()) && offset[dimension]
        else return this.each(function (idx) {
          el = $(this)
          el.css(dimension, funcArg(this, value, idx, el[dimension]()))
        })
      }
    })

  function traverseNode(node, fun) {
    fun(node)
    for (var i = 0, len = node.childNodes.length; i < len; i++)
      traverseNode(node.childNodes[i], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function (operator, operatorIndex) {
    var inside = operatorIndex % 2 //=> prepend, append

    $.fn[operator] = function () {
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var argType, nodes = $.map(arguments, function (arg) {
        var arr = []
        argType = type(arg)
        if (argType == "array") {
          arg.forEach(function (el) {
            if (el.nodeType !== undefined) return arr.push(el)
            else if ($.zepto.isZ(el)) return arr = arr.concat(el.get())
            arr = arr.concat(zepto.fragment(el))
          })
          return arr
        }
        return argType == "object" || arg == null ?
          arg : zepto.fragment(arg)
      }),
        parent, copyByClone = this.length > 1
      if (nodes.length < 1) return this

      return this.each(function (_, target) {
        parent = inside ? target : target.parentNode

        // convert all methods to a "before" operation
        target = operatorIndex == 0 ? target.nextSibling :
          operatorIndex == 1 ? target.firstChild :
            operatorIndex == 2 ? target :
              null

        var parentInDocument = $.contains(document.documentElement, parent)

        nodes.forEach(function (node) {
          if (copyByClone) node = node.cloneNode(true)
          else if (!parent) return $(node).remove()

          parent.insertBefore(node, target)
          if (parentInDocument) traverseNode(node, function (el) {
            if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
              (!el.type || el.type === 'text/javascript') && !el.src) {
              var target = el.ownerDocument ? el.ownerDocument.defaultView : window
              target['eval'].call(target, el.innerHTML)
            }
          })
        })
      })
    }

    // after    => insertAfter
    // prepend  => prependTo
    // before   => insertBefore
    // append   => appendTo
    $.fn[inside ? operator + 'To' : 'insert' + (operatorIndex ? 'Before' : 'After')] = function (html) {
      $(html)[operator](this)
      return this
    }
  })

  // 非常关键的代码，设置对应的原型，从而可以保证$实例正确访问到对应的方法

  zepto.Z.prototype = Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.uniq = uniq
  zepto.deserializeValue = deserializeValue
  $.zepto = zepto

  return $
})()

// 将Zepto挂载到window对象上
// 注意哟，这里没有进行amd，cmd形式的模块化

// If `$` is not yet defined, point it to `Zepto`
window.Zepto = Zepto

// 防止全局的$冲突
// 比起jQ，_等库提供noConflict方冲突，这种形式不太灵活

window.$ === undefined && (window.$ = Zepto)
