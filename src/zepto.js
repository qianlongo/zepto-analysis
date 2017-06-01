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
    elementDisplay = {}, 
    classCache = {},

    // 保存css中可以是数值的属性

    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1, 'opacity': 1, 'z-index': 1, 'zoom': 1 },

    // 匹配文档碎片的正则

    fragmentRE = /^\s*<(\w+|!)[^>]*>/,

    // 匹配单标签形式<div></div>

    singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
    tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    rootNodeRE = /^(?:body|html)$/i,

    // 匹配大写字母

    capitalRE = /([A-Z])/g,

    // special attributes that should be get/set via method calls
    methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

    // 

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
    camelize, 
    uniq,

    // 一个临时的空节点

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

  // 用以判断某个类是否在className中的正则表达式
  // 主要用早hasClass，removeClass

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  // 根据传入的name来判断是否需要加'px'单位，这个函数在样式操作中有用
  // 如果传入的value是个数值而不是(10px)这种.
  // 再判断name(比如fintSize => font-size)是否在cssNumber中
  // 不在cssNumber中就加px单位

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  // 获取某种元素的默认显示方式(这里比较重要，不同的元素默认的显示方式是不一样)

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      // 穿件给定标签名的元素
      element = document.createElement(nodeName)
      // 将element装进body中，不然无法获取到属性值
      document.body.appendChild(element)
      // 注意getPropertyValue,拿到diaplay的默认值
      display = getComputedStyle(element, '').getPropertyValue("display")
      // 把刚才装进body的元素删除掉
      element.parentNode.removeChild(element)
      // 如果display为none，手动将其设置为block（这是为什么呢？样式覆盖？）
      display == "none" && (display = "block")
      // 缓存进elementDisplay，方便下次直接读取
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

  // 判断object是不是zepto对象

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

  // 对arg参数进行处理
  // 当arg是个函数的时候，返回的是以arg为执行函数且其执行上下文为context，而参数则是idx和payload
  // 不是函数就直接返回arg

  function funcArg(context, arg, idx, payload) {
    return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  // 设置或者删除节点的属性
  // 当没有传value的时候，就讲node的name属性给删除
  // 传了就设置node的name属性为value

  function setAttribute(node, name, value) {
    value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
  }

  // 获取或者设置node的className
  // 对于svg类型的标签需要特别的注意，其className得到的是一个对象,类似下面这样
  // SVGAnimatedString {baseVal: "box hallo", animVal: "box hallo"}

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

  // 判断是否为空对象
  // 使用for in遍历，只要obj有属性则认为不是空对象
  // 循环跑完还没结束则认为是空对象

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

  // 包含浏览器对默写api的支持情况

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

  // $构造函数的原型上挂许多实用的方法

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

    // DOMContentloaded的时候处罚 callback

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

    // 过滤出符合selector规则的元素集合
    // 如果selector是个函数，就两次调用下not函数，第一次得到的是不符合selector结果的，再次调用not，得到的就是符合的了
    // 如果不是函数的话就遍历当前元素，使用zepto.matches进行判断

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

    // 判断集合中的第一个元素是否符合指定的选择器

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

    // 判断当前集合的子元素中是否有符合选择器selector的元素
    // 或者包含指定的dom节点
    // has(selector) => collection
    // has(node) => collection

    has: function (selector) {
      // 使用filter方法将符合条件的元素过滤出来
      return this.filter(function () {
        // 如果参数是dom节点，使用$.contains进行判断
        return isObject(selector) ?
          $.contains(this, selector) :
          // 否则调用find函数进行查找
          $(this).find(selector).size()
      })
    },

    // 与get方法不同，get得到的是原生的dom节点，eq得到的是zepto对象，所以可以直接使用zepto原型上的相关方法

    eq: function (idx) {
      // 参数为-1得到最后一个元素
      // 否则取出idx到idx + 1，即索引为idx的元素
      // 为什么-1要单独处理呢？如果idx为负一还使用？后面的表达式则拿不到最后一个元素，为[]空数组
      // [1, 2, 3].slice(-1, 0) => []
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

    // 在当前集合中查找符合选择器的所有后代元素，调用方式
    // find(selector)   => collection
    // find(collection) => collection
    // find(element)    => collection

    find: function (selector) {
      var result, $this = this
      // 如果没有传入选择器，返回一个空的zepto对象
      if (!selector) result = $()
      // 传入的是dom元素或者zepto对象，先用$将其包裹一下
      // 然后对包裹之后的元素进行过滤，过滤出当前集合中符合其条件的
      else if (typeof selector == 'object')
        result = $(selector).filter(function () {
          var node = this
          return emptyArray.some.call($this, function (parent) {
            return $.contains(parent, node)
          })
        })
      // 当前集合只有一个元素时，通过zepto.qsa查找后代元素
      else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
      // 其他情况，则是将当前集合中的每个元素都调用zepto.qsa进行查找
      // 其实应该可以和上面length为1合并在一起吧？或许为了性能？
      else result = this.map(function () { return zepto.qsa(this, selector) })
      return result
    },

    // 

    closest: function (selector, context) {
      var nodes = [], collection = typeof selector == 'object' && $(selector)
      this.each(function (_, node) {
        while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
          node = node !== context && !isDocument(node) && node.parentNode
        if (node && nodes.indexOf(node) < 0) nodes.push(node)
      })
      return $(nodes)
    },

    // 获取当前集合中每个元素的所有祖先元素

    parents: function (selector) {
      var ancestors = [], nodes = this
      // 通过while循环层层向上查找
      while (nodes.length > 0)
        nodes = $.map(nodes, function (node) {
          // 将各个元素的parentNode赋值给node，node不能是document节点，并且ancestors还未添加过
          if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },

    // 获取对象集合中所有元素的父节点，如果传了selector选择器，则众多父节点中帅选出符合其条件的
    // 实现原理也很简单，首先调用pluck拿到所有的父节点
    // 接着进行去重处理，毕竟有些元素有共同的父节点
    // 最后调用filtered帅选出符合selector条件的父节点

    parent: function (selector) {
      return filtered(uniq(this.pluck('parentNode')), selector)
    },

    // 获取对象集合中所有的直接子节点，如果传了selector选择器，则帅选出符合其条件的
    // 实现原理是先拿到当前集合的所有子节点
    // 然后对这些子节点进行过滤，得到符合selector条件的节点

    children: function (selector) {
      return filtered(this.map(function () { return children(this) }), selector)
    },

    // 获取当前集合中所有元素的子节点(和children不同的是，contents还会去拿文本节点和注释节点)
    // 注意contentDocument这个属性，他是拿iframe的内容

    contents: function () {
      return this.map(function () { return this.contentDocument || slice.call(this.childNodes) })
    },

    // 获取对象集合中所有元素的兄弟节点
    // 实现思路就是先获取当前元素的父节点，然后获取该父节点的所有子节点
    // 再从所有子节点中去掉当前元素
    // 最后如果传了selector，再将所有的子节点过滤出符合selector条件的

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

    // 获取集合对象中所有元素的指定property属性
    // 实现原理很简单，就是对当前的元素进行遍历，然后读取元素的property属性

    // `pluck` is borrowed from Prototype.js
    pluck: function (property) {
      return $.map(this, function (el) { return el[property] })
    },

    // 显示元素（这里的显示不一定是block，而是设置不同元素的默认显示）

    show: function () {
      return this.each(function () {
        // 清除元素的内联样式，设置为''便显示出来了
        this.style.display == "none" && (this.style.display = '')
        // 当样式表中的display为none时，设置为其默认值
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },

    // 将当前集合中的所有元素替换成新的元素newContent
    // 原理是先将newContent添加到当前元素集合的前面，再将当前元素移除
    // 为什么不用原生的parent.replaceChild(dom1. dom2)呢

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

    // 将当前元素赋值一份，注意是用了cloneNode这个原生方法，并且传了true
    // 意味着事件和当前元素的子节点也会被赋值
    // 其实true设置为参数动态传递应该会比较好吧

    clone: function () {
      return this.map(function () { return this.cloneNode(true) })
    },

    // 使用css方法，将当前元素隐藏

    hide: function () {
      return this.css("display", "none")
    },

    // 将元素显示隐藏进行切换
    // 显示 => 隐藏
    // 隐藏 => 显示
    // 如果没有传setting参数，就根据元素本身的显示隐藏状态进行切换
    // 否则根据setting进行切换

    toggle: function (setting) {
      return this.each(function () {
        var el = $(this)
          ; (setting === undefined ? el.css("display") == "none" : setting) ? el.show() : el.hide()
      })
    },

    // 获取当前集合中所有元素的前一个兄弟节点
    // 实现思路就是先拿到当前集合所有节点的前一个兄弟节点，然后对其进行过滤处理，拿到符合selector条件的元素

    prev: function (selector) { return $(this.pluck('previousElementSibling')).filter(selector || '*') },

    // 获取当前集合中所有元素的下一个兄弟节点
    // 实现思路就是先拿到当前集合所有节点的后一个兄弟节点，然后对其进行过滤处理，拿到符合selector条件的元素

    next: function (selector) { return $(this.pluck('nextElementSibling')).filter(selector || '*') },

    // 获取或者设置当前集合的html
    // 如果html传了，就遍历设置
    // 没传就是获取（即返回当前集合的第一个元素的innerHTML）
    // 注意：这里的html参数可以是个函数,接收的参数是当前元素的索引和html

    html: function (html) {
      return 0 in arguments ?
        this.each(function (idx) {
          var originHtml = this.innerHTML
          $(this).empty().append(funcArg(this, html, idx, originHtml))
        }) :
        (0 in this ? this[0].innerHTML : null)
    },

    // text实现方法与html比较类似
    // 有些不同的是没有传参数的时候，html是获取第一个元素的innerHTML
    // text则是将当前所有元素的textContent拼接起来并返回

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

    // 获取element在当前集合中的索引值
    // 如果没有给到element，则获取当前集合中的第一个元素在兄弟节点中的索引

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
