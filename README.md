MediaPlayer
===========

**Creates a JavaScript object that mimics HTML5 MediaElement API**

What does MediaPlayer do?
-------------------------

* mimics the HTML5 MediaElement (`video>` or `<audio>` element)
* support `<source>` element
* support `media` attribute on `<source>` element
* support `<track>` element (require Captionator polifill non native brower support of the WHATWG TimedTextTrack Specification : https://github.com/cgiffard/Captionator)
* Works in Firefox 3.5+, IE9, Safari 4+, Chrome, Opera 11... and any browser which supports HTML5 Video
* Only native code, no javascript library dependencies like jQuery or Mootools

Using MediaPlayer
---------------------------------

### 1. Add Script and Stylesheet ###

```html
<link rel="stylesheet" href="mediaplayer.css">
<!-- Captionator is necessary for non native brower support of the WHATWG TimedTextTrack Specification -->
<script type="text/javascript" src="../src/captionator.js"></script>
<script type="text/javascript" src="../src/mediaplayer.js"></script>
```

### 2. HTML5 MediaElement markup ###

**Option A : Single source file**

```html
<video id="player" controls="controls" preload="none" poster="poster.jpg" src="video.mp4" width="640" height="360">
```

**Option B : Multiple codecs sources**

```html
<video id="player" controls="controls" preload="none" poster="poster.jpg" width="640" height="360">
    <!-- Video sources -->
    <source src="video.mp4" type="video/mp4" title="H264">
    <source src="video.webm" type="video/webm" title="WebM">
    <source src="video.ogv" type="video/ogg" title="OGG">
    <!-- Subtiles -->
    <track kind="subtitles" src="subtitles.srt" srclang="fr" lang="fr" label="Français"></track>
</video>
```

### 3. Sartup script ###

Include following code just before the `<\body>` close tag

```html
<script type="text/javascript">
var mediaplayer = new MediaPlayer(document.getElementById("player"));
</script>
```

Options
---------------------------------

MediaPlayer take an additional parameter to define an object of lists options :

```html
<script type="text/javascript">
var mediaplayer = new MediaPlayer(document.getElementById("player"), {
	useiPhoneUseNativeControls: true,
	useAndroidUseNativeControls: true
});
</script>
```

The following lists options which you can pass to MediaPlayer:

* `useiPadUseNativeControls` (Boolean) - determine whether to use custom MediaPlayer controls on iPad device
* `useiPhoneUseNativeControls` (Boolean) - determine whether to use custom MediaPlayer controls on iPhone device
* `useAndroidUseNativeControls` (Boolean) - determine whether to use custom MediaPlayer controls on Android device
* `alwaysUseNativeControls` (Boolean) - determine whether to always use browser native controls on all device