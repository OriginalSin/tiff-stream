// https://github.com/JounQin/touch-lite/blob/master/docs/index.es6
const trueType = value => Object.prototype.toString.call(value).split('').slice(8, -1).join('')

const trueTypeFunc = type => value => type === trueType(value)

const utils = {}

const TYPES = ['Array', 'Function', 'Object', 'String']

for (let i = 0, len = TYPES.length; i < len; i++) {
  const type = TYPES[i]
  utils[`is${type}`] = trueTypeFunc(type)
}

const { isArray, isFunction, isObject, isString } = utils

const on = (el, type, listener) => {
  if (isObject(type)) {
    for (let t in type) {
      on(el, t, type[t])
    }
    return
  }

  if (!isString(type) || /^ +$/.test(type)) return

  const events = type.split(' ')

  let len

  if ((len = events.length) > 1) {
    for (let i = 0; i < len; i++) {
      on(el, events[i], listener)
    }
    return
  }

  if (el.addEventListener) {
    el.addEventListener(type, listener, false)
  } else if (el.attachEvent) {
    el.attachEvent('on' + type, listener)
  } else {
    el['on' + type] = listener
  }
}

const off = (el, type, listener) => {
  if (isObject(type)) {
    for (let t in type) {
      off(el, t, type[t])
    }
    return
  }

  if (el.removeEventListener) {
    el.removeEventListener(type, listener, false)
  } else if (el.detachEvent) {
    el.detachEvent('on' + type, listener)
  } else {
    el['on' + type] = null
  }
}

const extend = (target, ...sources) => {
  for (let i = 0, len = sources.length; i < len; i++) {
    const source = sources[i]
    if (source != null) {
      for (let key in source) {
        target[key] = source[key]
      }
    }
  }
  return target
}

const indexOf = (arr, item) => {
  for (let i = 0, len = arr.length; i < len; i++) {
    if (arr[i] === item) return i
  }
  return -1
}

const EVENTS = [
  'start',
  'moveStart',
  'moving',
  'moveEnd',
  'end',
  'tab',
  'dblTap',
  'mltTap',
  'press',
  'pressing',
  'swipeLeft',
  'swipeRight',
  'swipeUp',
  'swipeDown'
]

const MOUSE_DOWN = 'mousedown'
const MOUSE_MOVE = 'mousemove'
const MOUSE_UP = 'mouseup'

const EVENT = {
  start: `touchstart ${MOUSE_DOWN}`,
  move: 'touchmove',
  end: 'touchend touchcancel'
}

export default class Touch {
  constructor(el, { events } = {}) {
    this.el = el
    this.touchSupport = true
    this._listeners = {}

    this._init()

    if (!events) return

    this.on(events)
  }

  on(event, handler) {
    if (isObject(event)) {
      for (let e in event) {
        this.on(e, event[e])
      }
      return this
    }

    if (isArray(handler)) {
      for (let i = 0, len = handler.length; i < len; i++) {
        this.on(event, handler[i])
      }
      return this
    }

    if (!isFunction(handler)) return this

    let handlers = this._listeners[event]

    if (!handlers) {
      handlers = this._listeners[event] = []
    }

    if (indexOf(handlers, handler) === -1) {
      handlers.push(handler)
    }

    return this
  }

  off(event, handler) {
    if (!handler) {
      this._listeners[event] = []
      return this
    }

    const handlers = this._listeners[event]

    const index = indexOf(handlers, handler)

    if (index !== -1) {
      handlers.splice(index, 1)
    }

    return this
  }

  trigger(event, e) {
    const handlers = this._listeners[event]

    if (!handlers) return

    for (let i = 0, len = handlers.length; i < len; i++) {
      if (handlers[i].call(this, e) === false) {
        return false
      }
    }
  }

  destroy() {
    off(this.el, {
      [EVENT.start]: this._eStart,
      [EVENT.move]: this._eMove,
      [EVENT.end]: this._eEnd
    })
  }

  _init() {
    this._start()
    this._move()
    this._end()
  }

