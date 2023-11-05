import fetchTiff from './fetchTiff.js'

const canvasNode = document.querySelector('.canvas');
const file = document.querySelector('.file');
file.addEventListener('change', ev => {
	const target = ev.target;
	const file = target.files[0];
	const objectURL = window.URL.createObjectURL(file);

	fetchTiff(objectURL, canvasNode);
	requestAnimationFrame(() =>	target.value = '');
});

fetchTiff('./data/B_RGB.tif', canvasNode);
