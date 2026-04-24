/**
 * jspsych-video-text-response
 * A jsPsych plugin for displaying a video stimulus and collecting a text response
 */
var jsPsychVideoButtonResponse = (function (jspsych) {
  'use strict';

  const info = {
    name: 'video-button-response',
    parameters: {
      /** 
       * The video file to play. Video can be provided in multiple file formats.
       */
      stimulus: {
        type: jspsych.ParameterType.VIDEO,
        pretty_name: 'Video',
        default: undefined,
        description: 'Video files to be played.'
      },
      /** Width of the video in pixels */
      width: {
        type: jspsych.ParameterType.INT,
        pretty_name: 'Width',
        default: 640,
        description: 'The width of the video in pixels.'
      },
      /** Height of the video in pixels */
      height: {
        type: jspsych.ParameterType.INT,
        pretty_name: 'Height',
        default: 360,
        description: 'The height of the video in pixels.'
      },
      /** Whether to autoplay the video */
      autoplay: {
        type: jspsych.ParameterType.BOOL,
        pretty_name: 'Autoplay',
        default: true,
        description: 'If true, the video will autoplay.'
      },
      /** Whether to loop the video */
      loop: {
        type: jspsych.ParameterType.BOOL,
        pretty_name: 'Loop',
        default: false,
        description: 'If true, the video will loop.'
      },
      /** Whether to show video controls */
      controls: {
        type: jspsych.ParameterType.BOOL,
        pretty_name: 'Controls',
        default: false,
        description: 'If true, video controls will be available.'
      },
      /** Prompt to display above the video */
      prompt: {
        type: jspsych.ParameterType.HTML_STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed above the video.'
      },
      
      /**
     * Labels for the buttons. Each different string in the array will generate a different button.
     */
    choices: {
      type: jspsych.ParameterType.STRING,
      default: undefined,
      array: true,
    },
    /**
     *  A function that generates the HTML for each button in the `choices` array. The function gets the string and index
     * of the item in the `choices` array and should return valid HTML. If you want to use different markup for each
     * button, you can do that by using a conditional on either parameter. The default parameter returns a button element
     * with the text label of the choice.
     */
    button_html: {
      type: jspsych.ParameterType.FUNCTION,
      default: function (choice, choice_index) {
        return `<button class="jspsych-btn">${choice}</button>`;
      },
    },
        /** Setting to `'grid'` will make the container element have the CSS property `display: grid` and enable the
     * use of `grid_rows` and `grid_columns`. Setting to `'flex'` will make the container element have the CSS
     * property `display: flex`. You can customize how the buttons are laid out by adding inline CSS in the
     * `button_html` parameter.
     */
    button_layout: {
      type: jspsych.ParameterType.STRING,
      default: "grid",
    },
    /**
     * The number of rows in the button grid. Only applicable when `button_layout` is set to `'grid'`. If null,
     * the number of rows will be determined automatically based on the number of buttons and the number of columns.
     */
    grid_rows: {
      type: jspsych.ParameterType.INT,
      default: 1,
    },
    /** The number of grid columns when `button_layout` is "grid".
     * Setting to `null` (default value) will infer the number of columns
     * based on the number of rows and buttons. */
    grid_columns: {
      type: jspsych.ParameterType.INT,
      default: null,
    },
      
      /** Label for the left button */
      button_left: {
        type: jspsych.ParameterType.STRING,
        pretty_name: 'left button',
        default: 'left',
        description: 'Label of the left button'
      },
      /** Label for the right button */
      button_right: {
        type: jspsych.ParameterType.STRING,
        pretty_name: 'right button',
        default: 'right',
        description: 'Label of the right button'
      },
    
      /** Whether to require a response */
      required: {
        type: jspsych.ParameterType.BOOL,
        pretty_name: 'Required',
        default: false,
        description: 'Whether or not a response is required'
      },
      /** the time counted after the video has ended, for recording rt */
      time_after_video: {
        type: jspsych.ParameterType.INT,
        pretty_name: 'Time After Video',
        default: 0,
        description: 'Time after the video has ended, for recording rt',
      }
    }
  };

  /**
   * **video-text-response**
   * 
   * A plugin for displaying a video stimulus and collecting a text response
   */
  class VideoButtonResponsePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      console.log('Starting video-text-response trial');
      
      // Display the video stimulus
      let html = '<div id="jspsych-video-text-response-wrapper" style="margin: 0 auto;">';
      
      // Skip the Video X title prompt
      if (trial.prompt !== null && !trial.prompt.includes('Video')) {
        html += `<div id="jspsych-video-text-response-prompt">${trial.prompt}</div>`;
      }

      // Display the video
      html += '<div id="jspsych-video-text-response-stimulus">';
      html += '<video muted id="jspsych-video-text-response-video" width="' + trial.width + '" height="' + trial.height + '"';
      
      if(trial.autoplay){
        html += " autoplay";
      }
      if(trial.loop){
        html += " loop";
      }
      //if(trial.controls){
        //html += " controls muted";
      //}
      html += ">";
      
      var video_preload_blob = this.jsPsych.pluginAPI.getVideoBuffer(trial.stimulus[0]);
      if (!video_preload_blob) {
        for (var i = 0; i < trial.stimulus.length; i++) {
          var file_name = trial.stimulus[i];
          if (file_name.indexOf('?') > -1) {
            file_name = file_name.substring(0, file_name.indexOf('?'));
          }
          var type = file_name.substr(file_name.lastIndexOf('.') + 1);
          type = type.toLowerCase();
          if (type == 'mov') {
            console.warn('Warning: video-text-response plugin does not reliably support .mov files.');
            type = 'mp4';
          } else if (type == 'mpeg') {
            type = 'mp4';
          }
          html += '<source src="' + file_name + '" type="video/' + type + '">';
        }
      }
      html += "</video>";
      html += "</div>";
      
      // Add left and right buttons using choices array
      html += '<button id="jspsych-video-button-response-left" class="jspsych-btn" disabled>' + 
        (trial.choices && trial.choices[0] ? trial.choices[0] : 'left') + '</button>';

      html += '<button id="jspsych-video-button-response-right" class="jspsych-btn" disabled>' + 
        (trial.choices && trial.choices[1] ? trial.choices[1] : 'right') + '</button>';
      
      
      html += '</div>';
      html += '</div>';
      
      display_element.innerHTML = html;
      
      // Get video element after adding to DOM
      const video_element = display_element.querySelector('#jspsych-video-text-response-video');
      const textArea = display_element.querySelector('#jspsych-video-text-response-text');
      const leftButton = display_element.querySelector('#jspsych-video-button-response-left');
      const rightButton = display_element.querySelector('#jspsych-video-button-response-right');
      
      console.log('DOM elements setup complete');
      
      // Set up video preload
      if (video_preload_blob) {
        video_element.src = video_preload_blob;
      }
      
      // Variables to track state
      let videoCompleted = false;
      let videoDuration = 0;
      let videoPlayedOnce = false;
      let self = this; // Store this reference for callbacks
      
      
      // Get video duration when metadata is loaded
      video_element.addEventListener('loadedmetadata', function() {
        videoDuration = video_element.duration;
        console.log('Video duration:', videoDuration);
      });
      
      // Track video progress to detect first complete play
      video_element.addEventListener('timeupdate', function() {
        // If we're near the end of the video and haven't marked it as played once
        if (!videoPlayedOnce && video_element.currentTime > 0 && 
            videoDuration > 0 && videoDuration - video_element.currentTime < 0.5) {
          console.log('Video has played through once');
          videoPlayedOnce = true;

          if (start_time === null) {
            start_time = performance.now();
            console.log('RT timing started at:', start_time);
          }

          enableButtons();
        }
      });
      
      // Also handle ended event (for non-looping videos)
      video_element.addEventListener('ended', function() {
        console.log('Video ended event fired');
        videoPlayedOnce = true;

        if (start_time === null) {
          start_time = performance.now();
          console.log('RT timing started at:', start_time);
        }

        enableButtons();
      });

      // Add this function inside the trial() method, before its usage:
      function enableButtons() {
        leftButton.disabled = false;
        rightButton.disabled = false;
      }
      
      // Handle button clicks
      leftButton.addEventListener('click', function() {
        end_trial(0);
      });
      rightButton.addEventListener('click', function() {
        end_trial(1);
      });

      // Function to end trial
      function end_trial(button) {
        console.log('End trial called');

        let reaction_time = null;
        if (start_time !== null) {
          reaction_time = performance.now() - start_time;
        }
        
        const trial_data = {
          rt: performance.now() - start_time,
          stimulus: trial.stimulus,
          response: button, // Record which button was pressed
          trial_type: 'video-button-response'
        };

        display_element.innerHTML = '';
        self.jsPsych.finishTrial(trial_data);
      }
      
      // Start timing
      var start_time = performance.now();
      console.log('Trial started at:', start_time);
    }
  }

  VideoButtonResponsePlugin.info = info;

  return VideoButtonResponsePlugin;
})(jsPsychModule);

// This makes the plugin accessible to the experiment in jsPsych 7.x
if (typeof jsPsychModule !== 'undefined') {
  jsPsychModule.VideoButtonResponsePlugin = jsPsychVideoButtonResponse;
}