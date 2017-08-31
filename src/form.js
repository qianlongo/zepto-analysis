//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  $.fn.serializeArray = function() {
    var name, type, result = [],
      add = function(value) {
        if (value.forEach) return value.forEach(add)
        result.push({ name: name, value: value })
      }
    // this[0].elements => 如果选中多个表单，只序列化第一个表单
    if (this[0]) $.each(this[0].elements, function(_, field){
      type = field.type, name = field.name
      // 排除掉fieldset,被禁止disable的元素,submit元素，以及reset,button，file和未被选中的radio，checkbox
      if (name && field.nodeName.toLowerCase() != 'fieldset' &&
        !field.disabled && type != 'submit' && type != 'reset' && type != 'button' && type != 'file' &&
        ((type != 'radio' && type != 'checkbox') || field.checked))
          // 调用add方法，将表单元素的name和value以{ name: name, value: value }形式添加到result数组中
          add($(field).val())
    })
    return result
  }

  // 将表单内容序列化为name=qianlongo&sex=boy的形式
  // 主要还是依赖serializeArray函数

  $.fn.serialize = function(){
    var result = []
    this.serializeArray().forEach(function(elm){
      // 每个表单的name和value都通过encodeURIComponent编码
      result.push(encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value))
    })
    // 最后通过&符号分割
    return result.join('&')
  }

  $.fn.submit = function(callback) {
    // 如果传了回调函数，则在选中的元素上添加submit事件
    // 为什么不用on呢？
    if (0 in arguments) this.bind('submit', callback)
    // 否则在没有传递回调函数的情况下，并且选中有表单元素  
    else if (this.length) {
      var event = $.Event('submit')
      // 触发选中的第一个表单的是submit事件，注意这里只是手动触发绑定的submit事件，并不会提交表单
      this.eq(0).trigger(event)
      // 如果没有阻止默认事件，便调用form.submit()提交表单
      if (!event.isDefaultPrevented()) this.get(0).submit()
    }
    return this
  }

})(Zepto)
