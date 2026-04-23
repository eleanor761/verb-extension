// Generate participant ID at the start
let participant_id = `participant${Math.floor(Math.random() * 999) + 1}`;
const completion_code = generateRandomString(3) + 'zvz' + generateRandomString(3);

// Function to generate a random string of specified length
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Initialize jsPsych
const jsPsych = new jsPsychModule.JsPsych({
  show_progress_bar: false
});

// Create a random filename for data saving
const filename = jsPsych.randomization.randomID(10) + ".csv";
let timeline = [];

// Define the consent form 
const consent = {
    type: jsPsychHtmlButtonResponse,  
    stimulus: `
        <div style="width: 800px; margin: 0 auto; text-align: left">
            <h3>Consent to Participate in Research</h3>
            
            <p>The task you are about to do is sponsored by University of Wisconsin-Madison. It is part of a protocol titled "What are we learning from language?"</p>

            <p>The task you are asked to do involves making simple responses to words and sentences. For example, you may be asked to rate a pair of words on their similarity or to indicate how true you think a given sentence is. More detailed instructions for this specific task will be provided on the next screen.</p>

            <p>This task has no direct benefits. We do not anticipate any psychosocial risks. There is a risk of a confidentiality breach. Participants may become fatigued or frustrated due to the length of the study.</p>

            <p>The responses you submit as part of this task will be stored on a sercure server and accessible only to researchers who have been approved by UW-Madison. Processed data with all identifiers removed could be used for future research studies or distributed to another investigator for future research studies without additional informed consent from the subject or the legally authorized representative.</p>

            <p>You are free to decline to participate, to end participation at any time for any reason, or to refuse to answer any individual question without penalty or loss of earned compensation. We will not retain data from partial responses. If you would like to withdraw your data after participating, you may send an email lupyan@wisc.edu or complete this form which will allow you to make a request anonymously.</p>

            <p>If you have any questions or concerns about this task please contact the principal investigator: Prof. Gary Lupyan at lupyan@wisc.edu.</p>

            <p>If you are not satisfied with response of the research team, have more questions, or want to talk with someone about your rights as a research participant, you should contact University of Wisconsin's Education Research and Social & Behavioral Science IRB Office at 608-263-2320.</p>

            <p><strong>By clicking the box below, I consent to participate in this task and affirm that I am at least 18 years old.</strong></p>
        </div>
    `,
    choices: ['I Agree', 'I Do Not Agree'],
    data: {
        trial_type: 'consent'
    },
    on_finish: function(data) {
        if(data.response == 1) {
            jsPsych.endExperiment('Thank you for your time. The experiment has been ended.');
        }
    }
};

// Instructions block
const instructions = {
    type: jsPsychHtmlKeyboardResponse,  
    stimulus: `
        <p>In this experiment, you will see a video and will be asked to describe what is happening</p>
        <p>Press any key to begin.</p>
    `,
};

// Function to get video path from filename
function getVideoPath(stimName) {
    return `stimuli/norming/${stimName}`;
}

// Function to create trials from the CSV data
function createTrials(trialsData) {
    const experimentTrials = [];
    
    trialsData.forEach(trial => {
        // Try different possible field names for the filename
        const videoFile = trial.filename;
        
        if (!videoFile) {
            console.warn('Trial missing filename field:', trial);
            return;
        }
        
        // Create video text response trial using our custom plugin
        const videoResponseTrial = {
            type: jsPsychVideoTextResponse,
            stimulus: [getVideoPath(videoFile)],
            width: 640,
            height: 480,
            controls: true,
            autoplay: true,
            loop: true,  // Keep looping for the experiment
            prompt: null, // No title
            question_text: 'Please describe what you see in the video:',
            placeholder: 'Type your response here...',
            rows: 5,
            columns: 60,
            required: true,
            show_response_during_video: true,
            button_label: 'Submit',
            // Store all the original trial data
            data: {
                subCode: participant_id,
                trial_num: trial.trial_num,
                word: trial.word,
                dimension: trial.dimension,
                filename: videoFile,
                action: trial.action,
                trial_type: 'video-text-response'
            },
            on_finish: function(data) {
                data.rt = Math.round(data.rt);
                data.description = data.response;
                
                // Log the trial data after each trial
                console.log(`Trial ${data.trial_num} completed. Response recorded:`, {
                    trial_num: data.trial_num,
                    word: data.word,
                    rt: data.rt,
                    description: data.description
                });
            }
        };

        experimentTrials.push(videoResponseTrial);
    });
    
    return experimentTrials;
}

// Preload media files
const preload = {
    type: jsPsychPreload, 
    auto_preload: true
};


