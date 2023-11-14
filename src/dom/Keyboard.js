import BindableObject from 'js-events-dispatcher';

class KeyEvens {
    get singleEvents() {
        return [];
    }

    get massEvents() {
        return [];
    }
    constructor(options = {}) {
		this._bindable = new BindableObject(this.singleEvents, this.massEvents);
    }
    // You should also define the methods below if your class supports the ability to bind from the outside.
    // This is useful if you are developing a package that will contain events that users can bind to.
    on(events, callback, canUnbind = true) {
        this._bindable.on(events, callback, canUnbind);

        return this;
    }
    one(events, callback, canUnbind = true) {
        this._bindable.one(events, callback, canUnbind);

        return this;
    }
    off(event = null, callback = null) {
        this._bindable.off(event, callback);

        return this;
    }

}
const delta = 15;
const getShift = (code) => {
	const out = [0, 0];
	switch(code) {
		case 'ArrowRight':	out[0] = delta; break;
		case 'ArrowLeft': 	out[0] = -delta; break;
		case 'ArrowDown':	out[1] = delta; break;
		case 'ArrowUp':		out[1] = -delta; break;
	}
	return out;
};
/**
 * Planet camera keyboard navigation. Use W,S,A,D and left shift key for fly around a planet.
 */

export default class Keyboard extends KeyEvens {
    get singleEvents() {
        return [
            ...super.singleEvents,
            'move1',
        ];
    }
    get massEvents() {
        return [
            ...super.massEvents,
            'move',
        ];
    }

    constructor(options = {}) {
        super();
        this.step = options.step || 0;
		this.bc = options.bc;
        this.state = false;
		// this.down = options.down || {};
		this.init();
    }

    //#endregion
/*

    method() {
        // Here we check for handlers for a specific event and, if there are any, call them.
        // We can also pass arg `thisArg` so that the handler references our class and not `BindableObject`.
        // Note: If you don't need to know if a handler exists, you don't have to call `.has()`
        if (this._bindable.has('showed')) {
            let result = this._bindable.call('showed', [], this)[0];  // get result only from first handler
            // ...
        } else {...}
    }
*/
    activate() {
		this.timeStamp = 0;
		document.addEventListener('keydown', this.down.bind(this));
		document.addEventListener('keyup', this.up.bind(this));
    }

    ondeactivate() {
    }

    init() {
        this.activate();
    }

    down(ev) {
		const {code, key, timeStamp} = ev;
		const p = timeStamp - this.step; 
		if (p > this.timeStamp || !this.timeStamp) {
		// console.log('down', timeStamp, this.timeStamp + this.step - timeStamp, code, this)
			const shift = getShift(code);
			const detail = {type: 'move', shift, code, key, timeStamp};
			// ev.detail = detail;
			this.timeStamp = timeStamp;self
			self.postMessage(detail);
			// if (this.bc) this.bc.postMessage(detail);
            // this._bindable.call('move', detail, this);  // get result only from first handler
            // this._bindable.call('move', {...ev, detail}, this);  // get result only from first handler

		}
    }

    up(ev) {
		// console.log('up', this)
    }
	
}

