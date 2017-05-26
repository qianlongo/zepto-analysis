let ObjProto = Object.prototype
let toString = ObjProto.toString
let tempArray = ['Object', 'Array']
let _ = {}

tempArray.forEach((v, i) => {
  _[`is${v}`] = (obj) => {
    return toString.call(obj) === `[object ${v}]`
  }
})

let extend = (target, source) => {
  for (let key in source) {
    if (_.isObject(source[key]) && !(_.isObject(target[key]))) {
      target[key] = {}
      extend(target[key], source[key])
    } else if (_.isArray(source[key]) && !(_.isArray(target[key]))) {
      target[key] = []
      extend(target[key], source[key])
    } else {
      target[key] = source[key]
    }
  }
}

let target = {obj: {name: 'haha'}}
let source = {
  name: 'qianlogo',
  sex: 'boy',
  obj: {
    name: 'qianlogo',
    sex: 'boy',
    obj: {
      name: 'qianlogo',
      sex: 'boy'
    },
    arr: [1, 2, 3 ,4]
  }
}

extend(target, source)

console.log(target)