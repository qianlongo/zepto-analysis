//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

// The following code is heavily inspired by jQuery's $.fn.data()

;(function($){
  /**
   * data 存储于dom相映射的数据数据结构如同下
   * {
   *   1： {
   *      name: 'qianlongo',
   *      sex: 'boy'
   *    },
   *   2: {
   *      age: 100
   *    }
   * }
   * 
   * dataAttr $原型上的data方法
   * camelize 中划线转小驼峰函数
   * exp => Zepto1507004986420 设置在dom上的属性，value是data中的key
   */
  var data = {}, dataAttr = $.fn.data, camelize = $.camelCase,
    exp = $.expando = 'Zepto' + (+new Date()), emptyArray = []

  // Get value from node:
  // 1. first try key as given,
  // 2. then try camelized key,
  // 3. fall back to reading "data-*" attribute.

  // 根据设置元素data的时候的exp标志，获取name对应的value

  function getData(node, name) {
    // 首先获取node节点的exp属性，然后根据id获取对应的store对象
    var id = node[exp], store = id && data[id]
    // 当没有传入指定的name时，直接返回整个store，否则返回node所有自定义属性
    if (name === undefined) return store || setData(node)
    else {
      // else 处理传入了name属性场景
      // 如果store存在
      if (store) {
        // 并且name属性在store中存在，则将其值返回
        if (name in store) return store[name]
        // 如果指定的name不在store中，则将name属性小驼峰化
        // 再判断驼峰化后的属性camelName是否在store中，在就将其对应的值返回
        var camelName = camelize(name)
        if (camelName in store) return store[camelName]
      }
      // 如果store中不存在name属性，就调用原型上的data方法获取
      return dataAttr.call($(node), name)
    }
  }

  // Store value under camelized key on node
  function setData(node, name, value) {
    var id = node[exp] || (node[exp] = ++$.uuid),
      store = data[id] || (data[id] = attributeData(node))
    if (name !== undefined) store[camelize(name)] = value
    return store
  }

  // Read all "data-*" attributes from a node
  function attributeData(node) {
    var store = {}
    $.each(node.attributes || emptyArray, function(i, attr){
      if (attr.name.indexOf('data-') == 0)
        store[camelize(attr.name.replace('data-', ''))] =
          $.zepto.deserializeValue(attr.value)
    })
    return store
  }

  // 在匹配元素上存储任意相关数据
  // 或返回匹配元素集合中第一个元素的给定名称的数据存储的值。

  $.fn.data = function(name, value) {
    // value为undefined并且name不是纯object表示获取key为name的数据
    // value不为undefined或者name为纯对象表示设置数据
    return value === undefined ?
      // set multiple values via object
      // 当value是undefined并且name是个纯object的时候，遍历当前匹配的元素集合，并使用each方法遍历对象name，给素有元素设置数据
      $.isPlainObject(name) ?
        this.each(function(i, node){
          $.each(name, function(key, value){ setData(node, key, value) })
        }) :
        // get value from first element
        (0 in this ? getData(this[0], name) : undefined) :
      // set value on all elements
      // 遍历当前匹配的元素集合，通过调用setData方法，给素有元素设置数据
      this.each(function(){ setData(this, name, value) })
  }

  $.data = function(elem, name, value) {
    return $(elem).data(name, value)
  }

  $.hasData = function(elem) {
    var id = elem[exp], store = id && data[id]
    return store ? !$.isEmptyObject(store) : false
  }

  $.fn.removeData = function(names) {
    if (typeof names == 'string') names = names.split(/\s+/)
    return this.each(function(){
      var id = this[exp], store = id && data[id]
      if (store) $.each(names || store, function(key){
        delete store[names ? camelize(this) : key]
      })
    })
  }

  // Generate extended `remove` and `empty` functions
  ;['remove', 'empty'].forEach(function(methodName){
    var origFn = $.fn[methodName]
    $.fn[methodName] = function() {
      var elements = this.find('*')
      if (methodName === 'remove') elements = elements.add(this)
      elements.removeData()
      return origFn.call(this)
    }
  })
})(Zepto)
