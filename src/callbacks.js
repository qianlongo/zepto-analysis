//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  // Create a collection of callbacks to be fired in a sequence, with configurable behaviour
  // Option flags:
  //   - once: Callbacks fired at most one time. // 回调函数只能触发一次
  //   - memory: Remember the most recent context and arguments // 记录上一次触发回调函数列表时的参数，后面添加的函数都用这些参数立即执行
  //   - stopOnFalse: Cease iterating over callback list // 回调函数返回false时，中断执行
  //   - unique: Permit adding at most one instance of the same callback // 一个回调函数只能添加一次
  $.Callbacks = function(options) {
    options = $.extend({}, options)

    var memory, // Last fire value (for non-forgettable lists) 
        fired,  // Flag to know if list was already fired //是否回调过
        firing, // Flag to know if list is currently firing // 回调函数列表是否正在执行中
        firingStart, // First callback to fire (used internally by add and fireWith) // 第一回调用回调函数的下标
        firingLength, // End of the loop when firing // 回调函数列表的长度
        firingIndex, // Index of currently firing callback (modified by remove if needed) // 
        list = [], // Actual callback list // 回调函数列表
        stack = !options.once && [], // Stack of fire calls for repeatable lists
        fire = function(data) {
          // 记忆模式，触发回调函数之后，再添加新回调，也立即触发
          memory = options.memory && data
          // 只要调用过一次fire，则将fired状态设置为true，表示已经回调过
          fired = true
          // 触发回调函数的初始索引
          firingIndex = firingStart || 0
          firingStart = 0
          firingLength = list.length
          // 标记正在回调
          firing = true
          for ( ; list && firingIndex < firingLength ; ++firingIndex ) {
            // 如果执行list中的函数返回false，并且为stopOnFalse模式，则将回调执行中断
            if (list[firingIndex].apply(data[0], data[1]) === false && options.stopOnFalse) {
              memory = false
              break
            }
          }
          // 所有的回调执行完毕
          firing = false
          if (list) {
            if (stack) stack.length && fire(stack.shift())
            else if (memory) list.length = 0
            else Callbacks.disable()
          }
        },

        Callbacks = {
          // 添加回调
          add: function() {
            if (list) {
              // 该变量控制memory模式时，只立即调用后面添加的函数
              var start = list.length,
                  add = function(args) {
                    $.each(args, function(_, arg){
                      if (typeof arg === "function") {
                        // 未指定unique为true，可以添加相同的函数多次
                        // 指定unique为true，相同的函数只添加一次
                        // 短路的妙用
                        if (!options.unique || !Callbacks.has(arg)) list.push(arg)
                      }
                      // 伪数组，数组递归调用
                      else if (arg && arg.length && typeof arg !== 'string') add(arg)
                    })
                  }
              add(arguments)
              // 什么场景下会出现这种情况？
              // 如果列表还在执行中，重新修正firingLength，这样后面添加的函数也可以执行
              if (firing) firingLength = list.length
              else if (memory) {
                // 修正开始执行回调的下标
                firingStart = start
                // 立刻执行,这里的参数拿的是上一次fire传进去的值[context, args]
                fire(memory)
              }
            }
            return this
          },
          // 移除回调
          remove: function() {
            if (list) {
              $.each(arguments, function(_, arg){
                var index
                // 不太理解这里为什么要用while来做？直接用if判断不就是可以？
                // 明白了，对于没有指定once的情况下，有可能对于同一个函数会添加多次，可以通过循环，逐个删除
                while ((index = $.inArray(arg, list, index)) > -1) {
                  list.splice(index, 1)
                  // Handle firing indexes
                  if (firing) {
                    if (index <= firingLength) --firingLength
                    // 当前删除的函数的索引在当前正在执行的函数前，递减索引下标
                    if (index <= firingIndex) --firingIndex
                  }
                }
              })
            }
            return this
          },
          // 查询指定的回调函数是否在列表中
          has: function(fn) {
            return !!(list && (fn ? $.inArray(fn, list) > -1 : list.length))
          },
          // 清空回调函数列表
          empty: function() {
            firingLength = list.length = 0
            return this
          },
          // 禁用回调函数
          disable: function() {
            list = stack = memory = undefined
            return this
          },
          // 判断是否禁用了回调函数，如果禁用，list变成了undefined
          disabled: function() {
            return !list
          },
          // 锁定
          lock: function() {
            stack = undefined
            if (!memory) Callbacks.disable()
            return this
          },
          // 回调列表是否被锁定
          locked: function() {
            return !stack
          },
          fireWith: function(context, args) {
            // 未回调过，没有锁定，没有禁用
            if (list && (!fired || stack)) {
              args = args || []
              args = [context, args.slice ? args.slice() : args]
              if (firing) stack.push(args)
              else fire(args)
            }
            return this
          },
          // 执行回调
          fire: function() {
            return Callbacks.fireWith(this, arguments)
          },
          // 回调函数列表是否被回调过
          fired: function() {
            return !!fired
          }
        }

    return Callbacks
  }
})(Zepto)