// Function to filter and format data for saving
function getFilteredData() {
  //let's log what data we're working with
  //console.log("All data:", jsPsych.data.get().values());
  
  // Get all data and filter to only video-text-response trials
  const allTrials = jsPsych.data.get().values();
  const trials = allTrials.filter(trial => trial.trial_type === 'video-text-response');
  
  //console.log("Filtered trials:", trials);
  
  // If there's no data, return empty string
  if (trials.length === 0) {
      console.error("No video-text-response trials found!");
      return '';
  }
  
  try {
      // Define the columns we want to keep
      const columns = ['subCode', 'trial_num', 'word', 'dimension', 'filename', 'action', 'rt', 'description'];
      
      // Create header row
      const header = columns.join(',');
      
      // Create data rows with only the columns we want
      const rows = trials.map(trial => {
          return columns.map(column => {
              const value = trial[column];
              console.log(`Column ${column} value:`, value, typeof value);
              
              if (value === null || value === undefined) {
                  return '';
              } else if (typeof value === 'string') {
                  // Properly escape string values for CSV
                  return `"${value.replace(/"/g, '""')}"`;
              } else {
                  return value;
              }
          }).join(',');
      });
      
      // Combine header and rows
      const finalCSV = header + '\n' + rows.join('\n');
      console.log("Final CSV data:", finalCSV);
      
      return finalCSV;
  } catch (error) {
      console.error("Error in getFilteredData:", error);
      // Return a simple valid CSV as fallback
      const fallbackCSV = "subCode,error\n\"error\",\"" + error.message + "\"";
      return fallbackCSV;
  }
}
// Configure data saving
const save_data = {
    type: jsPsychPipe,
    action: "save",
    experiment_id: "DvojIUx5ETI3",
    filename: `${participant_id}.csv`,
    data_string: getFilteredData,
    success_callback: function() {
        console.log('Data saved successfully to DataPipe!');
        console.log('Participant ID:', participant_id);
        console.log('Filename:', `${participant_id}.csv`);
        jsPsych.data.addProperties({
            completed: true
        });
    },
    error_callback: function(error) {
        console.error('Error saving to DataPipe:', error);
        console.error('Error details:', JSON.stringify(error));
        
        // Try to get more information about the error
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        // Display error to user
        jsPsych.endExperiment(`<p>There was an error saving your data. Please contact the researcher with this information: ${error}</p><p>Error code: ${error.status || 'unknown'}</p>`);
    }
};

const completion_code_trial = {
  type: jsPsychHtmlButtonResponse,
  stimulus: function() {
      return `
          <p>You have completed the main experiment!</p>
          <p>You can close the page now.</p>
      `;
  },
  choices: ['Finish'],
  data: {
      trial_type: 'completion'
  },
  on_finish: function() {
      window.location.href = `https://uwmadison.sona-systems.com/default.aspx?logout=Y`;
  }
};

// Main function to run the experiment
async function runExperiment() {
    try {
        console.log('Starting experiment...');
        console.log('Participant ID:', participant_id);
        console.log('Completion code:', completion_code);
        
        // Load trials
        const trialsData = await loadTrials();
        console.log('Loaded trials:', trialsData.length);
        
        // Log sample trial data
        if (trialsData.length > 0) {
            console.log('Sample trial data:', trialsData[0]);
        }
        
        // Create full timeline with loaded trials
        const experimentTrials = createTrials(trialsData);
        console.log('Created experiment trials:', experimentTrials.length);
            
        timeline = [
            //consent,
            //instructions,
            preload,
            ...experimentTrials,
            save_data,
            completion_code_trial
        ];

        console.log('Timeline initialized with', timeline.length, 'items');
        console.log('Starting jsPsych...');

        // Run the experiment
        jsPsych.run(timeline);
    } catch (error) {
        console.error('Error running experiment:', error);
        console.error('Error stack:', error.stack);
        // Display error message on the page
        document.getElementById('jspsych-target').innerHTML = `
            <div style="max-width: 800px; margin: 50px auto; padding: 20px; background: #f8f8f8; border-radius: 5px;">
                <h2>Error Starting Experiment</h2>
                <p>There was a problem starting the experiment. Please try refreshing the page.</p>
                <p>If the problem persists, please contact the researcher.</p>
                <p>Technical details: ${error.message}</p>
                <pre style="background: #f1f1f1; padding: 10px; overflow: auto;">${error.stack}</pre>
            </div>
        `;
    }
}

// Function to load trials from CSV
async function loadTrials() {
    try {
        const csvFilename = 'demo_trials.csv'; // Path to your trials file
        
        const response = await fetch(csvFilename);
        const csvText = await response.text();
        
        const results = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
        });

        console.log('Sample trial structure:', results.data[0]);

        // Shuffle the trials
        let shuffledData = jsPsych.randomization.shuffle([...results.data]);
        
        // Update trial numbers to match new order
        shuffledData = shuffledData.map((trial, index) => ({
            ...trial,
            trial_num: index
        }));
        
        return shuffledData;
    } catch (error) {
        console.error('Error loading trials:', error);
        return [];
    }
}

// Wait for the page to load before starting the experiment
document.addEventListener('DOMContentLoaded', runExperiment);