//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

/**
 * getComputedStyle mdn文档 https://developer.mozilla.org/zh-CN/docs/Web/API/Window/getComputedStyle
 */

;(function(){
  // getComputedStyle shouldn't freak out when called
  // without a valid element as argument
  // 重写getComputedStyle
  // 第一个参数如果不是元素节点则会抛出错误，被catch捕获，并被重写。
  // 重写后的方法，如果传入的第一个参数不是元素节点，被catch捕获，返回null，则不影响后续代码的运行
  try {
    getComputedStyle(undefined)
  } catch(e) {
    var nativeGetComputedStyle = getComputedStyle
    window.getComputedStyle = function(element, pseudoElement){
      try {
        return nativeGetComputedStyle(element, pseudoElement)
      } catch(e) {
        return null
      }
    }
  }
})()
