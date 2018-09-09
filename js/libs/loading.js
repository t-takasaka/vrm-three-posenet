const initLoadingManager = function(){
	const manager = new THREE.LoadingManager();
	const progressBar = document.querySelector("#progress");
	const loadingOverlay = document.querySelector("#loading-overlay");

	let percentComplete = 1;
	let frameID = null;

	const updateAmount = 0.5; 

	const animateBar = () => {
		percentComplete += updateAmount;

		if(percentComplete >= 100){
			progressBar.style.backgroundColor = 0x00ff00;
			percentComplete = 1;
		}

		progressBar.style.width = percentComplete + "%";
		frameID = requestAnimationFrame(animateBar);
	}

	manager.onStart = () => {
		if (frameID !== null){ return; }
		animateBar();
	};

	manager.onLoad = function(){
		loadingOverlay.classList.add("loading-overlay-hidden");

		percentComplete = 0;
		progressBar.style.width = 0;
		cancelAnimationFrame(frameID);
	};
  
	manager.onError = function(e){ 
		console.error(e); 
		progressBar.style.backgroundColor = "red";
	}

	return manager;
}
