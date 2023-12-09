import fetchTiff from './fetchTiff.js'
import Keyboard from './dom/Keyboard.js';
// import MouseNavigation from './dom/MouseNavigation.js';
 import Touch from './dom/Touch.js';

const canvas = document.querySelector('.canvas');
const file = document.querySelector('.file');
const {width, height} = window.screen;
const options = {canvas, maxSize: {width, height}};

file.addEventListener('change', ev => {
	const target = ev.target;
	const file = target.files[0];
	const objectURL = window.URL.createObjectURL(file);

	fetchTiff(objectURL, options);
	requestAnimationFrame(() =>	target.value = '');
});
// const bc = new BroadcastChannel("test_channel");
// const mn = new MouseNavigation({canvas});
const kb = new Keyboard({});

const minScale = 10 / canvas.width,
    scaleDelta = 0.1;
let scale = 1, pos = [0, 0], pos1 = [0, 0], start = [];
const touch = new Touch(canvas)
	.on('moveStart', (e) => {
		start = [e.pageX, e.pageY];
	})
	.on('moving', (e) => {
		const {pageX, pageY, srcElement} = e;
		if (srcElement === canvas) {
			pos1 = [pos[0] + (start[0] - pageX) / scale, pos[1] + (start[1] - pageY) / scale];
			self.postMessage({type: 'drag', pos: pos1});
		}
	})
	.on('moveEnd', () => { pos = pos1; });

document.addEventListener('wheel', (e) => {
	const {wheelDelta, pageX, pageY} = e;
	const sc = scale + scaleDelta * wheelDelta / 120;
	if (sc < minScale) return;
	const scDelta =  1 / scale - 1 / sc;
	pos = [pos[0] + pageX * scDelta, pos[1] + pageY * scDelta];
	scale = sc;
	
// console.log('scale', scale, pos)
	self.postMessage({type: 'drag', scale, pos});
});

// fetchTiff('./data/LC08_L1TP_111025_20180927_20181009_01_T1_sr_band5.tif', options);
// fetchTiff('./data/Карта_тестовых_слоёв_mail.ru.tiff', options);
// fetchTiff('./data/B_RGB.tif', options);
fetchTiff('./data/33.tif', options);
// fetchTiff('./data/atlas_south.tif', options);
