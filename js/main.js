//モデルの位置
const posX = 0;
const posY = -1;
const posZ = -2.0;
//モデルのサイズ
const scale = 1.0;

let renderer, scene, camera;
let loading;

//THREEのレンダラの初期化
const initRenderer = async () => {
	//z-fighting対策でlogarithmicDepthBufferを指定
	renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, logarithmicDepthBuffer: true });
	renderer.gammaOutput = true;
	renderer.setClearColor(new THREE.Color(0xffffff), 0);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.domElement.style.position = "absolute";
	renderer.domElement.style.top = "0px";
	renderer.domElement.style.left = "0px";
	document.body.appendChild(renderer.domElement);
}
//THREEのシーンの初期化
const initScene = async () => {
	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000 );
	camera.position.set(0, 0, 0);

	scene.add(camera);

	let light = new THREE.AmbientLight(0xffffff, 1.0);
	scene.add(light);

	//VRMモデルの読み込み
	let result = await loadModel();

	return result;
}

//モデルデータ
let dst = {};

//VRMモデルの読み込み
const loadModel = async () => {
	let vrmLoader = new THREE.VRMLoader();
	let result = await new Promise(resolve => {
		vrmLoader.load("assets/VRoid.vrm", (vrm) => {
			vrm.scene.position.set(posX, posY, posZ);
			vrm.scene.scale.set(scale, scale, scale);
			vrm.scene.rotation.set(0.0, Math.PI, 0.0);

			// VRMLoader doesn't support VRM Unlit extension yet so
			// converting all materials to MeshBasicMaterial here as workaround so far.
			vrm.scene.traverse((object) => {
				if(!object.material){ return; }

				if(Array.isArray(object.material)){
					for(let i = 0, il = object.material.length; i < il; i ++){
						let material = new THREE.MeshBasicMaterial();
						THREE.Material.prototype.copy.call(material, object.material[i]);
						material.color.copy(object.material[i].color);
						material.map = object.material[i].map;
						material.lights = false;
						material.skinning = object.material[i].skinning;
						material.morphTargets = object.material[i].morphTargets;
						material.morphNormals = object.material[i].morphNormals;
						object.material[i] = material;
					}
				}else{
					let material = new THREE.MeshBasicMaterial();
					THREE.Material.prototype.copy.call(material, object.material);
					material.color.copy(object.material.color);
					material.map = object.material.map;
					material.lights = false;
					material.skinning = object.material.skinning;
					material.morphTargets = object.material.morphTargets;
					material.morphNormals = object.material.morphNormals;
					object.material = material;
				}
			});

			dst["hips"]       = vrm.scene.getObjectByName("J_Bip_C_Hips");
			dst["spine"]      = vrm.scene.getObjectByName("J_Bip_C_Spine");
			dst["chest"]      = vrm.scene.getObjectByName("J_Bip_C_Chest");
			dst["upperChest"] = vrm.scene.getObjectByName("J_Bip_C_UpperChest");
			dst["neck"]       = vrm.scene.getObjectByName("J_Bip_C_Neck");
			dst["head"]       = vrm.scene.getObjectByName("J_Bip_C_Head");
			dst["upperArmL"]  = vrm.scene.getObjectByName("J_Bip_L_UpperArm");
			dst["upperArmR"]  = vrm.scene.getObjectByName("J_Bip_R_UpperArm");
			dst["lowerArmL"]  = vrm.scene.getObjectByName("J_Bip_L_LowerArm");
			dst["lowerArmR"]  = vrm.scene.getObjectByName("J_Bip_R_LowerArm");
			dst["handL"]      = vrm.scene.getObjectByName("J_Bip_L_Hand");
			dst["handR"]      = vrm.scene.getObjectByName("J_Bip_R_Hand");
			dst["upperLegL"]  = vrm.scene.getObjectByName("J_Bip_L_UpperLeg");
			dst["upperLegR"]  = vrm.scene.getObjectByName("J_Bip_R_UpperLeg");
			dst["lowerLegL"]  = vrm.scene.getObjectByName("J_Bip_L_LowerLeg");
			dst["lowerLegR"]  = vrm.scene.getObjectByName("J_Bip_R_LowerLeg");
			dst["footL"]      = vrm.scene.getObjectByName("J_Bip_L_Foot");
			dst["footR"]      = vrm.scene.getObjectByName("J_Bip_R_Foot");
/*
			//VRoidの0.2.11から鼻のボーンが無くなったので頭の傾きは一旦取り下げ
			//PoseNet側に鼻、両目、両耳のキーポイントがあるので5点アルゴリズムで姿勢は計算できる？
			dst["nose"]       = vrm.scene.getObjectByName("J_Adj_C_FaceNose");
			dst["eyeL"]       = vrm.scene.getObjectByName("J_Adj_L_FaceEyeSet");
			dst["eyeR"]       = vrm.scene.getObjectByName("J_Adj_R_FaceEyeSet");

			dst["eyeLen"]     = dst["eyeR"].position.x - dst["eyeL"].position.x;

			dst["noseLen"]    = (dst["eyeR"].position.y + dst["eyeL"].position.y) / 2.0 - dst["nose"].position.y;
			dst["angleXBase"] = dst["eyeLen"] / dst["noseLen"];
*/
			scene.add(vrm.scene);
			//camera.lookAt(vrm.scene.position); 

			return resolve(vrm.scene);
		});
	});

	return result;
}
let clock = new THREE.Clock();
let stats = new Stats();
document.body.appendChild(stats.dom);

