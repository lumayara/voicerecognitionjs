var key = "azurespeechapikey";
var baseApi = "https://westcentralus.api.cognitive.microsoft.com";

const createIdentificationProfileEndpoint = `${baseApi}/speaker/identification/v2.0/text-independent/profiles`;
const enrollIdentificationProfileEndpoint = (profileId) => `${baseApi}/speaker/identification/v2.0/text-independent/profiles/${profileId}/enrollments?ignoreMinLength=true`;
const enrollIdentificationProfileStatusEndpoint = (profileId) => `${baseApi}/speaker/identification/v2.0/text-independent/profiles/${profileId}`;
const identifyProfileEndpoint = (Ids) => `${baseApi}/speaker/identification/v2.0/text-independent/profiles/identifySingleSpeaker?profileIds=${Ids}&ignoreMinLength=true`;

//-- Speaker Identification methods
// 1. Start the browser listening, listen for 15 seconds, pass the audio stream to "createProfile"
function enrollNewProfile(){
	navigator.getUserMedia({audio: true}, function(stream){
		console.log('I\'m listening... just start talking for a few seconds...');
		//console.log('Maybe read this: \n' + thingsToRead[Math.floor(Math.random() * thingsToRead.length)]);
		onMediaSuccess(stream, createProfile, 15);
	}, onMediaError);
}

// createProfile calls the profile endpoint to get a profile Id, then calls enrollProfileAudio
function createProfile(blob){
	addAudioPlayer(blob);

	var request = new XMLHttpRequest();
	request.open("POST", createIdentificationProfileEndpoint, true);

	request.setRequestHeader('Content-Type','application/json');
	request.setRequestHeader('Ocp-Apim-Subscription-Key', key);

	request.onload = function () {
		console.log('creating profile');
		var json = JSON.parse(request.responseText);
		console.log(json);

		var profileId = json.profileId;

		// Now we can enroll this profile using the profileId
		enrollProfileAudio(blob, profileId);
	};

	request.send(JSON.stringify({ 'locale' :'en-us'}));
}

// enrollProfileAudio enrolls the recorded audio with the new profile Id, polling the status
function enrollProfileAudio(blob, profileId){
  
  var request = new XMLHttpRequest();
  request.open("POST", enrollIdentificationProfileEndpoint(profileId), true);
  request.setRequestHeader('Ocp-Apim-Subscription-Key', key);
  request.onload = function () {
  	console.log('enrolling');
	
	if (request.status==200 || request.status==201) {
		var json = JSON.parse(request.responseText);
		console.log(json);

		const location = enrollIdentificationProfileStatusEndpoint(profileId);
		pollForEnrollment(location, profileId);
	} else {
		console.log(`Failed to submit for enrollment: got a ${request.status} response code.`);
		var json = JSON.parse(request.responseText);
		console.log(`${json.error.code}: ${json.error.message}`);
	}
  };  
  request.send(blob);
}

// Ping the status endpoint to see if the enrollment for identification has completed
function pollForEnrollment(location, profileId){
	var enrolledInterval;

	// hit the endpoint every few seconds 
	enrolledInterval = setInterval(function()
	{
		var request = new XMLHttpRequest();
		request.open("GET", location, true);
		request.setRequestHeader('Ocp-Apim-Subscription-Key', key);
		request.onload = function()
		{
			console.log('getting status');
			var json = JSON.parse(request.responseText);
			
			if (json.enrollmentStatus == 'Enrolled')
			{
				// Woohoo! The audio was enrolled successfully! 

				// stop polling
				clearInterval(enrolledInterval);
				console.log('enrollment complete!');

				// ask for a name to associated with the ID to make the identification nicer
				var name = window.prompt('Who was that talking?');

				//adding to db
				add(profileId, name);

				profileIds.push(new Profile(name, profileId));
				console.log(profileId + ' is now mapped to ' + name);
			}
			else 
			{
				// keep polling
				console.log('Not done yet..');
			}
		};

		request.send();
	}, 1000);
}

// 2. Start the browser listening, listen for 10 seconds, pass the audio stream to "identifyProfile"
function startListeningForIdentification(){
	if (profileIds.length > 0 ){
		console.log('I\'m listening... just start talking for a few seconds...');
		//console.log('Maybe read this: \n' + thingsToRead[Math.floor(Math.random() * thingsToRead.length)]);
		navigator.getUserMedia({audio: true}, function(stream){onMediaSuccess(stream, identifyProfile, 10)}, onMediaError);
	} else {
		console.log('No profiles enrolled yet! Click the other button...');
	}
}