  actualEvent(e, prevent, stop) {
    prevent && e.preventDefault && e.preventDefault()
    stop && e.stopPropagation && e.stopPropagation()
    const touches = e.changedTouches
    return touches ? touches[0] : e
  }

  _isPrevent(event, e) {
    if (this.trigger(event, e) === false) return true
  }

  _start() {
    clearTimeout(this._timeout)

    on(
      this.el,
      EVENT.start,
      (this._eStart = e => {
        const isMouseDown = e.type === MOUSE_DOWN

        if (isMouseDown) {
          this.touchSupport = false
          on(document, {
            [MOUSE_MOVE]: this._eMove,
            [MOUSE_UP]: this._eEnd
          })
        }
		const srcElement = e.srcElement;

        e = this.actualEvent(e, !isMouseDown && /Android 4\./.test(navigator.userAgent))

        extend(this, {
          _clientX: e.clientX,
          _clientY: e.clientY,
          _startTime: Date.now()
        })

        this._isPrevent('start', e) && (this._doNotMove = true)
      })
    )
  }

  _move() {
    on(
      this.el,
      EVENT.move,
      (this._eMove = e => {
        if (!this._startTime || this._doNotMove) return
		const srcElement = e.srcElement;

        e = this.actualEvent(e)

        const { clientX, clientY } = e
        const { _clientX: originalClientX, _clientY: originalClientY } = this

        const changedX = clientX - originalClientX
        const changedY = clientY - originalClientY

        if (Math.abs(changedX) > 5 || Math.abs(changedY) > 5) this._moved = true

        if (this._moved && !this._moveStarted) {
          if (this._isPrevent('moveStart', e)) return
          this._moveStarted = true
        }

        if (!this._moveStarted) return

        extend(this, { changedX, changedY })

		if (!e.srcElement) e.srcElement = srcElement;
        this._isPrevent('moving', e)
      })
    )
  }

  _end() {
    on(
      this.el,
      EVENT.end,
      (this._eEnd = e => {
        if (e.type === MOUSE_UP) {
          off(document, {
            [MOUSE_MOVE]: this._eMove,
            [MOUSE_UP]: this._eEnd
          })
        }

        if (!this._startTime) return

        const { _clientX, _clientY, _moved, _startTime } = this

        delete this._clientX
        delete this._clientY
        delete this._doNotMove
        delete this._moved
        delete this._moveStarted
        delete this._startTime

        if (_moved) {
          const changedX = e.clientX - _clientX
          const changedY = e.clientY - _clientY

          extend(this, { changedX, changedY })

          if (this._isPrevent('moveEnd', e)) return

          const absChangedX = Math.abs(changedX)
          const absChangedY = Math.abs(changedY)

          let event
          if (absChangedX < 20) {
            if (changedY > 50) {
              event = 'swipeDown'
            } else if (changedY < -50) {
              event = 'swipeUp'
            }
          } else if (absChangedY < 20) {
            if (changedX > 50) {
              event = 'swipeRight'
            } else if (changedX < -50) {
              event = 'swipeLeft'
            }
          }
          if (this._isPrevent(event, e)) return

          return this._isPrevent('end', e)
        }

        const duration = Date.now() - _startTime

        this._tapped = this._tapped + 1 || 1

        if (duration > 200) return this._isPrevent('press', e) && this._isPrevent('end', e)

        this._timeout = setTimeout(() => {
          const tapped = this._tapped

          delete this._tapped
          delete this._timeout

          if (tapped < 3) {
            const isSingle = tapped === 1
            const tapEvent = isSingle ? 'tap' : 'dblTap'

            if (this._isPrevent(tapEvent, e)) return

            const eventInit = {
              bubbles: true,
              cancelable: true,
              cancelBubble: true
            }

            const prefix = isSingle ? '' : 'dbl'

            if (this.touchSupport && e.target.dispatchEvent(new Event(`${prefix}click`, eventInit)) === false) return

            if (e.target.dispatchEvent(new Event(`${prefix}tap`, eventInit)) === false) return
          } else {
            extend(this, { tapped })
            if (this._isPrevent('mltTap', e)) return
          }
          this._isPrevent('end', e)
        }, 200)
      })
    )
  }
}
