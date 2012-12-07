/*
 * MediaPlayer 0.1
 * Quentin Aupetit, 2012
 * 
 * https://github.com/moust/MediaPlayer
 * https://github.com/cgiffard/Captionator
 *
 * Creates a JavaScript object that mimics HTML5 MediaElement API
 *
 * Copyright 2010-2012, John Dyer (http://j.hn)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/

(function() {
	"use strict";

	// Namespace
	var mp = mp || {};

	mp.MediaPlayer = function(el, options)
	{
		this.options = {
			useiPadUseNativeControls: false,
		    useiPhoneUseNativeControls: false, 
		    useAndroidUseNativeControls: false,
		    alwaysUseNativeControls: false,
		    displaySourceChooser: true
		};

		// extend options
		for(var prop in options) {
			this.options[prop] = options[prop];
		}

		// get HTMLMediaElement element
		if(typeof(el) == "string") {
			el = document.getElementById(el);
		}

		// init player
		if((typeof(el) == "object") && (el instanceof HTMLMediaElement))
		{
			this.media = el;
			// replace default MediaElement
			this.init();
		}
		else {
			throw new Error("MediaPlayer need an instance HTMLMediaElement parameter.");
		}
	}

	mp.MediaPlayer.prototype.utils = {
		wrapAll: function(wrapper, elms) {
			var el = elms.length ? elms[0] : elms;
		    var parent  = el.parentNode;
		    var sibling = el.nextSibling;
		    wrapper.appendChild(el);
		    while (elms.length) {
		        wrapper.appendChild(elms[0]);
		    }
		    if (sibling) {
		        parent.insertBefore(wrapper, sibling);
		    } else {
		        parent.appendChild(wrapper);
		    }
		},
		hasClass: function(el,cls) {
			return el.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
		},
		addClass: function(el,cls) {
			if (!this.hasClass(el,cls)) el.className += " "+cls;
		},
		removeClass: function(el,cls) {
			if (this.hasClass(el,cls)) {
				var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
				el.className=el.className.replace(reg,' ');
			}
		},
		timeFormat: function(time, showhours) {
			var sec_numb    = parseInt(time);
		    var hours   = Math.floor(sec_numb / 3600);
		    var minutes = Math.floor((sec_numb - (hours * 3600)) / 60);
		    var seconds = sec_numb - (hours * 3600) - (minutes * 60);
		    if (hours   < 10) {hours   = "0"+hours;}
		    if (minutes < 10) {minutes = "0"+minutes;}
		    if (seconds < 10) {seconds = "0"+seconds;}
		    var time    = '';
		    if(showhours) {
		    	time    = hours+':';
		    }
		    time 		+= minutes+':'+seconds;
		    return time;
		}
	};

	mp.MediaPlayer.prototype.Events = {
		Click: document.ontouchstart === undefined ? 'click' : 'touchstart'
	}

	mp.MediaPlayer.prototype.init = function()
	{
		// wrapper
		var wrapper = document.createElement("div");
		wrapper.className = "mp-mediaplayer mp-wrapper";
		this.utils.wrapAll(wrapper, this.media);
		// HTMLMediaElement wrapper
		var mediaelement = document.createElement("div");
		mediaelement.className = "mp-mediaelement";
		if(this.media instanceof HTMLVideoElement) {
			mediaelement.className += " mp-videoelement";
		}
		this.utils.wrapAll(mediaelement, this.media);
		// init source(s)
		var sources = this.media.getElementsByTagName('source');
		this.setSrc(sources);
		// init Captionator if TextTrack not available in brower
		if(window.captionator) {
			this.captioned = window.captionator.captionify(this.media, null, { controlHeight: 0 });
		}
		// bind HTMLMediaElement error event
		this.media.addEventListener("error", this.errorHandler, false);
		// check if player must use native player
		this.useNativeControls = !!(
			this.options.useAndroidUseNativeControls && navigator.userAgent.match(/android/i)
			 || 
			this.options.useiPadUseNativeControls && navigator.userAgent.match(/ipad/i)
			 || 
			this.options.useiPhoneUseNativeControls && navigator.userAgent.match(/iphone|ipod/i)
			 || 
			this.options.alwaysUseNativeControls
		);
		// init overlays
		if((this.media instanceof HTMLVideoElement) && !this.useNativeControls) {
			// init poster
			this.poster = this.createPoster(this.media.getAttribute('poster'));
			mediaelement.appendChild(this.poster);
			this.media.removeAttribute('poster');
			// overlay play
			this.overlayPlay = document.createElement('div');
			this.overlayPlay.className = "mp-overlay-play";
			var overlayPlayBtn = document.createElement('button');
			overlayPlayBtn.title = "Play";
			this.overlayPlay.appendChild(overlayPlayBtn);
			mediaelement.appendChild(this.overlayPlay);
		}
		// init controls if nedded
		if(!this.useNativeControls && this.media.getAttribute('controls')) {
			// remove controls attribute to replace default ui by our custom
			this.media.removeAttribute('controls');
			// creates UI
			this.controls = this.createControls();
			wrapper.appendChild(this.controls);
			// resize progressbar
			this.resizeProgressbar();
			// bind event on UI
			this.addEventListeners();
		}
		// init tracks
		this.initTracks();
		// init media
		this.media.load();
		// return HTMLMediaElement object
		return this.media;
	}

	mp.MediaPlayer.prototype.createPoster = function(src)
	{
		var poster = document.createElement('div');
		poster.className = 'mp-poster';
		var img = new Image;
		img.src = src;
		poster.appendChild(img);
		return poster;
	}

	mp.MediaPlayer.prototype.createControls = function()
	{
		// controls container
		var controls = document.createElement("div");
		controls.className = "mp-controls";

		// play/pause button
		var playBtn = document.createElement("button");
		playBtn.setAttribute("type", "button");
		playBtn.setAttribute("title", "Play/Pause");
		// play/pause container
		var play = document.createElement("div");
		play.className = "mp-button mp-play";
		play.appendChild(playBtn);
		// add to controls
		controls.appendChild(play);

		// progress container
		var progress = document.createElement("div");
		progress.className = "mp-progress";
		// progress background
		var progressTotal = document.createElement("span");
		progressTotal.className = "mp-progress-total";
		progress.appendChild(progressTotal);
		// progress buffer bar
		var progressLoaded = document.createElement("span");
		progressLoaded.className = "mp-progress-loaded";
		progressTotal.appendChild(progressLoaded);
		// progress played bar
		var progressCurrent = document.createElement("span");
		progressCurrent.className = "mp-progress-current";
		progressTotal.appendChild(progressCurrent);
		// add to controls
		controls.appendChild(progress);

		// time container
		var time = document.createElement("div");
		time.className = "mp-time";
		// current time
		var timeCurrent = document.createElement("span");
		timeCurrent.className = "mp-time-current";
		timeCurrent.innerHTML = "00:00";
		time.appendChild(timeCurrent);
		// time separator
		var timeSeparator = document.createElement("span");
		timeSeparator.innerHTML = "&nbsp;|&nbsp;";
		time.appendChild(timeSeparator);
		// duration
		var timeTotal = document.createElement("span");
		timeTotal.className = "mp-time-total";
		timeTotal.innerHTML = "00:00";
		time.appendChild(timeTotal);
		// add to controls
		controls.appendChild(time);

		// volume button
		var volumeBtn = document.createElement("button");
		volumeBtn.setAttribute("type", "button");
		volumeBtn.setAttribute("title", "Mute toggle");
		// volume container
		var volume = document.createElement("div");
		volume.className = "mp-button mp-volume";
		volume.appendChild(volumeBtn);
		// add to controls
		controls.appendChild(volume);

		var textTracks = this.captioned ? this.media.tracks : this.media.textTracks;
		if(textTracks && textTracks.length > 0) {
			// switch button
			var tracksBtn = document.createElement("button");
			tracksBtn.setAttribute("type", "button");
			tracksBtn.title = "Captions/Subtitles";
			// switch container
			var tracks = document.createElement("div");
			tracks.className = "mp-button mp-tracks";
			tracks.appendChild(tracksBtn);
			// switch options container
			var tracksList = document.createElement("ul");
			tracksList.className = "mp-flybox mp-flybox-list mp-tracks-list";
			// none options
			var noneOptionsAdded = [];
			// add each track to options
			for(var i = 0; i < textTracks.length; i++) {
				// add none option if doesn't already added
				if(noneOptionsAdded[textTracks[i].kind] == undefined) {
					var none = { kind:textTracks[i].kind, label:"None", language: "" };
					none.mode = this.captioned ? window.captionator.TextTrack.SHOWING : "showing"
					var noneItem = this._createTrackItem(none, -1);
					tracksList.appendChild(noneItem);
					noneOptionsAdded.push(textTracks[i].kind);
				}
				var tracksListItem = this._createTrackItem(textTracks[i], i);
				tracksList.appendChild(tracksListItem);
			}
			tracks.appendChild(tracksList);
			// add to controls
			controls.appendChild(tracks);
		}

		// add source switcher if needed (more than one source)
		if(this.options.displaySourceChooser && this.sources && this.sources.length > 1) {
			// switch button
			var sourcesBtn = document.createElement("button");
			sourcesBtn.setAttribute("type", "button");
			sourcesBtn.setAttribute("title", "Switch quality");
			// switch container
			var sources = document.createElement("div");
			sources.className = "mp-button mp-sources";
			sources.appendChild(sourcesBtn);
			// switch options container
			var sourcesList = document.createElement("ul");
			sourcesList.className = "mp-flybox mp-flybox-list mp-source-list";
			// add each source to options
			for(var i = 0; i < this.sources.length; i++) {
				var sourcesListItem = this._createSourceItem(this.sources[i], i);
				sourcesList.appendChild(sourcesListItem);
			}
			sources.appendChild(sourcesList);
			// add to controls
			controls.appendChild(sources);
		}

		// fullscreen button
		if(this.media instanceof HTMLVideoElement) {
			var fullscreenBtn = document.createElement("button");
			fullscreenBtn.setAttribute("type", "button");
			fullscreenBtn.setAttribute("title", "Fullsreen");
			// fullscreen container
			var fullscreen = document.createElement("div");
			fullscreen.className = "mp-button mp-fullscreen";
			fullscreen.appendChild(fullscreenBtn);
			// add to controls
			controls.appendChild(fullscreen);
		}

		return controls;
	}

	mp.MediaPlayer.prototype._createTrackItem = function(textTrack, i)
	{
		var tracksListItem = document.createElement("li");
		// radio input
		var tracksListItemRadio = document.createElement("input");
		tracksListItemRadio.setAttribute("type", "radio");
		tracksListItemRadio.setAttribute("name", (textTrack.kind || "unknow"));
		tracksListItemRadio.setAttribute("id", this.media.id+"track-"+i);
		tracksListItemRadio.setAttribute("value", i);
		// default value checked
		if(this.captioned) {
			if(textTrack.mode == window.captionator.TextTrack.SHOWING) tracksListItemRadio.checked = "checked";
		} else if(TextTrack.SHOWING) {
			if(textTrack.mode == TextTrack.SHOWING) tracksListItemRadio.checked = "checked";
		} else {
			if(textTrack.mode.toLowerCase() == "showing") tracksListItemRadio.checked = "checked";
		}
		tracksListItem.appendChild(tracksListItemRadio);
		// track label
		var tracksListItemLabel = document.createElement("label");
		tracksListItemLabel.setAttribute("for", this.media.id+"track-"+i);
		tracksListItemLabel.innerHTML = (textTrack.label || textTrack.language);
		tracksListItem.appendChild(tracksListItemLabel);
		// return item
		return tracksListItem;
	}

	mp.MediaPlayer.prototype._createSourceItem = function(source, i)
	{
		var sourcesListItem = document.createElement("li");
		// radio input
		var sourcesListItemRadio = document.createElement("input");
		sourcesListItemRadio.setAttribute("type", "radio");
		sourcesListItemRadio.setAttribute("name", "source");
		sourcesListItemRadio.setAttribute("id", this.media.id+"source-"+i);
		sourcesListItemRadio.setAttribute("value", i);
		// default value checked
		if(i == 0) sourcesListItemRadio.checked = "checked";
		sourcesListItem.appendChild(sourcesListItemRadio);
		// source label
		var sourcesListItemLabel = document.createElement("label");
		sourcesListItemLabel.setAttribute("for", this.media.id+"source-"+i);
		sourcesListItemLabel.innerHTML = source.title || source.type;
		sourcesListItem.appendChild(sourcesListItemLabel);
		// return item
		return sourcesListItem;
	}


	mp.MediaPlayer.prototype.resizeProgressbar = function()
	{
		// progressbar = controls width - all ui items width except progressbar width
		var occupedWidth = 0;
		var controlsElements = this.controls.childNodes;
		for(var i = 0; i < controlsElements.length; i++) {
			if(controlsElements[i].className != "mp-progress") {
				occupedWidth += controlsElements[i].offsetWidth;
			}
		}
		this.controls.querySelector('.mp-progress').style.width = this.controls.offsetWidth - occupedWidth + 'px';
	}

	mp.MediaPlayer.prototype.addEventListeners = function()
	{
		var self = this;
		
		this.media.addEventListener("durationchange", function(e){
			self.setDuration(e.target.duration)
		}, false);

		this.media.addEventListener("timeupdate", function(e){
			self.setCurrentTime(e.target.currentTime);
		}, false);

		this.media.addEventListener("ended", function(e){
			self.pause();
			self.setCurrentTime(0.1);
		}, false);

		this.media.addEventListener("progress", function(e){
			self.setBufferProgress(e.target.buffered)
		}, false);

		if(this.overlayPlay) {
			this.overlayPlay.addEventListener(this.Events.Click, function(e){
				self.togglePlay();
			}, false);
		}

		this.controls.querySelector(".mp-play button").addEventListener(this.Events.Click, function(e){
			self.togglePlay();
		}, false);

		this.controls.querySelector(".mp-progress").addEventListener(this.Events.Click, function(e){
			self.seek(e.layerX / self.controls.querySelector(".mp-progress-total").offsetWidth * self.media.duration);
		}, false);

		this.controls.querySelector(".mp-volume button").addEventListener(this.Events.Click, function(e){
			self.toggleVolume();
		}, false);

		var fullscreenBtn = this.controls.querySelector(".mp-fullscreen button");
		if(fullscreenBtn) {
			fullscreenBtn.addEventListener(this.Events.Click, function(e){
				self.toggleFullscreen();
			}, false);
		}

		// fullscreenchange event : update fullscreen button
		document.addEventListener("fullscreenchange", function(e){
			self.fullsSreenChanged();
		}, false);
		document.addEventListener("mozfullscreenchange", function(e){
			self.fullsSreenChanged();
		}, false);
		document.addEventListener("webkitfullscreenchange", function(e){
			self.fullsSreenChanged();
		}, false);

		// handle source switching
		var sourcesList = this.controls.querySelector(".mp-source-list")
		if(sourcesList) {
			var sourcesRadios = sourcesList.getElementsByTagName("input");
			for(var i = 0; i < sourcesRadios.length; i++ ) {
				// add event listener on each source option
				sourcesRadios[i].addEventListener("change", function(e){
					// set new source on source option selected
					self.setSrc(self.sources[e.target.value]);
				}, false);
			}
		}

		// handle track selection
		var tracksList = this.controls.querySelector(".mp-tracks-list")
		if(tracksList) {
			var tracksRadios = tracksList.getElementsByTagName("input");
			for(var i = 0; i < tracksRadios.length; i++ ) {
				// add event listener on each track option
				tracksRadios[i].addEventListener("change", function(e){
					// active track on track option selected
					var textTracks = self.captioned ? self.media.tracks : self.media.textTracks;
					var textTrack = textTracks[this.value];
					if(textTrack) {
						// disable all other tracks of same kind
						for(var i = 0; i < textTracks.length; i++) {
							if(textTracks[i].kind == textTrack.kind) {
								textTracks[i].mode = self.captioned ? window.captionator.TextTrack.OFF : "disabled";
							}
						}
						// switch selected track mode
						if(self.captioned) {
							textTrack.mode = (textTrack.mode == window.captionator.TextTrack.OFF) ? window.captionator.TextTrack.SHOWING : window.captionator.TextTrack.OFF;
						} else if(TextTrack.SHOWING) {
							textTrack.mode = (textTrack.mode == TextTrack.DISABLED) ? TextTrack.SHOWING : TextTrack.DISABLED;
						} else {
							textTrack.mode = (textTrack.mode == "disabled") ? "showing" : "disabled";
						}
					}
				}, false);
			}
		}

		// hide Quiktime logo on begin in iOS
		this.media.style["-webkit-transform"] = "translateX(-"+window.outerWidth+"px)";
		this.media.addEventListener("loadedmetadata", function(e){
			self.media.style["-webkit-transform"] = "translateX(0px)";
		}, false);
	}

	mp.MediaPlayer.prototype.setSrc = function(source)
	{
		// source param is an array of HTMLSourceElement : iterate source tags and add them to sources list if it can be play and if match media
		if( (source instanceof NodeList) || source instanceof HTMLCollection || (typeof(source) == "object" && source.constructor == Array) ) {
			this.sources = [];
			for(var i = 0; i < source.length; i++) {
				if( this.media.canPlayType(source[i].type) ) {
					if(source[i].media && window.matchMedia) {
						if(window.matchMedia(source[i].media).matches == true) {
							this.sources.push(source[i]);
						}
					} else {
						this.sources.push(source[i]);
					}
				}
			}
			// set first source as default source
			if(!this.media.src && this.sources.length > 0) {
				this.setSrc(this.sources[0]);
			}
		}
		// source param is a string or an instance of HTMLSourceElement
		else {
			var paused = this.media.paused;
			var currentTime = this.media.currentTime;
			// update src attribute
			if( 
				(typeof(HTMLSourceElement) != 'undefined' && source instanceof HTMLSourceElement)
				 || 
				(typeof(HTMLSourceElement) == 'undefined' && typeof(source) == 'object' && source.hasOwnProperty('src')) // Safari bug : HTMLSourceElement doesn't exists on domwindow
			) {
				this.media.src = source.src;
			}
			else if(typeof(source) == 'string') {
				this.media.src = source;
			}
			else {
				return false;
			}
			// show loader
			this.showLoader();
	        // load source
			this.media.load();
			// on source metadata loaded : update currentTime
			this.media.addEventListener('loadedmetadata', function(event){
	            this.currentTime = currentTime;
	        }, false);
	        // on canplay : play media if it was played before
	        this.media.addEventListener('canplay', function(event){
	        	if(!paused) {
	        		this.play();
	        	}
	        }, false);
		}
	}

	mp.MediaPlayer.prototype.showLoader = function(){
		var self = this;
		if(this.controls) {
			this.controls.querySelector(".mp-progress-loaded").style.width = '0px';
			this.utils.addClass(this.controls.querySelector(".mp-progress-total"), 'mp-loading');
			this.media.addEventListener('canplay', function(event){
				self.utils.removeClass(self.controls.querySelector(".mp-progress-total"), 'mp-loading');
			}, false);
		}
	}

	mp.MediaPlayer.prototype.togglePlay = function()
	{	
		if(this.media.paused) {
			this.play();
		} else {
			this.pause();
		}
	}

	mp.MediaPlayer.prototype.play = function()
	{
		var playBtn = this.controls.querySelector(".mp-play");
		this.utils.addClass(playBtn, "mp-pause");
		if(this.poster) this.poster.style.display = 'none';
		if(this.overlayPlay) this.overlayPlay.style.display = 'none';
		this.media.play();
	}

	mp.MediaPlayer.prototype.pause = function()
	{
		var playBtn = this.controls.querySelector(".mp-play");
		this.utils.removeClass(playBtn, "mp-pause");
		this.media.pause();
	}

	mp.MediaPlayer.prototype.setDuration = function(duration)
	{
		this.controls.querySelector(".mp-time-total").innerHTML = this.utils.timeFormat(duration)
	}

	mp.MediaPlayer.prototype.setCurrentTime = function(currentTime)
	{
		this.controls.querySelector(".mp-time-current").innerHTML = this.utils.timeFormat(currentTime);
		this.controls.querySelector(".mp-progress-current").style.width = (currentTime / this.media.duration * this.controls.querySelector(".mp-progress-total").offsetWidth) + 'px';
	}

	mp.MediaPlayer.prototype.setBufferProgress = function(buffered)
	{
		if(buffered.length > 0) {
			var bufferedTime = buffered.end(buffered.length-1);
			this.controls.querySelector(".mp-progress-loaded").style.width = (bufferedTime / this.media.duration * this.controls.querySelector(".mp-progress-total").offsetWidth) + 'px';
		}
	}

	mp.MediaPlayer.prototype.seek = function(time)
	{
		this.media.currentTime = (parseFloat(time)).toFixed(1);
	}

	mp.MediaPlayer.prototype.toggleVolume = function()
	{
		if(this.media.volume == 0) {
			this.media.volume = 1;
	    	this.utils.removeClass(this.controls.querySelector(".mp-volume"), "mp-mute");
	    } else {
	    	this.media.volume = 0;
	    	this.utils.addClass(this.controls.querySelector(".mp-volume"), "mp-mute");
	    }
	}

	mp.MediaPlayer.prototype.setVolume = function(volume) {
		if(isFinite(volume)) {
			this.media.volume = volume;
		}
	}

	mp.MediaPlayer.prototype.toggleFullscreen = function()
	{
		var fullscreenControl = this.controls.querySelector(".mp-fullscreen");

		if(document.fullscreen || document.mozFullScreen || document.webkitIsFullScreen || (fullscreenControl && false == this.utils.hasClass(fullscreenControl, "mp-unfullscreen")) ) {
			if(document.exitFullscreen) {
				document.exitFullscreen();
			}
			else if(document.mozCancelFullScreen) {
			    document.mozCancelFullScreen();
			}
			else if(document.webkitCancelFullScreen) {
			    document.webkitCancelFullScreen();
			}
		}
		else {
			if(this.media.requestFullscreen) {
			    this.media.requestFullscreen();
			}
			else if(this.media.mozRequestFullScreen) {
			    this.media.mozRequestFullScreen();
			}
			else if(this.media.webkitRequestFullScreen) {
			    this.media.webkitRequestFullScreen();
			}
		}
	}

	mp.MediaPlayer.prototype.fullsSreenChanged = function()
	{
		var fullscreenControl = this.controls.querySelector(".mp-fullscreen");

		if(!(document.fullscreen || document.mozFullScreen || document.webkitIsFullScreen)) {
	    	if(fullscreenControl) this.utils.removeClass(fullscreenControl, "mp-unfullscreen");
	    } else {
	    	if(fullscreenControl) this.utils.addClass(fullscreenControl, "mp-unfullscreen");
	    }
	}

	mp.MediaPlayer.prototype.initTracks = function()
	{
	}

	mp.MediaPlayer.prototype.errorHandler = function(e)
	{
		switch(e.target.networkState)
		{
		    case e.target.NETWORK_EMPTY:
		    	throw new Error('The element is not initialized.');
		    break;
		    case e.target.NETWORK_IDLE:
		    	throw new Error('The network connection is idle.');
		    break;
		    case e.target.NETWORK_LOADING:
		    	throw new Error('The media resource is loading.');
		    break;
		    case e.target.NETWORK_NO_SOURCE:
		    	throw new Error('No media resource was found.');
		    break;
		    default:
		    	throw new Error('Unknown network state.');
		    break;
		}

		if(e.target.error)
		{
		    switch(e.target.error.code)
		    {
				case e.target.error.MEDIA_ERR_ABORTED:
					throw new Error('You aborted the video playback.');
				break;
				case e.target.error.MEDIA_ERR_NETWORK:
					throw new Error('A network error caused the video download to fail part-way.');
				break;
				case e.target.error.MEDIA_ERR_DECODE:
					throw new Error('The video playback was aborted due to a corruption problem or because the video used features your browser did not support.');
				break;
				case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
					throw new Error('The video could not be loaded, either because the server or network failed or because the format is not supported.');
				break;
				default:
					throw new Error('An unknown error occurred.');
				break;
		    }
		}
	}

	window.MediaPlayer = mp.MediaPlayer;
})();