// 3. Take the audio and send it to the identification endpoint
function identifyProfile(blob){
	addAudioPlayer(blob);

	// comma delimited list of profile IDs we're interested in comparing against
	var Ids = profileIds.map(x => x.profileId).join();
  
	var request = new XMLHttpRequest();
	request.open("POST", identifyProfileEndpoint(Ids), true);
	request.setRequestHeader('Ocp-Apim-Subscription-Key', key);
	request.onload = function () {
		console.log('identifying profile');
		var json = JSON.parse(request.responseText);
		console.log(json);

		if (request.status == 200) {
			//identify speaker
			var speaker = profileIds.filter(function(p){return p.profileId == json.identifiedProfile.profileId});

			if (speaker != null && speaker.length > 0){
				console.log('I think ' + speaker[0].name + ' was talking');
			} else {
				console.log('I couldn\'t tell who was talking. So embarrassing.');
			}
		} else {
			console.log(`Failed to submit for identification: got a ${request.status} response code.`);
			console.log(`${json.error.code}: ${json.error.message}`);
		}
	};
  
	request.send(blob);
}


function addAudioPlayer(blob){	
	var url = URL.createObjectURL(blob);
	var log = document.getElementById('log');

	var audio = document.querySelector('#replay');
	if (audio != null) {audio.parentNode.removeChild(audio);}

	audio = document.createElement('audio');
	audio.setAttribute('id','replay');
	audio.setAttribute('controls','controls');

	var source = document.createElement('source');
	source.src = url;

	audio.appendChild(source);
	log.parentNode.insertBefore(audio, log);
}

// Example phrases
var thingsToRead = [
	"Never gonna give you up\nNever gonna let you down\nNever gonna run around and desert you\nNever gonna make you cry\nNever gonna say goodbye\nNever gonna tell a lie and hurt you",
	"There's a voice that keeps on calling me\n	Down the road, that's where I'll always be.\n	Every stop I make, I make a new friend,\n	Can't stay for long, just turn around and I'm gone again\n	\n	Maybe tomorrow, I'll want to settle down,\n	Until tomorrow, I'll just keep moving on.\n	\n	Down this road that never seems to end,\n	Where new adventure lies just around the bend.\n	So if you want to join me for a while,\n	Just grab your hat, come travel light, that's hobo style.",
	"They're the world's most fearsome fighting team \n	They're heroes in a half-shell and they're green\n	When the evil Shredder attacks\n	These Turtle boys don't cut him no slack! \n	Teenage Mutant Ninja Turtles\nTeenage Mutant Ninja Turtles",
	"If you're seein' things runnin' thru your head \n	Who can you call (ghostbusters)\n	An' invisible man sleepin' in your bed \n	Oh who ya gonna call (ghostbusters) \nI ain't afraid a no ghost \n	I ain't afraid a no ghost \n	Who ya gonna call (ghostbusters) \n	If you're all alone pick up the phone \n	An call (ghostbusters)",
];

// vanilla javascript queystring management
var qs = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=', 2);
        if (p.length == 1)
            b[p[0]] = "";
        else
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
})(window.location.search.substr(1).split('&'));



// Speaker Recognition API profile configuration - constructs to make management easier
var Profile = class { constructor (name, profileId) { this.name = name; this.profileId = profileId;}};
var VerificationProfile = class { constructor (name, profileId) { this.name = name; this.profileId = profileId; this.remainingEnrollments = 3}};
var profileIds = await getAll(); 
var verificationProfile = new VerificationProfile();

(function () {
	// Cross browser sound recording using the web audio API
	navigator.getUserMedia = ( navigator.getUserMedia ||
							navigator.webkitGetUserMedia ||
							navigator.mozGetUserMedia ||
							navigator.msGetUserMedia);

	// Really easy way to dump the console logs to the page
	var old = console.log;
	var logger = document.getElementById('log');
	var isScrolledToBottom = logger.scrollHeight - logger.clientHeight <= logger.scrollTop + 1;
    
	console.log = function () {
		for (var i = 0; i < arguments.length; i++) {
			if (typeof arguments[i] == 'object') {
				logger.innerHTML += (JSON && JSON.stringify ? JSON.stringify(arguments[i], undefined, 2) : arguments[i]) + '<br />';
			} else {
				logger.innerHTML += arguments[i] + '<br />';
			}
			if(isScrolledToBottom) logger.scrollTop = logger.scrollHeight - logger.clientHeight;
		}
		old(...arguments);
	}
	console.error = console.log; 
})();