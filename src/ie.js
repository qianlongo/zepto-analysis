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
