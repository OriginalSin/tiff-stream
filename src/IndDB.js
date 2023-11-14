let db, storeName = "tiles";
export default {
	getTable: (opt) => {  // Let us open database
		const {name = 'tifFiles'} = opt || {}
		return new Promise((resolve, reject) => {
			// Create/open database
			var request = indexedDB.open(name, 1),
				// storeName = "tiles",
				// db,
				createObjectStore = (dataBase) => { 	// Create an objectStore
					// console.log("Creating objectStore")
					dataBase.createObjectStore(storeName, {keyPath: 'num'});
				},

				getImageFile = async function () {
					let blob = await fetch('./data/B_RGB.tif', {})
						.then(resp => resp.blob());
							console.log("Blob:", blob);
					// putElephantInDb(blob);
					putElephantInDb(new Uint16Array([1,2,3]));
				},

				putElephantInDb = (blob) => { 	// console.log("Putting elephants in IndexedDB");
					const transaction = db.transaction([storeName], "readwrite");	// Open a transaction to the database
					transaction.objectStore(storeName).put({tile: blob, num: 3, dx: 3, dy: 0});	// Put the blob into the dabase

					
					transaction.objectStore(storeName).get("tile").onsuccess = (event) => { // Retrieve the file that was just stored
						var imgFile = event.target.result;
						console.log("Got elephant!", imgFile);
		return;
						// Get window.URL object
						var URL = window.URL || window.webkitURL;

						// Create and revoke ObjectURL
						var imgURL = URL.createObjectURL(imgFile);

						// Set img src to ObjectURL
						var imgElephant = document.getElementById("elephant");
						imgElephant.setAttribute("src", imgURL);

						// Revoking ObjectURL
						URL.revokeObjectURL(imgURL);
					};
				};

			request.onerror = (event) => {
				console.error("Error creating/accessing IndexedDB database");
			};

			request.onsuccess = (event) => {
				console.log("Success creating/accessing IndexedDB database");
				db = request.result;
				db.onerror = (event) => {
					console.log("Error creating/accessing IndexedDB database");
				};
				
				// Interim solution for Google Chrome to create an objectStore. Will be deprecated
				if (db.setVersion) {
					if (db.version != dbVersion) {
						var setVersion = db.setVersion(dbVersion);
						setVersion.onsuccess = () => {
							createObjectStore(db);
							resolve(2);
							// getImageFile();
						};
					}
					else {
						resolve(1);
						// getImageFile();
					}
				}
				else {
					resolve(db);
					// getImageFile();
				}
			}

			request.onupgradeneeded = (event) => {
				createObjectStore(event.target.result);	// For future use. Currently only in latest Firefox versions
			};
		});
	},

	getRecords: (from, to) => {  // чтение по одной записи
		const transaction = db.transaction([storeName]);	// Open a transaction to the database
		let books = transaction.objectStore(storeName);
		return new Promise((resolve, reject) => {
			let req = books.getAll(IDBKeyRange.bound(from, to));
			req.onsuccess = () => {
				resolve(req.result); // массив книг с ценой 10
			};
		});
	},

	getRecord: (nm) => {  // чтение по одной записи
		const transaction = db.transaction([storeName]);	// Open a transaction to the database
		let books = transaction.objectStore(storeName);
		return new Promise((resolve, reject) => {
			let req = books.get(nm);
			req.onsuccess = () => {
				resolve(req.result); // массив книг с ценой 10
			};
		});
	},
	
	addRecord: async (opt) => {  // Let us open database
		// Create a new item to add in to the object store
		// const {db, name} = opt || {};
		
		const transaction = db.transaction([storeName], "readwrite");	// Open a transaction to the database
		// transaction.objectStore(storeName).put({tile: blob, num: 3, dx: 3, dy: 0});	// Put the blob into the dabase
		transaction.objectStore(storeName).put(opt);	// Put the blob into the dabase

					
					// transaction.objectStore(storeName).get("ndarray").onsuccess = (event) => { // Retrieve the file that was just stored
						// var imgFile = event.target.result;
						// console.log("Got elephant!", imgFile);
					// }
	}
}