const bindPage = async () => {
	const net = await posenet.load(0.75);
	const video = await loadVideo();
	/*
	let video = document.getElementById("video");
	video.width = videoWidth;
	video.height = videoHeight;
	video.src = "test.mp4";
	video.loop = true;
	video.play();
	*/
	setupGui([], net);

	const resRenderer = initRenderer();
	const resScene = initScene();

	//レンダラ、シーンの初期化が済んでいるか
	await Promise.all([resRenderer, resScene]);

	loading = document.getElementById("loading");
	loading.style.display = "none";

	const canvas = document.getElementById("output");
	const ctx = canvas.getContext("2d");
	const flipHorizontal = false;

	canvas.width = videoWidth;
	canvas.height = videoHeight;

	const animate = async () => {
		requestAnimationFrame(animate);

		if(Object.keys(dst).length == 0){ return; }

		if(guiState.changeToArchitecture){
			guiState.net.dispose();
			guiState.net = await posenet.load(guiState.changeToArchitecture);
			guiState.changeToArchitecture = null;
		}

		const imageScaleFactor = guiState.input.imageScaleFactor;
		const outputStride = guiState.input.outputStride;

		const pose = await guiState.net.estimateSinglePose(video, imageScaleFactor, flipHorizontal, outputStride);

		let poses = [];
		poses.push(pose);

		let minPoseConfidence = guiState.minPoseConfidence;
		let minPartConfidence = guiState.minPartConfidence;

		if(guiState.output.showVideo){
			ctx.clearRect(0, 0, videoWidth, videoHeight);
			ctx.save();
			ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
			ctx.restore();
		}

		const vecX = new THREE.Vector3(1, 0, 0);
		const vecY = new THREE.Vector3(0, 1, 0);
		const vecZ = new THREE.Vector3(0, 0, 1);
		const halfPi = Math.PI / 2;

		const deg2rad = (deg) => { return deg * Math.PI / 180.0; }
		const rad2deg = (rad) => { return rad * 180.0 / Math.PI; }

		//srcのrootからnodeとnodeからleafの角度でdstを回転
		const updateJoint = (src, root, node, leaf, dst, min = -360, max = 360) => {
			let from = src[leaf].clone().sub(src[node]).normalize();
			let to = src[node].clone().sub(src[root]).normalize();
			let quat = new THREE.Quaternion();
			let axis = from.clone().cross(to).normalize();
			let angle = Math.acos(from.dot(to));
			angle = Math.max(deg2rad(min), Math.min(deg2rad(max), angle));
			quat.setFromAxisAngle(axis, angle);
			dst.rotation.setFromQuaternion(quat);
		}

		//回転角度の調整
		const adjJoint = (x, y, z, dst) => {
			let quatX = new THREE.Quaternion();
			quatX.setFromAxisAngle(vecX, deg2rad(x));
			let quatY = new THREE.Quaternion();
			quatY.setFromAxisAngle(vecY, deg2rad(y));
			let quatZ = new THREE.Quaternion();
			quatZ.setFromAxisAngle(vecZ, -deg2rad(z));

			let quat = dst.quaternion.multiply(quatZ).multiply(quatY).multiply(quatX);
			dst.rotation.setFromQuaternion(quat);
		}

		poses.forEach(({score, keypoints}) => {
			if(score < minPoseConfidence){ return; }

			if(guiState.output.showPoints){ drawKeypoints(keypoints, minPartConfidence, ctx); }
			if(guiState.output.showSkeleton){ drawSkeleton(keypoints, minPartConfidence, ctx); }
			if(guiState.output.showBoundingBox){ drawBoundingBox(keypoints, ctx); }

			let src = {};
			src["nose"]      = keypoints[0];
			src["eyeL"]      = keypoints[1]; src["eyeR"]       = keypoints[2];
			src["earL"]      = keypoints[3]; src["earR"]       = keypoints[4];
			src["upperArmL"] = keypoints[5]; src["upperArmR"]  = keypoints[6];
			src["lowerArmL"] = keypoints[7]; src["lowerArmR"]  = keypoints[8];
			src["handL"]     = keypoints[9]; src["handR"]      = keypoints[10];
			src["upperLegL"] = keypoints[11]; src["upperLegR"] = keypoints[12];
			src["lowerLegL"] = keypoints[13]; src["lowerLegR"] = keypoints[14];
			src["footL"]     = keypoints[15]; src["footR"]     = keypoints[16];

			let joint = {};
			Object.keys(src).forEach((key) => { 
				if(src[key].score > minPartConfidence){
					//PoseNetの機能強化あるいは他の姿勢推定ライブラリに切り替えられるようVector3で作っておく
					joint[key]  = new THREE.Vector3(src[key].position.x, videoHeight - src[key].position.y, 0);
				}
			});

			//左腕
			if(joint["upperArmL"]){
				if(joint["lowerArmL"]){
					if(joint["upperArmR"]){ 
						updateJoint(joint, "upperArmR", "upperArmL", "lowerArmL", dst["upperArmL"]); 
						//adjJoint(0, -30, 0, dst["upperArmL"]); //ダミー
					}
					if(joint["handL"]){ 
						updateJoint(joint, "upperArmL", "lowerArmL", "handL", dst["lowerArmL"]); 

						//常に手のひらを向けるよう補正
						let armLow2Hand = joint["handL"].clone().sub(joint["lowerArmL"]).normalize();
						let angleX = rad2deg(armLow2Hand.y) + 90;
						let angleY = Math.min(0, rad2deg(armLow2Hand.x));
						adjJoint(angleX, angleY, 0, dst["lowerArmL"]);

						dst["handL"].rotation.setFromQuaternion(new THREE.Quaternion());
						//adjJoint(0, 0, -20, dst["handL"]); //ダミー
					}
				}
			}
			//右腕
			if(joint["upperArmR"]){
				if(joint["lowerArmR"]){
					if(joint["upperArmL"]){ 
						updateJoint(joint, "upperArmL", "upperArmR", "lowerArmR", dst["upperArmR"]); 
						//adjJoint(0, 30, 0, dst["upperArmR"]); //ダミー
					}
					if(joint["handR"]){ 
						updateJoint(joint, "upperArmR", "lowerArmR", "handR", dst["lowerArmR"]); 

						//常に手のひらを向けるよう補正
						let armLow2Hand = joint["handR"].clone().sub(joint["lowerArmR"]).normalize();
						let angleX = rad2deg(armLow2Hand.y) + 90;
						let angleY = Math.max(0, rad2deg(armLow2Hand.x));
						adjJoint(angleX, angleY, 0, dst["lowerArmR"]);

						dst["handR"].rotation.setFromQuaternion(new THREE.Quaternion());
						//adjJoint(0, 0, 20, dst["handR"]); //ダミー
					}
				}
			}
			//胸
			if(joint["upperArmL"] && joint["upperArmR"]){
				joint["upperArmLL"] = joint["upperArmL"].clone().add(vecX);
				updateJoint(joint, "upperArmLL", "upperArmL", "upperArmR", dst["upperChest"], -20, 20);
			}
			//頭
/*
			if(joint["eyeL"] && joint["eyeR"]){
				if(joint["nose"]){
					let quatX = new THREE.Quaternion();
					let quatY = new THREE.Quaternion();
					let quatZ = new THREE.Quaternion();
					const adjX = 0.1, minX = deg2rad(-45), maxX = deg2rad(45);
					const adjY = 0.2, minY = deg2rad(-45), maxY = deg2rad(45);
					const adjZ = 0.1, minZ = deg2rad(-45), maxZ = deg2rad(45);

					//////////////////////////////////////////////////////////
					//両目の中央から鼻までの高さと、モデルの同部分の比率が首のX軸の角度
					//距離が長ければ下向き、短ければ上向き
					//鼻が目より上に来るほど上向いた場合、まず姿勢推定が失敗するので考えない
					let eyeL2R = joint["eyeR"].clone().sub(joint["eyeL"]).normalize();
					let eyeL2Nose = joint["nose"].clone().sub(joint["eyeL"]);

					//左目から右目のベクトルに、左目から鼻のベクトルを射影
					//なので、実際には「両目の中央」ではないので注意
					let relEyeL2NosePrjEyeL2R = eyeL2Nose.projectOnVector(eyeL2R);
					let absEyeL2NosePrjEyeL2R = relEyeL2NosePrjEyeL2R.clone().add(joint["eyeL"]);

					let eyeLen = joint["eyeR"].clone().sub(joint["eyeL"]).length();
					let noseLen = absEyeL2NosePrjEyeL2R.clone().sub(joint["nose"]).length();

					let axisX = new THREE.Vector3(-1, 0, 0);
					let angleX = ((eyeLen / noseLen) / (dst["angleXBase"])) * adjX;
					angleX = Math.max(minX, Math.min(maxX, angleX));
					quatX.setFromAxisAngle(axisX, angleX);

					//////////////////////////////////////////////////////////
					//両目の軸上での鼻の位置が首のY軸の角度
					//中央と比較したいので2で割る
					let halfEyeLen = eyeLen / 2;
					let projLen = relEyeL2NosePrjEyeL2R.length();
					let axisY = new THREE.Vector3(0, -1, 0);

					//右向きが正、左向きが負になるよう1を引く
					let angleY = ((projLen / halfEyeLen) - 1) * adjY;
					angleY = Math.max(minY, Math.min(maxY, angleY));
					quatY.setFromAxisAngle(axisY, angleY);

					//////////////////////////////////////////////////////////
					//両肩の角度と両目の角度の差分が首のZ軸の角度
					if(joint["upperArmL"] && joint["upperArmR"]){
						let armL2R = joint["upperArmR"].clone().sub(joint["upperArmL"]).normalize();
						let axisZ = eyeL2R.clone().cross(armL2R).normalize();
						let angleZ = Math.acos(eyeL2R.dot(armL2R)) * adjZ;
						angleZ = Math.max(minZ, Math.min(maxZ, angleZ));
						quatZ.setFromAxisAngle(axisZ, angleZ)
					}

					//////////////////////////////////////////////////////////
					//X軸はneckではなくheadの位置で曲がる
					let quat = quatY.multiply(quatZ);
					dst["neck"].rotation.setFromQuaternion(quat);
					dst["head"].rotation.setFromQuaternion(quatX);
				}
			}
*/
			//腰
			if(joint["upperLegL"] && joint["upperLegR"]){
				//基準点が無いので左肩の左水平方向に仮のジョイントを作る
				joint["upperLegLL"] = joint["upperLegL"].clone().add(vecX);
				updateJoint(joint, "upperLegLL", "upperLegL", "upperLegR", dst["spine"], -10, 10);

				const adjX = 2.0;

				let pos = joint["upperLegL"].clone().add(joint["upperLegR"]).divideScalar(2);
				let x = -(pos.x - (videoWidth / 2)) / videoWidth;
				dst["hips"].position.x = x * adjX;

				//adjJoint(-20, 0, 0, dst["spine"]); //ダミー
			}
			//左脚
			if(joint["upperLegL"]){
				if(joint["lowerLegL"]){
					if(joint["upperLegR"]){
						//基準点が無いので左脚付け根の上方向に仮のジョイントを作る
						joint["upperLegLUp"] = joint["upperLegR"].clone().sub(joint["upperLegL"]).normalize();
						joint["upperLegLUp"].applyAxisAngle(vecZ, -halfPi).add(joint["upperLegL"]);
						updateJoint(joint, "upperLegLUp", "upperLegL", "lowerLegL", dst["upperLegL"], -20, 20); 
					}
					if(joint["footL"]){ 
						updateJoint(joint, "upperLegL", "lowerLegL", "footL", dst["lowerLegL"], -20, 20); 

						//基準点が無いので左足首の下垂直方向に仮のジョイントを作る
						joint["footLDown"] = joint["footL"].clone().sub(vecY);
						updateJoint(joint, "lowerLegL", "footL", "footLDown", dst["footL"]); 
					}else{
						//基準点が無いので左膝の下垂直方向に仮のジョイントを作る
						joint["lowerLegLDown"] = joint["lowerLegL"].clone().sub(vecY);
						updateJoint(joint, "upperLegL", "lowerLegL", "lowerLegLDown", dst["lowerLegL"]); 
						updateJoint(joint, "lowerLegL", "lowerLegLDown", "lowerLegLDown", dst["footL"]); 
					}
					//adjJoint(0, 10, 0, dst["footL"]); //ダミー
				}
			}
			//右脚
			if(joint["upperLegR"]){
				if(joint["lowerLegR"]){
					if(joint["upperLegL"]){
						//基準点が無いので右脚付け根の上方向に仮のジョイントを作る
						joint["upperLegRUp"] = joint["upperLegL"].clone().sub(joint["upperLegR"]).normalize();
						joint["upperLegRUp"].applyAxisAngle(vecZ, halfPi).add(joint["upperLegR"]);
						updateJoint(joint, "upperLegRUp", "upperLegR", "lowerLegR", dst["upperLegR"], -20, 20); 
					}
					if(joint["footR"]){ 
						updateJoint(joint, "upperLegR", "lowerLegR", "footR", dst["lowerLegR"], -20, 20); 

						//基準点が無いので右足首の下垂直方向に仮のジョイントを作る
						joint["footRDown"] = joint["footR"].clone().sub(vecY);
						updateJoint(joint, "lowerLegR", "footR", "footRDown", dst["footR"]); 
					}else{
						//基準点が無いので右膝の下垂直方向に仮のジョイントを作る
						joint["lowerLegRDown"] = joint["lowerLegR"].clone().sub(vecY);
						updateJoint(joint, "upperLegR", "lowerLegR", "lowerLegRDown", dst["lowerLegR"]); 
						updateJoint(joint, "lowerLegR", "lowerLegRDown", "lowerLegRDown", dst["footR"]); 
					}
					//adjJoint(0, -10, 0, dst["footR"]); //ダミー
				}
			}
		});


		let delta = clock.getDelta();
		renderer.render(scene, camera);
		stats.update();
	}

	requestAnimationFrame(animate);
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
bindPage();