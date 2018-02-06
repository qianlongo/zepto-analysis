//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  // 终止在当前链的最新过滤操作，并返回匹配的元素的以前状态。
  // 可以参考https://www.jquery123.com/end/
  $.fn.end = function(){
    return this.prevObject || $()
  }

  $.fn.andSelf = function(){
    return this.add(this.prevObject || $())
  }
  // 重写以下方法，并在返回结果值中存储prevObject属性，即原来状态的"实例"
  'filter,add,not,eq,first,last,find,closest,parents,parent,children,siblings'.split(',').forEach(function(property){
    var fn = $.fn[property]
    $.fn[property] = function(){
      var ret = fn.apply(this, arguments)
      ret.prevObject = this
      return ret
    }
  })
})(Zepto)
