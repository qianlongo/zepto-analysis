//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  var touch = {},
    // 各种事件的定时器
    touchTimeout, tapTimeout, swipeTimeout, longTapTimeout,
    // 长按事件定时器时间
    longTapDelay = 750,
    gesture

  /**
   * 判断移动的方向,结果是Left, Right, Up, Down中的一个
   * @param  {} x1 起点的横坐标
   * @param  {} x2 终点的横坐标
   * @param  {} y1 起点的纵坐标
   * @param  {} y2 终点的纵坐标
   */
  function swipeDirection(x1, x2, y1, y2) {
    /**
     * 1. 第一个三元运算符得到如果x轴滑动的距离比y轴大，那么是左右滑动，否则是上下滑动
     * 2. 如果是左右滑动，起点比终点大那么往左滑动
     * 3. 如果是上下滑动，起点比终点大那么往上滑动
     * 需要注意的是这里的坐标和数学中的有些不一定 纵坐标有点反过来的意思
     * 起点p1(1, 0) 终点p2(1, 1)
     */
    return Math.abs(x1 - x2) >=
      Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
  }

  // 长按事件

  function longTap() {
    longTapTimeout = null
    if (touch.last) {
      // 触发el元素的longTap事件
      touch.el.trigger('longTap')
      touch = {}
    }
  }

  // 取消长按

  function cancelLongTap() {
    if (longTapTimeout) clearTimeout(longTapTimeout)
    longTapTimeout = null
  }

  // 取消所有事件

  function cancelAll() {
    if (touchTimeout) clearTimeout(touchTimeout)
    if (tapTimeout) clearTimeout(tapTimeout)
    if (swipeTimeout) clearTimeout(swipeTimeout)
    if (longTapTimeout) clearTimeout(longTapTimeout)
    touchTimeout = tapTimeout = swipeTimeout = longTapTimeout = null
    touch = {}
  }

  // 

  function isPrimaryTouch(event){
    return (event.pointerType == 'touch' ||
      event.pointerType == event.MSPOINTER_TYPE_TOUCH)
      && event.isPrimary
  }

  // 是否是PointerEvent https://developer.mozilla.org/zh-CN/docs/Web/API/PointerEvent

  function isPointerEventType(e, type){
    return (e.type == 'pointer'+type ||
      e.type.toLowerCase() == 'mspointer'+type)
  }

  $(document).ready(function(){
    /**
     * now 当前触摸时间
     * delta 两次触摸的时间差
     * deltaX 两次触摸x轴位移
     * deltaY 两次触摸Y轴位移
     * firstTouch 触摸点相关信息
     * _isPointerType 是否是pointerType
     */
    var now, delta, deltaX = 0, deltaY = 0, firstTouch, _isPointerType
    // 处理ie中的手势场景 https://developer.mozilla.org/en-US/docs/Web/API/MSGestureEvent
    if ('MSGesture' in window) {
      // 创建手势对象
      gesture = new MSGesture()
      // 指定目标元素
      gesture.target = document.body
    }

    $(document)
      .bind('MSGestureEnd', function(e){
        /**
         * velocityX, velocityY分别是横轴和纵轴的速率
         */
        var swipeDirectionFromVelocity =
          e.velocityX > 1 ? 'Right' : e.velocityX < -1 ? 'Left' : e.velocityY > 1 ? 'Down' : e.velocityY < -1 ? 'Up' : null
        if (swipeDirectionFromVelocity) {
          touch.el.trigger('swipe')
          touch.el.trigger('swipe'+ swipeDirectionFromVelocity)
        }
      })
      .on('touchstart MSPointerDown pointerdown', function(e){
        // 非触屏事件直接return
        if((_isPointerType = isPointerEventType(e, 'down')) &&
          !isPrimaryTouch(e)) return
        // 事件e兼容处理
        firstTouch = _isPointerType ? e : e.touches[0]
        // 清空终点坐标
        // 一般情况下，在touchend或者cancel的时候，会将其清除，如果用户调阻止了默认事件，则有可能清空不了
        if (e.touches && e.touches.length === 1 && touch.x2) {
          // Clear out touch movement data if we have it sticking around
          // This can occur if touchcancel doesn't fire due to preventDefault, etc.
          touch.x2 = undefined
          touch.y2 = undefined
        }
        // 保存当前时间
        now = Date.now()
        // 保存两次点击时候的时间间隔，主要用作双击事件
        delta = now - (touch.last || now)
        // touch.el 报错目标节点
        // 不是标签节点则使用该节点的父节点，注意有伪元素
        touch.el = $('tagName' in firstTouch.target ?
          firstTouch.target : firstTouch.target.parentNode)
        // touchTimeout 存在则清除之
        touchTimeout && clearTimeout(touchTimeout)
        // （x1, y1）（x轴，y轴）
        touch.x1 = firstTouch.pageX
        touch.y1 = firstTouch.pageY
        // 两次点击的时间 > 0 且 < 250 毫秒，则当做doubleTap事件处理
        if (delta > 0 && delta <= 250) touch.isDoubleTap = true
        // 将now设置为touch.last，方便上面可以计算两次点击的时间差
        touch.last = now
        // 开始进行长按事件
        longTapTimeout = setTimeout(longTap, longTapDelay)
        // adds the current touch contact for IE gesture recognition
        if (gesture && _isPointerType) gesture.addPointer(e.pointerId)
      })
      .on('touchmove MSPointerMove pointermove', function(e){
        if((_isPointerType = isPointerEventType(e, 'move')) &&
          !isPrimaryTouch(e)) return
        firstTouch = _isPointerType ? e : e.touches[0]
        // 取消长按事件，都移动了，当然不是长按了
        cancelLongTap()
        // (x2, y2) 终点坐标
        touch.x2 = firstTouch.pageX
        touch.y2 = firstTouch.pageY
        // 分别记录X轴和Y轴的位移
        deltaX += Math.abs(touch.x1 - touch.x2)
        deltaY += Math.abs(touch.y1 - touch.y2)
      })
      .on('touchend MSPointerUp pointerup', function(e){
        if((_isPointerType = isPointerEventType(e, 'up')) &&
          !isPrimaryTouch(e)) return
        // 取消长按事件  
        cancelLongTap()
        // 滑动事件，只要X轴或者Y轴的起始点和终点的举例超过30则认为是滑动，并触发滑动(swip)事件,
        // 紧接着马上触发对应方向的swip事件（swipLeft, swipRight, swipUp, swipDown）
        // swipe
        if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
            (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30))

          swipeTimeout = setTimeout(function() {
            if (touch.el){
              touch.el.trigger('swipe')
              touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
            }
            touch = {}
          }, 0)
        // touch对象的last属性，在touchstart事件中添加，所以触发了start事件便会存在  
        // normal tap
        else if ('last' in touch)
          // don't fire tap when delta position changed by more than 30 pixels,
          // for instance when moving to a point and back to origin
          // 只有当X轴和Y轴的位移都小于30的时候，才认为有可能触发tap事件
          if (deltaX < 30 && deltaY < 30) {
            // delay by one tick so we can cancel the 'tap' event if 'scroll' fires
            // ('tap' fires before 'scroll')
            tapTimeout = setTimeout(function() {

              // trigger universal 'tap' with the option to cancelTouch()
              // (cancelTouch cancels processing of single vs double taps for faster 'tap' response)
              // 创建自定义事件
              var event = $.Event('tap')
              // 往自定义事件中添加cancelTouch回调函数，这样使用者可以通过该方法取消所有的事件
              event.cancelTouch = cancelAll
              // [by paper] fix -> "TypeError: 'undefined' is not an object (evaluating 'touch.el.trigger'), when double tap
              // 当目标元素存在，触发tap自定义事件
              if (touch.el) touch.el.trigger(event)

              // trigger double tap immediately
              // 如果是doubleTap事件，则触发之，并清除touch
              if (touch.isDoubleTap) {
                if (touch.el) touch.el.trigger('doubleTap')
                touch = {}
              }

              // trigger single tap after 250ms of inactivity
              // 否则在250毫秒之后。触发单击事件
              else {
                touchTimeout = setTimeout(function(){
                  touchTimeout = null
                  if (touch.el) touch.el.trigger('singleTap')
                  touch = {}
                }, 250)
              }
            }, 0)
          } else {
            // 不是tap事件
            touch = {}
          }
          // 最后将位移信息清空
          deltaX = deltaY = 0

      })
      // when the browser window loses focus,
      // for example when a modal dialog is shown,
      // cancel all ongoing events
      .on('touchcancel MSPointerCancel pointercancel', cancelAll)

    // scrolling the window indicates intention of the user
    // to scroll, not tap or swipe, so cancel all ongoing events
    $(window).on('scroll', cancelAll)
  })
  /**
   * swipe 滑动事件
   * swipLeft 向左滑动
   * swipRight 向右滑动
   * swipUp 向上滑动
   * swipDown 向下滑动
   * doubleTap 双击
   * tap 屏幕点击事件
   * singleTap 屏幕单击
   * longTap 长按事件
   */
  ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown',
    'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function(eventName){
    $.fn[eventName] = function(callback){ return this.on(eventName, callback) }
  })
})(Zepto)
