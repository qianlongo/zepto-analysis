//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.
// https://www.fngtps.com/2010/mobile-safari-image-resource-limit-workaround/
// 为了解决 Safari 移动版加载图片过大过多时崩溃的问题而诞生的模块
// https://segmentfault.com/q/1010000003285644 这是小A师兄在sg的回答 棒

;(function($){
  var cache = [], timeout

  /**
   *  1. 用较小的图片替代原图片
   *  2. 将图片元素存入cache数组，便于后续垃圾回收器回收
   *  3. 通过removeChild删除元素
   */

  $.fn.remove = function(){
    return this.each(function(){
      if(this.parentNode){
        if(this.tagName === 'IMG'){
          cache.push(this)
          this.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
          if (timeout) clearTimeout(timeout)
          timeout = setTimeout(function(){ cache = [] }, 60000)
        }
        this.parentNode.removeChild(this)
      }
    })
  }
})(Zepto)
