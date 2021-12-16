  // Your web app's Firebase configuration
  var firebaseConfig = {
    apiKey: "firebaseApiKey",
    authDomain: "voicesignature.firebaseapp.com",
    databaseURL: "https://voicesignature.firebaseio.com",
    projectId: "voicesignature",
    storageBucket: "voicesignature.appspot.com",
    messagingSenderId: "infoFromFirebase",
    appId: "1:infoFromFirebase:web:infoFromFirebase",
    measurementId: "G-InfoFromFirebase"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  var db = firebase.firestore();

	var ref = db.collection("users");
	console.log("users");
	console.log(ref);


//get all from db
function getAll(){
	return new Promise(function(resolve, reject){
		var alldata = [];
		ref.get().then((snapshot) => {
			snapshot.docs.forEach(doc => {
				console.log(doc.data());
				alldata.push(doc.data());
				
			});
			resolve(alldata)
			}).catch(err => {
				reject('Error getting document', err);
		});
		})
}
  
//add to db
function add(id, name){
	// Add a new document with a generated id.
	ref.doc(id).set({
		name: name,
		voice: id
	})
	.then(function() {
		console.log("User successfully written!");
		alert("Voice has been saved.");
	})
	.catch(function(error) {
		console.error("Error writing user: ", error);
	});
} 